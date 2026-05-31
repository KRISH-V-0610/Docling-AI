"""
LaTeX Toolkit — FastAPI router (Phase H)
=========================================

Mounted at ``/toolkit`` by backend_ai/main.py. Every tool in tools.py gets a
REST endpoint here; the conversational assistant is at ``/toolkit/chat``.

    GET  /toolkit/health                 — liveness + capability flags
    GET  /toolkit/info                   — tool catalog (for the frontend)
    POST /toolkit/table                  — CSV/grid → tabular
    POST /toolkit/equation               — text → LaTeX math
    POST /toolkit/bibtex                 — references → .bib
    POST /toolkit/convert                — upload DOCX/PDF/TXT → LaTeX
    POST /toolkit/export?to=pdf|docx|md  — LaTeX → file download
    GET  /toolkit/templates              — list starter templates
    GET  /toolkit/templates/{id}         — one template's .tex
    POST /toolkit/chat                   — LaTeXAssistant (Agno)
"""

from __future__ import annotations

import logging
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from . import tools as T
from .agent import chat as assistant_chat

logger = logging.getLogger(__name__)

router = APIRouter(tags=["latex-toolkit"])


# ──────────────────────────────────────────────────────────────
#  Health / info  (public — see main.py public_paths)
# ──────────────────────────────────────────────────────────────

@router.get("/health")
def health() -> dict:
    from ..deepscan.latex_compile import tectonic_available

    pandoc_ok = shutil.which("pandoc") is not None
    return {
        "status": "ok",
        "service": "latex-toolkit",
        "capabilities": {
            "tectonic": tectonic_available(),   # pdf export
            "pandoc": pandoc_ok,                 # docx/md export
        },
    }


@router.get("/info")
def info() -> dict:
    return {
        "tools": [
            {"id": "table", "name": "Table → LaTeX", "method": "POST", "path": "/toolkit/table"},
            {"id": "equation", "name": "Equation → LaTeX", "method": "POST", "path": "/toolkit/equation"},
            {"id": "bibtex", "name": "References → BibTeX", "method": "POST", "path": "/toolkit/bibtex"},
            {"id": "convert", "name": "Word/PDF → LaTeX", "method": "POST", "path": "/toolkit/convert"},
            {"id": "export", "name": "LaTeX → PDF/DOCX/MD", "method": "POST", "path": "/toolkit/export"},
            {"id": "templates", "name": "Template Library", "method": "GET", "path": "/toolkit/templates"},
            {"id": "chat", "name": "LaTeX Assistant", "method": "POST", "path": "/toolkit/chat"},
        ],
        **T.list_templates(),
    }


# ──────────────────────────────────────────────────────────────
#  table
# ──────────────────────────────────────────────────────────────

class TableRequest(BaseModel):
    data: str
    has_header: bool = True
    caption: str | None = None
    label: str | None = None
    delimiter: str | None = None
    align: str | None = None


@router.post("/table")
def table(req: TableRequest) -> dict:
    return T.table_to_latex(
        req.data, has_header=req.has_header, caption=req.caption,
        label=req.label, delimiter=req.delimiter, align=req.align,
    )


# ──────────────────────────────────────────────────────────────
#  equation
# ──────────────────────────────────────────────────────────────

class EquationRequest(BaseModel):
    description: str
    display: bool = True


@router.post("/equation")
def equation(req: EquationRequest) -> dict:
    return T.equation_to_latex(req.description, display=req.display)


# ──────────────────────────────────────────────────────────────
#  bibtex
# ──────────────────────────────────────────────────────────────

class BibtexRequest(BaseModel):
    references: str
    enrich: bool = False


@router.post("/bibtex")
def bibtex(req: BibtexRequest) -> dict:
    return T.references_to_bibtex(req.references, enrich=req.enrich)


# ──────────────────────────────────────────────────────────────
#  convert (file upload → LaTeX)
# ──────────────────────────────────────────────────────────────

_ALLOWED_UPLOAD = {".docx", ".pdf", ".txt"}


@router.post("/convert")
async def convert(
    file: UploadFile = File(...),
    style: str = Form("article"),
) -> dict:
    name = file.filename or "upload"
    suffix = Path(name).suffix.lower()
    if suffix not in _ALLOWED_UPLOAD:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Upload .docx, .pdf, or .txt.",
        )
    with tempfile.TemporaryDirectory(prefix="toolkit_convert_") as tmp:
        dest = Path(tmp) / name
        with dest.open("wb") as fh:
            shutil.copyfileobj(file.file, fh)
        try:
            return T.document_to_latex(dest, style=style)
        except NotImplementedError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except Exception as exc:  # noqa: BLE001
            logger.exception("convert failed")
            raise HTTPException(status_code=500, detail=f"Conversion failed: {exc}")


# ──────────────────────────────────────────────────────────────
#  export (LaTeX → file)
# ──────────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    latex: str


@router.post("/export")
def export(req: ExportRequest, to: str = Query("pdf")) -> Response:
    result = T.latex_export(req.latex, to=to)
    if not result["ok"] or not result["data"]:
        return JSONResponse(
            status_code=422,
            content={"ok": False, "log": result["log"], "notes": result["notes"],
                     "fmt": result["fmt"]},
        )
    ext = "pdf" if result["fmt"] == "pdf" else ("docx" if result["fmt"] == "docx" else "md")
    headers = {"Content-Disposition": f'attachment; filename="document.{ext}"'}
    if result["notes"]:
        headers["X-Latex-Notes"] = "; ".join(result["notes"])[:480]
    return Response(content=result["data"], media_type=result["mimetype"], headers=headers)


# ──────────────────────────────────────────────────────────────
#  templates
# ──────────────────────────────────────────────────────────────

@router.get("/templates")
def templates() -> dict:
    return T.list_templates()


@router.get("/templates/{template_id}")
def template(template_id: str) -> dict:
    try:
        return T.get_template(template_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ──────────────────────────────────────────────────────────────
#  chat (Agno assistant)
# ──────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
def chat(req: ChatRequest) -> dict:
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message is required")
    reply = assistant_chat(req.message)
    return {"reply": reply}
