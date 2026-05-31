"""
LaTeX Toolkit — References → BibTeX (Phase H)
==============================================

Turns a block of pasted references (APA, numbered/Vancouver, or freeform) into a
``.bib`` file plus a ready-to-paste ``\\bibliography`` snippet.

Pipeline:
    1. Reuse ``CitationEngineAgent._parse_single_reference`` (deterministic, no LLM)
       to structure each line into a ParsedReference.
    2. Optionally enrich each entry from the CrossRef REST API (fills DOI, volume,
       pages, container title) — network, best-effort, never fatal.
    3. Serialize to BibTeX with bibtexparser (falls back to a hand serializer).
"""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

_CROSSREF_URL = "https://api.crossref.org/works"


# ──────────────────────────────────────────────────────────────
#  Parsing
# ──────────────────────────────────────────────────────────────

def _split_reference_lines(raw: str) -> list[str]:
    """Split a pasted reference block into individual entries. Handles both
    one-per-line and blank-line-separated blocks, and merges obvious
    continuation lines (those that don't start a new numbered/APA entry)."""
    raw = (raw or "").replace("\r\n", "\n").strip()
    if not raw:
        return []

    # Prefer blank-line separation if present.
    blocks = [b.strip() for b in re.split(r"\n\s*\n", raw) if b.strip()]
    if len(blocks) > 1:
        return [re.sub(r"\s*\n\s*", " ", b) for b in blocks]

    # Otherwise treat each non-empty line as a candidate, merging continuations.
    num_prefix = re.compile(r"^\s*\[?\d{1,3}[\.\)\]]\s")
    apa_start = re.compile(r"^[A-Z][A-Za-zà-ÿ'\-]+,")
    entries: list[str] = []
    for line in raw.split("\n"):
        s = line.strip()
        if not s:
            continue
        is_new = (not entries) or num_prefix.match(s) or apa_start.match(s)
        if is_new:
            entries.append(s)
        else:
            entries[-1] = entries[-1] + " " + s
    return entries


def parse_references(raw: str):
    """Parse a reference block into a list of (raw_text, ParsedReference)."""
    from ..deepscan.agents.citation_engine import CitationEngineAgent

    engine = CitationEngineAgent()
    out = []
    for text in _split_reference_lines(raw):
        # Strip a leading number/bracket so the APA/book patterns match.
        cleaned = re.sub(r"^\s*\[?\d{1,3}[\.\)\]]\s*", "", text)
        try:
            ref = engine._parse_single_reference(cleaned)
        except Exception as exc:  # noqa: BLE001 — parser must never crash the tool
            logger.warning("reference parse failed: %s", exc)
            ref = None
        out.append((text, ref))
    return out


# ──────────────────────────────────────────────────────────────
#  CrossRef enrichment
# ──────────────────────────────────────────────────────────────

def enrich_with_crossref(ref, raw_text: str, *, timeout: float = 8.0) -> bool:
    """Fill missing fields on a ParsedReference from CrossRef. Returns True if
    anything was added. Best-effort: any network/parse error is swallowed."""
    if ref is None:
        return False
    try:
        import httpx

        query = raw_text
        if ref and getattr(ref, "title", None):
            query = ref.title
        params = {"query.bibliographic": query, "rows": 1}
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(
                _CROSSREF_URL,
                params=params,
                headers={"User-Agent": "HackaMineD-LaTeXToolkit/1.0 (mailto:support@hackamined.app)"},
            )
        if resp.status_code != 200:
            return False
        items = resp.json().get("message", {}).get("items", [])
        if not items:
            return False
        top = items[0]

        changed = False
        if not getattr(ref, "doi", None) and top.get("DOI"):
            ref.doi = top["DOI"]
            changed = True
        if not getattr(ref, "volume", None) and top.get("volume"):
            ref.volume = str(top["volume"])
            changed = True
        if not getattr(ref, "issue", None) and top.get("issue"):
            ref.issue = str(top["issue"])
            changed = True
        if not getattr(ref, "pages", None) and top.get("page"):
            ref.pages = str(top["page"])
            changed = True
        if not getattr(ref, "container_title", None) and top.get("container-title"):
            ct = top["container-title"]
            ref.container_title = ct[0] if isinstance(ct, list) and ct else str(ct)
            changed = True
        if not getattr(ref, "year", None):
            parts = (top.get("issued") or {}).get("date-parts") or [[None]]
            if parts and parts[0] and parts[0][0]:
                ref.year = str(parts[0][0])
                changed = True
        return changed
    except Exception as exc:  # noqa: BLE001
        logger.info("CrossRef enrichment skipped: %s", exc)
        return False


# ──────────────────────────────────────────────────────────────
#  BibTeX serialization
# ──────────────────────────────────────────────────────────────

def _cite_key(ref, index: int) -> str:
    fam = "ref"
    if ref and getattr(ref, "authors", None):
        fam = re.sub(r"[^A-Za-z]", "", ref.authors[0].family or "ref") or "ref"
    year = (getattr(ref, "year", None) or str(index + 1)) if ref else str(index + 1)
    return f"{fam.lower()}{year}"


def _entry_fields(ref) -> dict[str, str]:
    fields: dict[str, str] = {}
    if not ref:
        return fields
    if getattr(ref, "authors", None):
        fields["author"] = " and ".join(
            f"{a.family}, {a.given}".strip().rstrip(",") if a.given else a.family
            for a in ref.authors
        )
    for attr, key in (
        ("title", "title"),
        ("container_title", "journal"),
        ("year", "year"),
        ("volume", "volume"),
        ("issue", "number"),
        ("pages", "pages"),
        ("doi", "doi"),
        ("publisher", "publisher"),
        ("url", "url"),
    ):
        val = getattr(ref, attr, None)
        if val:
            fields[key] = str(val)
    return fields


def to_bibtex(parsed: list, raw_fallback: list[str] | None = None) -> str:
    """Serialize [(raw, ParsedReference)] to a BibTeX string. Uses bibtexparser
    when available; otherwise a small hand serializer (identical output shape)."""
    entries = []
    used_keys: set[str] = set()
    for i, (raw, ref) in enumerate(parsed):
        key = _cite_key(ref, i)
        # de-dupe keys
        base, n = key, 2
        while key in used_keys:
            key = f"{base}{chr(ord('a') + n - 2)}"
            n += 1
        used_keys.add(key)

        fields = _entry_fields(ref)
        if not fields:
            # Couldn't parse — keep the raw text so nothing is lost.
            fields = {"note": (raw or "").strip(), "title": (raw or "").strip()[:120]}
        etype = "article" if fields.get("journal") else "misc"
        entries.append((etype, key, fields))

    # Prefer bibtexparser for correct escaping/formatting.
    try:
        import bibtexparser
        from bibtexparser.bibdatabase import BibDatabase

        db = BibDatabase()
        db.entries = [
            {"ENTRYTYPE": etype, "ID": key, **fields}
            for (etype, key, fields) in entries
        ]
        return bibtexparser.dumps(db)
    except Exception as exc:  # noqa: BLE001
        logger.info("bibtexparser unavailable, using fallback serializer: %s", exc)

    # Hand serializer.
    out = []
    for etype, key, fields in entries:
        lines = [f"@{etype}{{{key},"]
        for k, v in fields.items():
            v = str(v).replace("{", "").replace("}", "")
            lines.append(f"  {k} = {{{v}}},")
        lines.append("}")
        out.append("\n".join(lines))
    return "\n\n".join(out) + "\n"


def references_to_bibtex(raw: str, *, enrich: bool = False) -> dict:
    """High-level entry point. Returns
    ``{bibtex, count, enriched, snippet}``."""
    parsed = parse_references(raw)
    enriched = 0
    if enrich:
        for raw_text, ref in parsed:
            if enrich_with_crossref(ref, raw_text):
                enriched += 1

    bib = to_bibtex(parsed)
    snippet = (
        "% add to your preamble:\n"
        "\\usepackage[numbers]{natbib}\n"
        "% ... and where the bibliography should appear:\n"
        "\\bibliographystyle{plainnat}\n"
        "\\bibliography{refs}\n"
    )
    return {
        "bibtex": bib,
        "count": len(parsed),
        "enriched": enriched,
        "snippet": snippet,
    }
