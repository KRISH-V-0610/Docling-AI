"""
GitHub README Generator API — Single File
==========================================
All functionality in one main.py:
  - Serves index.html at GET /
  - Session management (in-memory, TTL-based)
  - Security middleware
  - GitHub repo deep analysis
  - Groq AI summaries (llama-3.3-70b-versatile, free tier)
  - LaTeX README generation (6 templates, 18 sections)
  - Markdown README generation (18 sections)
  - Placeholder <...> support in user links
  - Batch endpoints, rate-limit status, health checks

Usage:
  pip install fastapi uvicorn httpx pydantic python-dotenv
  echo "GROQ_API_KEY=your_key"    >> .env   # free at console.groq.com
  echo "GITHUB_TOKEN=your_token"  >> .env   # free at github.com/settings/tokens
  uvicorn main:app --reload

  Then open http://localhost:8000 in your browser.
"""

from __future__ import annotations

# ── stdlib ────────────────────────────────────────────────────────────────────
import asyncio
import base64
import hashlib
import json
import logging
import os
import re
import secrets
import time
import textwrap
from contextlib import asynccontextmanager
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ── third-party ───────────────────────────────────────────────────────────────
import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("github_readme")

# ── HTML file location ────────────────────────────────────────────────────────
# index.html must live in the same directory as main.py
_HERE = Path(__file__).parent
_INDEX_HTML = _HERE / "index.html"


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — SCHEMAS (Pydantic models)
# ══════════════════════════════════════════════════════════════════════════════

class LatexTemplate(str, Enum):
    ARTICLE     = "article"
    IEEE        = "ieee"
    ACM         = "acm"
    MINIMAL     = "minimal"
    TECH_REPORT = "tech_report"
    ELEGANT     = "elegant"


class AnalysisDepth(str, Enum):
    SHALLOW  = "shallow"
    STANDARD = "standard"
    DEEP     = "deep"


class ConsentRequest(BaseModel):
    repo_url: str = Field(..., description="Public GitHub repository URL")
    user_consents: bool = Field(..., description="Must be true to proceed")
    analysis_depth: AnalysisDepth = Field(AnalysisDepth.STANDARD)

    @field_validator("repo_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        if not re.match(r"^https?://github\.com/[\w\-\.]+/[\w\-\.]+/?$", v.rstrip("/")):
            raise ValueError("Must be a valid public GitHub repository URL")
        return v.rstrip("/")

    @field_validator("user_consents")
    @classmethod
    def must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Set user_consents=true to proceed.")
        return v


class SessionResponse(BaseModel):
    session_token: str
    message: str
    privacy_notice: str
    expires_in_seconds: int


class RepoMetadata(BaseModel):
    name: str
    full_name: str
    description: Optional[str]
    url: str
    stars: int
    forks: int
    watchers: int
    open_issues: int
    language: Optional[str]
    languages: Dict[str, int]
    topics: List[str]
    license: Optional[str]
    created_at: str
    updated_at: str
    default_branch: str
    is_fork: bool
    size_kb: int


class RepoStructure(BaseModel):
    file_count: int
    directory_count: int
    file_tree: str
    key_files: List[str]
    detected_stack: List[str]
    has_tests: bool
    has_ci: bool
    has_docker: bool
    has_docs: bool
    entry_points: List[str]


class CodeAnalysis(BaseModel):
    primary_language: Optional[str]
    languages_breakdown: Dict[str, float]
    architecture_pattern: Optional[str]
    key_modules: List[str]
    dependencies: List[str]
    api_endpoints: List[str]
    environment_variables: List[str]
    test_framework: Optional[str]
    build_tool: Optional[str]


class RepoAnalysisResponse(BaseModel):
    session_token: str
    repo_url: str
    metadata: RepoMetadata
    structure: RepoStructure
    code_analysis: CodeAnalysis
    ai_summary: str
    privacy_notice: str = (
        "Analysis complete. No data stored. Session expires in 1 hour."
    )


class CustomSection(BaseModel):
    title: str = Field(..., max_length=100)
    content: str = Field(..., max_length=5000)
    position: int = Field(default=999, description="0=top, 999=bottom")


class LinkItem(BaseModel):
    """
    Supports placeholder syntax: <enter link title>, <enter full URL>.
    Placeholders render visibly in the output so you know what to fill in.
    """
    label: str = Field(..., examples=["Documentation", "<enter link title>"])
    url: str   = Field(..., examples=["https://docs.example.com", "<enter full URL>"])
    description: Optional[str] = Field(default=None, examples=["<enter description>"])


class ReadmeGenerateRequest(BaseModel):
    session_token: str
    template: LatexTemplate
    custom_sections: Optional[List[CustomSection]] = None
    include_sections: Optional[List[str]] = None
    user_links: Optional[List[LinkItem]] = None
    badge_style: str = Field(default="flat", pattern="^(flat|flat-square|plastic|for-the-badge)$")
    color_theme: str = Field(default="blue", pattern="^(blue|green|red|purple|orange|black)$")


class ReadmeGenerateResponse(BaseModel):
    session_token: str
    template_used: LatexTemplate
    latex_source: str
    sections_generated: List[str]
    custom_sections_included: int
    compilation_hint: str
    privacy_notice: str = "Generated README not stored. Download it now."


class TemplateInfo(BaseModel):
    id: LatexTemplate
    name: str
    description: str
    packages_required: List[str]
    best_for: str


class TemplatesListResponse(BaseModel):
    templates: List[TemplateInfo]


class AutoGenerateRequest(BaseModel):
    """Single-call pipeline — no session management needed."""
    repo_url: str = Field(..., description="Public GitHub repository URL")
    user_consents: bool = Field(..., description="Must be true")
    template: LatexTemplate = Field(default=LatexTemplate.ARTICLE)
    analysis_depth: AnalysisDepth = Field(default=AnalysisDepth.STANDARD)
    custom_sections: Optional[List[CustomSection]] = None
    include_sections: Optional[List[str]] = None
    user_links: Optional[List[LinkItem]] = Field(
        default=None,
        description="Use <enter link title> and <enter full URL> as placeholders."
    )
    badge_style: str = Field(default="flat", pattern="^(flat|flat-square|plastic|for-the-badge)$")
    color_theme: str = Field(default="blue", pattern="^(blue|green|red|purple|orange|black)$")

    @field_validator("repo_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        if not re.match(r"^https?://github\.com/[\w\-\.]+/[\w\-\.]+/?$", v.rstrip("/")):
            raise ValueError("Must be a valid public GitHub repository URL")
        return v.rstrip("/")

    @field_validator("user_consents")
    @classmethod
    def must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Set user_consents=true to proceed.")
        return v


class AutoGenerateResponse(BaseModel):
    session_token: str
    repo_url: str
    repo_name: str
    repo_description: Optional[str]
    stars: int
    primary_language: Optional[str]
    files_analyzed: int
    detected_stack: List[str]
    dependencies_found: int
    endpoints_found: int
    ai_summary: str
    template_used: LatexTemplate
    latex_source: str
    sections_generated: List[str]
    custom_sections_included: int
    compilation_hint: str
    privacy_notice: str = (
        "No data stored. Session is ephemeral and expires in 1 hour. "
        "Save the LaTeX source now."
    )


class MdGenerateRequest(BaseModel):
    """Single-call Markdown README pipeline."""
    repo_url: str = Field(..., description="Public GitHub repository URL")
    user_consents: bool = Field(..., description="Must be true")
    analysis_depth: AnalysisDepth = Field(default=AnalysisDepth.STANDARD)
    custom_sections: Optional[List[CustomSection]] = None
    include_sections: Optional[List[str]] = None
    user_links: Optional[List[LinkItem]] = Field(
        default=None,
        description="Use <enter link title> / <enter full URL> as placeholders."
    )
    badge_style: str = Field(default="flat", pattern="^(flat|flat-square|plastic|for-the-badge)$")
    color_theme: str = Field(default="blue", pattern="^(blue|green|red|purple|orange|black)$")

    @field_validator("repo_url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        if not re.match(r"^https?://github\.com/[\w\-\.]+/[\w\-\.]+/?$", v.rstrip("/")):
            raise ValueError("Must be a valid public GitHub repository URL")
        return v.rstrip("/")

    @field_validator("user_consents")
    @classmethod
    def must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Set user_consents=true to proceed.")
        return v


class MdGenerateResponse(BaseModel):
    session_token: str
    repo_url: str
    repo_name: str
    repo_description: Optional[str]
    stars: int
    primary_language: Optional[str]
    files_analyzed: int
    ai_summary: str
    markdown_source: str
    sections_generated: List[str]
    custom_sections_included: int
    privacy_notice: str = "No data stored. Session expires in 1 hour. Save markdown_source now."


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — SESSION STORE (in-memory, TTL-based, no disk)
# ══════════════════════════════════════════════════════════════════════════════

SESSION_TTL = 3600  # 1 hour


class _SessionStore:
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    def _hash(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()[:12]

    async def create(self, data: Dict[str, Any]) -> str:
        token = secrets.token_urlsafe(32)
        async with self._lock:
            self._store[token] = {
                "data": data,
                "created_at": time.time(),
                "expires_at": time.time() + SESSION_TTL,
            }
        logger.info("Session created (hash: %s)", self._hash(token))
        return token

    async def get(self, token: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            entry = self._store.get(token)
            if entry is None:
                return None
            if time.time() > entry["expires_at"]:
                del self._store[token]
                return None
            return entry["data"]

    async def update(self, token: str, data: Dict[str, Any]) -> bool:
        async with self._lock:
            if token not in self._store:
                return False
            if time.time() > self._store[token]["expires_at"]:
                del self._store[token]
                return False
            self._store[token]["data"].update(data)
            return True

    async def delete(self, token: str) -> bool:
        async with self._lock:
            if token in self._store:
                del self._store[token]
                logger.info("Session deleted (hash: %s)", self._hash(token))
                return True
            return False

    async def purge_expired(self):
        now = time.time()
        async with self._lock:
            expired = [t for t, e in self._store.items() if now > e["expires_at"]]
            for t in expired:
                del self._store[t]
        if expired:
            logger.info("Purged %d expired sessions", len(expired))

    async def active_count(self) -> int:
        async with self._lock:
            return len(self._store)


session_store = _SessionStore()


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — SECURITY MIDDLEWARE
# ══════════════════════════════════════════════════════════════════════════════

_STRIP_HEADERS = {"Server", "X-Powered-By", "X-AspNet-Version", "X-AspNetMvc-Version"}


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        logger.info(
            "→ %s %s (client: %s)",
            request.method, request.url.path,
            request.client.host if request.client else "unknown",
        )
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"]        = "DENY"
        response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"]          = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"]                 = "no-cache"
        response.headers["X-Privacy-Notice"]       = "No repository data is persisted."
        for h in _STRIP_HEADERS:
            if h in response.headers:
                del response.headers[h]
        return response


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — GITHUB SERVICE
# ══════════════════════════════════════════════════════════════════════════════

GITHUB_API = "https://api.github.com"

KEY_FILES = {
    "readme.md", "readme.rst", "readme.txt",
    "setup.py", "setup.cfg", "pyproject.toml",
    "package.json", "cargo.toml", "go.mod",
    "pom.xml", "build.gradle", "build.gradle.kts",
    "cmake", "makefile", "dockerfile",
    "requirements.txt", "pipfile", "poetry.lock",
    "composer.json", "gemfile",
    ".github/workflows", "action.yml", "action.yaml",
    "main.py", "app.py", "index.js", "main.go",
    "src/main.rs", "main.rs",
    "contributing.md", "changelog.md", "license",
}

LANG_EXTENSIONS: Dict[str, str] = {
    ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
    ".jsx": "React/JSX", ".tsx": "React/TSX", ".java": "Java",
    ".go": "Go", ".rs": "Rust", ".cpp": "C++", ".c": "C",
    ".cs": "C#", ".rb": "Ruby", ".php": "PHP", ".swift": "Swift",
    ".kt": "Kotlin", ".scala": "Scala", ".r": "R", ".m": "MATLAB",
    ".sh": "Shell", ".bash": "Bash", ".html": "HTML", ".css": "CSS",
    ".vue": "Vue", ".svelte": "Svelte", ".tf": "Terraform",
    ".yaml": "YAML", ".yml": "YAML", ".json": "JSON",
    ".md": "Markdown", ".tex": "LaTeX", ".ipynb": "Jupyter Notebook",
}

ARCH_PATTERNS = {
    "MVC":              ["models/", "views/", "controllers/"],
    "Microservices":    ["services/", "api-gateway", "docker-compose"],
    "Monorepo":         ["packages/", "apps/", "libs/", "workspace"],
    "CLI Tool":         ["cli.py", "cli.js", "cmd/", "commands/"],
    "Library/SDK":      ["src/", "lib/", "dist/", "examples/"],
    "REST API":         ["routes/", "routers/", "endpoints/", "api/"],
    "Data Pipeline":    ["pipelines/", "etl/", "dags/", "airflow"],
    "Machine Learning": ["models/", "training/", "data/", "notebooks/"],
    "Frontend SPA":     ["src/", "public/", "components/", "pages/"],
}


def _build_github_headers() -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GitHubReadmeGenerator/1.0",
    }
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        logger.warning("No GITHUB_TOKEN — unauthenticated limit: 60 req/hr")
    return headers


def _parse_owner_repo(url: str) -> Tuple[str, str]:
    m = re.match(r"https?://github\.com/([\w\-\.]+)/([\w\-\.]+)", url)
    if not m:
        raise ValueError(f"Cannot parse GitHub URL: {url}")
    return m.group(1), m.group(2)


async def _gh_get(client: httpx.AsyncClient, path: str) -> Any:
    url = f"{GITHUB_API}{path}"
    for attempt in range(3):
        resp = await client.get(url, headers=_build_github_headers(), timeout=20)
        if resp.status_code == 403 and "rate limit" in resp.text.lower():
            wait = int(resp.headers.get("Retry-After", 15))
            logger.warning("GitHub rate limited. Waiting %ds…", wait)
            await asyncio.sleep(wait)
            continue
        if resp.status_code == 404:
            raise ValueError("Repository not found or is private.")
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError("GitHub API rate limit exceeded.")


async def _fetch_repo_metadata(client: httpx.AsyncClient, owner: str, repo: str) -> RepoMetadata:
    data = await _gh_get(client, f"/repos/{owner}/{repo}")
    if data.get("private", False):
        raise ValueError("Repository is private. Only public repos are supported.")
    try:
        langs = await _gh_get(client, f"/repos/{owner}/{repo}/languages")
    except Exception:
        langs = {}
    try:
        topics_data = await _gh_get(client, f"/repos/{owner}/{repo}/topics")
        topics = topics_data.get("names", [])
    except Exception:
        topics = []
    license_name = None
    if data.get("license"):
        license_name = data["license"].get("spdx_id") or data["license"].get("name")
    return RepoMetadata(
        name=data["name"], full_name=data["full_name"],
        description=data.get("description"), url=data["html_url"],
        stars=data.get("stargazers_count", 0), forks=data.get("forks_count", 0),
        watchers=data.get("watchers_count", 0), open_issues=data.get("open_issues_count", 0),
        language=data.get("language"), languages=langs, topics=topics,
        license=license_name, created_at=data["created_at"], updated_at=data["updated_at"],
        default_branch=data.get("default_branch", "main"),
        is_fork=data.get("fork", False), size_kb=data.get("size", 0),
    )


async def _fetch_file_tree(client, owner, repo, branch) -> Tuple[List[Dict], str]:
    try:
        data = await _gh_get(client, f"/repos/{owner}/{repo}/git/trees/{branch}?recursive=1")
    except Exception as e:
        logger.warning("Could not fetch file tree: %s", e)
        return [], ""
    items = data.get("tree", [])
    paths = sorted([i["path"] for i in items if i["type"] == "blob"])
    lines = [f"{owner}/{repo}/"]
    for path in paths[:200]:
        parts = path.split("/")
        lines.append("  " * (len(parts)-1) + f"├── {parts[-1]}")
    if len(paths) > 200:
        lines.append(f"  ... and {len(paths)-200} more files")
    return items, "\n".join(lines)


def _classify_files(items: List[Dict]) -> Dict[str, Any]:
    blobs = [i for i in items if i["type"] == "blob"]
    dirs  = {"/".join(i["path"].split("/")[:-1]) for i in blobs}
    key_files, lang_counts = [], {}
    has_tests = has_ci = has_docker = has_docs = False
    entry_points, detected_stack = [], []

    for item in blobs:
        pl = item["path"].lower()
        fn = pl.split("/")[-1]
        ext = "." + fn.rsplit(".", 1)[-1] if "." in fn else ""
        if ext in LANG_EXTENSIONS:
            lang_counts[LANG_EXTENSIONS[ext]] = lang_counts.get(LANG_EXTENSIONS[ext], 0) + 1
        if fn in KEY_FILES or any(kf in pl for kf in KEY_FILES):
            key_files.append(item["path"])
        if "test" in pl or "spec" in pl:            has_tests  = True
        if ".github/workflows" in pl or "ci" in fn: has_ci     = True
        if "dockerfile" in fn or "docker-compose" in fn: has_docker = True
        if "docs/" in pl or fn.endswith(".md"):     has_docs   = True
        if fn in {"main.py","app.py","index.js","main.go","main.rs","index.ts"}:
            entry_points.append(item["path"])

    all_paths = " ".join(i["path"].lower() for i in blobs)
    for arch, markers in ARCH_PATTERNS.items():
        if sum(1 for m in markers if m in all_paths) >= 2:
            detected_stack.append(arch)

    fw_hints = {
        "FastAPI":["fastapi","uvicorn"], "Django":["django","wsgi.py"],
        "Flask":["flask","flask_"], "React":["react","jsx","tsx"],
        "Vue.js":["vue",".vue"], "Express.js":["express","app.js"],
        "Spring":["spring","applicationcontext"], "Rails":["rails","gemfile"],
        "Next.js":["next.config","pages/","_app.js"],
        "Docker":["dockerfile","docker-compose"], "Terraform":[".tf","terraform"],
    }
    for fw, hints in fw_hints.items():
        if any(h in all_paths for h in hints):
            detected_stack.append(fw)

    return {
        "key_files": list(set(key_files))[:20],
        "lang_counts": lang_counts,
        "has_tests": has_tests, "has_ci": has_ci,
        "has_docker": has_docker, "has_docs": has_docs,
        "entry_points": entry_points,
        "detected_stack": list(set(detected_stack)),
        "dir_count": len(dirs), "file_count": len(blobs),
    }


async def _fetch_file_content(client, owner, repo, path, max_bytes=30_000) -> Optional[str]:
    try:
        data = await _gh_get(client, f"/repos/{owner}/{repo}/contents/{path}")
        if isinstance(data, list):
            return None
        decoded = base64.b64decode(data.get("content","").replace("\n","")).decode("utf-8", errors="replace")
        return decoded[:max_bytes]
    except Exception:
        return None


async def _fetch_commits_summary(client, owner, repo) -> Dict[str, Any]:
    try:
        commits = await _gh_get(client, f"/repos/{owner}/{repo}/commits?per_page=10")
        contributors, messages = set(), []
        for c in commits:
            if c.get("author"):
                contributors.add(c["author"].get("login", "unknown"))
            messages.append(c.get("commit", {}).get("message", "").split("\n")[0][:80])
        return {"recent_commits": messages, "recent_contributors": list(contributors)}
    except Exception:
        return {"recent_commits": [], "recent_contributors": []}


def _extract_from_contents(file_contents: Dict[str, str]) -> Dict[str, Any]:
    deps, env_vars, endpoints = [], [], []
    test_framework = build_tool = None

    for path, content in file_contents.items():
        pl = path.lower()
        if "requirements.txt" in pl:
            deps += [l.split("==")[0].split(">=")[0].strip()
                     for l in content.splitlines() if l.strip() and not l.startswith("#")]
        elif "package.json" in pl:
            try:
                pkg = json.loads(content)
                deps += list(pkg.get("dependencies", {}).keys())[:20]
                deps += list(pkg.get("devDependencies", {}).keys())[:10]
            except Exception:
                pass
        elif "go.mod" in pl:
            for line in content.splitlines():
                if line.startswith("\t") and " " in line:
                    deps.append(line.strip().split(" ")[0].split("/")[-1])

        env_vars += re.findall(r'os\.(?:environ|getenv)\([\'"]([A-Z_]+)[\'"]', content)
        env_vars += re.findall(r'process\.env\.([A-Z_]+)', content)
        env_vars += re.findall(r'ENV\[[\'"]([\\w_]+)[\'\"]\]', content)

        endpoints += re.findall(r'@(?:app|router)\.[a-z]+\([\'"]([/\w{}<>:]+)[\'"]', content)
        endpoints += re.findall(r'router\.[A-Z]+\([\'"]([/\w{}<>:]+)[\'"]', content)

        if not test_framework:
            if "pytest" in content:          test_framework = "pytest"
            elif "unittest" in content:      test_framework = "unittest"
            elif "jest" in content or "describe(" in content: test_framework = "Jest"
            elif "mocha" in content:         test_framework = "Mocha"

        if not build_tool:
            if "makefile"     in pl: build_tool = "Make"
            elif "gradle"     in pl: build_tool = "Gradle"
            elif "pom.xml"    in pl: build_tool = "Maven"
            elif "cargo.toml" in pl: build_tool = "Cargo"
            elif "pyproject"  in pl: build_tool = "Poetry/PEP517"

    return {
        "dependencies":  list(set(deps))[:30],
        "env_vars":       list(set(env_vars))[:20],
        "endpoints":      list(set(endpoints))[:20],
        "test_framework": test_framework,
        "build_tool":     build_tool,
    }


async def analyze_repo(repo_url: str, depth: AnalysisDepth = AnalysisDepth.STANDARD) -> Dict[str, Any]:
    owner, repo = _parse_owner_repo(repo_url)
    logger.info("Analyzing %s/%s (depth=%s)", owner, repo, depth)

    async with httpx.AsyncClient(follow_redirects=True) as client:
        metadata     = await _fetch_repo_metadata(client, owner, repo)
        items, tree  = await _fetch_file_tree(client, owner, repo, metadata.default_branch)
        classification = _classify_files(items)

        file_contents: Dict[str, str] = {}
        if depth in (AnalysisDepth.STANDARD, AnalysisDepth.DEEP):
            priority = [f for f in classification["key_files"]
                        if f.lower().endswith((".py",".js",".ts",".go",".rs",".java",
                                               ".md",".toml",".json",".yaml",".yml",".txt"))][:15]
            results = await asyncio.gather(*[_fetch_file_content(client, owner, repo, f) for f in priority], return_exceptions=True)
            for path, content in zip(priority, results):
                if isinstance(content, str):
                    file_contents[path] = content

        if depth == AnalysisDepth.DEEP:
            src_exts = {".py",".js",".ts",".go",".rs",".java"}
            src_files = [i["path"] for i in items
                         if i["type"]=="blob" and any(i["path"].endswith(e) for e in src_exts)
                         and i["path"] not in file_contents][:20]
            results = await asyncio.gather(*[_fetch_file_content(client, owner, repo, f, 10_000) for f in src_files], return_exceptions=True)
            for path, content in zip(src_files, results):
                if isinstance(content, str):
                    file_contents[path] = content

        commits_info = await _fetch_commits_summary(client, owner, repo)
        extracted    = _extract_from_contents(file_contents)

        total_lang = sum(classification["lang_counts"].values()) or 1
        lang_pct   = {lang: round(cnt/total_lang*100, 1)
                      for lang, cnt in sorted(classification["lang_counts"].items(), key=lambda x: -x[1])}

        structure = RepoStructure(
            file_count=classification["file_count"],
            directory_count=classification["dir_count"],
            file_tree=tree,
            key_files=classification["key_files"],
            detected_stack=classification["detected_stack"],
            has_tests=classification["has_tests"],
            has_ci=classification["has_ci"],
            has_docker=classification["has_docker"],
            has_docs=classification["has_docs"],
            entry_points=classification["entry_points"],
        )
        code_analysis = CodeAnalysis(
            primary_language=metadata.language,
            languages_breakdown=lang_pct,
            architecture_pattern=classification["detected_stack"][0] if classification["detected_stack"] else None,
            key_modules=classification["entry_points"],
            dependencies=extracted["dependencies"],
            api_endpoints=extracted["endpoints"],
            environment_variables=extracted["env_vars"],
            test_framework=extracted["test_framework"],
            build_tool=extracted["build_tool"],
        )

    return {
        "metadata": metadata, "structure": structure,
        "code_analysis": code_analysis, "file_contents": file_contents,
        "commits_info": commits_info, "owner": owner, "repo": repo,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — GROQ AI SERVICE
# ══════════════════════════════════════════════════════════════════════════════

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"


def _build_summary_prompt(analysis_data: Dict[str, Any]) -> str:
    meta   = analysis_data["metadata"]
    struct = analysis_data["structure"]
    code   = analysis_data["code_analysis"]
    commits = analysis_data.get("commits_info", {})
    file_contents = analysis_data.get("file_contents", {})

    snippets = []
    for path, content in list(file_contents.items())[:5]:
        snippets.append(f"--- {path} ---\n{content[:800]}")
    snippets_text = "\n\n".join(snippets) or "No file contents fetched."

    return f"""You are analyzing the public GitHub repository: {meta.full_name}

## Repository Metadata
- Description: {meta.description or "None provided"}
- Primary Language: {meta.language or "Unknown"}
- Stars: {meta.stars} | Forks: {meta.forks}
- Topics: {", ".join(meta.topics) or "None"}
- License: {meta.license or "Not specified"}
- Size: {meta.size_kb} KB | Created: {meta.created_at[:10]} | Updated: {meta.updated_at[:10]}

## Structure
- Files: {struct.file_count} | Directories: {struct.directory_count}
- Tests: {struct.has_tests} | CI: {struct.has_ci} | Docker: {struct.has_docker} | Docs: {struct.has_docs}
- Detected Stack: {", ".join(struct.detected_stack) or "Unknown"}
- Entry Points: {", ".join(struct.entry_points[:5]) or "None"}

## Code Analysis
- Architecture: {code.architecture_pattern or "Unknown"}
- Languages: {json.dumps(code.languages_breakdown)}
- Key Dependencies: {", ".join(code.dependencies[:10]) or "None"}
- API Endpoints: {", ".join(code.api_endpoints[:10]) or "None"}
- Test Framework: {code.test_framework or "Unknown"}
- Build Tool: {code.build_tool or "Unknown"}
- Env Variables: {", ".join(code.environment_variables[:10]) or "None"}

## Recent Commits
{chr(10).join(commits.get("recent_commits", [])[:5]) or "Not available"}

## Key File Snippets
{snippets_text}

---
Write a comprehensive technical summary (300-500 words, plain text) covering:
1. What the project does (purpose and goals)
2. Technical architecture and design patterns
3. Main technologies and frameworks
4. How to get started
5. Notable features and capabilities
6. Project maturity and activity level

Be specific, accurate, and never invent features not evidenced by the data."""


async def generate_ai_summary(analysis_data: Dict[str, Any]) -> str:
    key = os.getenv("GROQ_API_KEY", "").strip()

    if not key:
        logger.info("No GROQ_API_KEY — using template summary. Get a free key at https://console.groq.com")
        return _template_summary(analysis_data)

    prompt = _build_summary_prompt(analysis_data)
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are a technical writer specializing in software documentation. Write clear, accurate, professional summaries."},
            {"role": "user",   "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens":  1024,
        "top_p":       0.9,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(3):
            try:
                resp = await client.post(
                    GROQ_API_URL,
                    headers={
                        "Content-Type":  "application/json",
                        "Authorization": f"Bearer {key}",
                    },
                    json=payload,
                )
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 10))
                    logger.warning("Groq rate limited (attempt %d/3). Waiting %ds…", attempt+1, retry_after)
                    await asyncio.sleep(retry_after)
                    continue
                if resp.status_code == 401:
                    logger.error("Groq API key invalid — check GROQ_API_KEY in .env")
                    return _template_summary(analysis_data)
                resp.raise_for_status()
                data   = resp.json()
                text   = data["choices"][0]["message"]["content"].strip()
                logger.info("Groq summary generated for %s (%d chars)", analysis_data["metadata"].full_name, len(text))
                return text
            except httpx.HTTPStatusError as e:
                logger.warning("Groq HTTP error %s: %s", e.response.status_code, e.response.text[:200])
                return _template_summary(analysis_data)
            except Exception as e:
                logger.warning("Groq API call failed: %s", e)
                return _template_summary(analysis_data)

    logger.warning("Groq rate limit persists — using fallback")
    return _template_summary(analysis_data)


def _template_summary(analysis_data: Dict[str, Any]) -> str:
    meta   = analysis_data["metadata"]
    struct = analysis_data["structure"]
    code   = analysis_data["code_analysis"]
    desc   = meta.description or "No description provided."
    lang   = meta.language or "multiple languages"
    stack  = ", ".join(struct.detected_stack[:4]) or "a general-purpose"
    deps   = ", ".join(code.dependencies[:5]) or "various libraries"
    feats  = [f for f, has in [("test suite", struct.has_tests), ("CI/CD", struct.has_ci),
              ("Docker", struct.has_docker), ("documentation", struct.has_docs)] if has]

    summary = (
        f"{meta.full_name} is a public repository primarily written in {lang}. "
        f"{desc}\n\n"
        f"The project uses a {stack} architectural approach with {struct.file_count} files "
        f"across {struct.directory_count} directories. Key dependencies include {deps}.\n\n"
        f"Infrastructure: {', '.join(feats) or 'standard project layout'}. "
        f"{meta.stars:,} stars, {meta.forks:,} forks. "
        f"{'Licensed under ' + meta.license + '.' if meta.license else 'No license specified.'} "
        f"Last updated {meta.updated_at[:10]}."
    )
    if code.api_endpoints:
        summary += f"\n\nDetected API endpoints: {', '.join(code.api_endpoints[:5])}."
    if code.environment_variables:
        summary += f"\n\nEnvironment variables: {', '.join(code.environment_variables[:5])}."
    return summary


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — LaTeX SERVICE
# ══════════════════════════════════════════════════════════════════════════════

_LATEX_SPECIAL = {
    "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_",
    "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}", "\\": r"\textbackslash{}",
    "<": r"\textless{}", ">": r"\textgreater{}",
}
_LATEX_RE = re.compile("|".join(re.escape(k) for k in _LATEX_SPECIAL))

def esc(text: str) -> str:
    if not text:
        return ""
    return _LATEX_RE.sub(lambda m: _LATEX_SPECIAL[m.group()], str(text))

def _lang_bar(pct: float) -> str:
    filled = round(pct / 5)
    empty  = 20 - filled
    return ("{\\color{blue!70}\\rule{" + str(filled*5) + "pt}{6pt}}" +
            "{\\color{gray!25}\\rule{" + str(empty*5)  + "pt}{6pt}}")

def _is_placeholder(val: str) -> bool:
    return bool(re.match(r"^<.+>$", val.strip()))


def _ltx_overview(meta, summary):
    topics = ", ".join(esc(t) for t in meta.topics) if meta.topics else "None"
    return rf"""
\section{{Overview}}
\label{{sec:overview}}
{esc(summary)}
\vspace{{0.8em}}
\begin{{tabular}}{{ll}}
\textbf{{Repository}} & \url{{{esc(meta.url)}}} \\
\textbf{{Description}} & {esc(meta.description or 'No description.')} \\
\textbf{{Language}}    & {esc(meta.language or 'Multiple')} \\
\textbf{{License}}     & {esc(meta.license or 'Not specified')} \\
\textbf{{Topics}}      & {topics} \\
\textbf{{Stats}}       & \textbf{{{meta.stars}}} stars \quad \textbf{{{meta.forks}}} forks \quad \textbf{{{meta.open_issues}}} issues \\
\textbf{{Last Updated}} & {esc(meta.updated_at[:10])} \\
\end{{tabular}}
"""

def _ltx_features(struct, code, meta):
    items = []
    if struct.has_tests:   items.append(rf"\item \textbf{{Tested}} --- {esc(code.test_framework or 'test')} suite included")
    if struct.has_ci:      items.append(r"\item \textbf{CI/CD} --- Automated pipeline configured")
    if struct.has_docker:  items.append(r"\item \textbf{Docker} --- Containerisation supported")
    if struct.has_docs:    items.append(r"\item \textbf{Documentation} --- Included in repository")
    if code.api_endpoints: items.append(rf"\item \textbf{{REST API}} --- {len(code.api_endpoints)} endpoint(s) detected")
    if code.environment_variables: items.append(rf"\item \textbf{{Configurable}} --- {len(code.environment_variables)} env variable(s)")
    if code.build_tool:    items.append(rf"\item \textbf{{Build Automation}} --- Uses {esc(code.build_tool)}")
    if meta.stars > 100:   items.append(rf"\item \textbf{{Community}} --- {meta.stars:,} stars, {meta.forks:,} forks")
    if not items:
        items = [r"\item \textbf{Open Source} --- Free to use and modify",
                 r"\item \textbf{Community Driven} --- Contributions welcome"]
    return rf"""
\section{{Features}}
\label{{sec:features}}
\begin{{itemize}}
  {"  ".join(items)}
\end{{itemize}}
"""

def _ltx_quickstart(meta, code):
    lang = (meta.language or "").lower()
    if "python" in lang:
        snippet = f"git clone {meta.url}\ncd {meta.name}\npython -m venv venv && source venv/bin/activate\npip install -r requirements.txt\n{'python ' + code.key_modules[0] if code.key_modules else 'python main.py'}"
    elif "javascript" in lang or "typescript" in lang:
        snippet = f"git clone {meta.url}\ncd {meta.name}\nnpm install && npm start"
    elif "go" in lang:
        snippet = f"git clone {meta.url}\ncd {meta.name}\ngo mod download && go run ."
    elif "rust" in lang:
        snippet = f"git clone {meta.url}\ncd {meta.name}\ncargo run"
    else:
        snippet = f"git clone {meta.url}\ncd {meta.name}"
    return rf"""
\section{{Quickstart}}
\label{{sec:quickstart}}
Get up and running in under 2 minutes:
\begin{{verbatim}}
{snippet}
\end{{verbatim}}
\noindent See Section~\ref{{sec:installation}} for full setup instructions.
"""

def _ltx_installation(meta, code, struct):
    lang = (meta.language or "").lower()
    if "python" in lang:
        prereqs = r"\item Python 3.8+ --- \url{https://python.org}"
        install = rf"""\subsection{{Standard Setup}}
\begin{{verbatim}}
git clone {meta.url}
cd {meta.name}
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
\end{{verbatim}}"""
    elif "javascript" in lang or "typescript" in lang:
        prereqs = r"\item Node.js 16+ --- \url{https://nodejs.org}"
        install = rf"""\subsection{{npm}}
\begin{{verbatim}}
git clone {meta.url}
cd {meta.name}
npm install
\end{{verbatim}}"""
    elif "go" in lang:
        prereqs = r"\item Go 1.19+ --- \url{https://go.dev}"
        install = rf"""\subsection{{Standard Setup}}
\begin{{verbatim}}
git clone {meta.url}
cd {meta.name}
go mod download && go build -o {meta.name} .
\end{{verbatim}}"""
    elif "rust" in lang:
        prereqs = r"\item Rust toolchain --- \url{https://rustup.rs}"
        install = rf"""\subsection{{Cargo}}
\begin{{verbatim}}
git clone {meta.url}
cd {meta.name}
cargo build --release
\end{{verbatim}}"""
    else:
        prereqs = rf"\item {esc(meta.language or 'Required runtime')} installed"
        install = rf"""\subsection{{Clone}}
\begin{{verbatim}}
git clone {meta.url}
cd {meta.name}
\end{{verbatim}}"""

    docker = ""
    if struct.has_docker:
        docker = rf"""
\subsection{{Docker}}
\begin{{verbatim}}
docker build -t {meta.name.lower()} .
docker run -p 8000:8000 {meta.name.lower()}
\end{{verbatim}}"""

    return rf"""
\section{{Installation}}
\label{{sec:installation}}
\subsection{{Prerequisites}}
\begin{{itemize}}
  {prereqs}
  \item Git --- \url{{https://git-scm.com}}
\end{{itemize}}
{install}
{docker}
"""

def _ltx_configuration(code, meta):
    if not code.environment_variables:
        return rf"""
\section{{Configuration}}
\label{{sec:configuration}}
No environment variables detected. See \url{{{esc(meta.url)}}} for configuration options.
"""
    rows = "\n".join(rf"  \texttt{{{esc(v)}}} & \textit{{See docs}} & --- \\" for v in code.environment_variables)
    env_lines = "\n".join(f"{v}=<enter value>" for v in code.environment_variables[:15])
    return rf"""
\section{{Configuration}}
\label{{sec:configuration}}
Create a \texttt{{.env}} file in the project root:
\begin{{verbatim}}
{env_lines}
\end{{verbatim}}
\begin{{tabular}}{{lll}}
\toprule
\textbf{{Variable}} & \textbf{{Example}} & \textbf{{Description}} \\
\midrule
{rows}
\bottomrule
\end{{tabular}}
\vspace{{0.5em}}
\noindent\textbf{{Warning:}} Never commit \texttt{{.env}} to version control.
"""

def _ltx_usage(meta, code):
    lang = (meta.language or "").lower()
    if "python" in lang:
        ex = f"from {meta.name.replace('-','_')} import main\nmain()"
    elif "javascript" in lang:
        ex = f"const app = require('./{meta.name}');\napp();"
    else:
        ex = f"# See {meta.url} for usage examples"
    api_hint = ""
    if code.api_endpoints:
        api_hint = rf"""
\subsection{{API Usage}}
\begin{{verbatim}}
curl -X GET http://localhost:8000{code.api_endpoints[0]}
\end{{verbatim}}
See Section~\ref{{sec:api}} for all endpoints."""
    return rf"""
\section{{Usage}}
\label{{sec:usage}}
\subsection{{Basic Example}}
\begin{{verbatim}}
{ex}
\end{{verbatim}}
{api_hint}
"""

def _ltx_api(code):
    if not code.api_endpoints:
        return ""
    rows = "\n".join(rf"  \texttt{{{esc(ep)}}} & GET & --- \\" for ep in code.api_endpoints)
    return rf"""
\section{{API Reference}}
\label{{sec:api}}
\begin{{tabular}}{{lll}}
\toprule
\textbf{{Endpoint}} & \textbf{{Method}} & \textbf{{Description}} \\
\midrule
{rows}
\bottomrule
\end{{tabular}}
"""

def _ltx_testing(code, struct, meta):
    if not struct.has_tests:
        return rf"""
\section{{Testing}}
\label{{sec:testing}}
No test suite detected. Contributions adding tests are welcome.
"""
    fw = code.test_framework or "the test suite"
    if code.test_framework == "pytest":
        cmds = "pytest\npytest --cov=. --cov-report=html"
    elif code.test_framework == "Jest":
        cmds = "npm test\nnpm test -- --coverage"
    else:
        cmds = "python -m unittest discover"
    ci = r"\noindent Tests run automatically via CI/CD on every pull request." if struct.has_ci else ""
    return rf"""
\section{{Testing}}
\label{{sec:testing}}
This project uses \textbf{{{esc(fw)}}}.
\begin{{verbatim}}
{cmds}
\end{{verbatim}}
{ci}
"""

def _ltx_architecture(struct, code):
    stack   = "\n  ".join(rf"\item {esc(s)}" for s in struct.detected_stack) or r"\item Not determined"
    entries = "\n  ".join(rf"\item \texttt{{{esc(e)}}}" for e in struct.entry_points[:8]) or r"\item None detected"
    infra   = []
    if struct.has_tests:  infra.append(rf"\item \textbf{{Testing:}} {esc(code.test_framework or 'Present')}")
    if struct.has_ci:     infra.append(r"\item \textbf{CI/CD:} Configured")
    if struct.has_docker: infra.append(r"\item \textbf{Docker:} Supported")
    if code.build_tool:   infra.append(rf"\item \textbf{{Build:}} {esc(code.build_tool)}")
    infra_str = "\n  ".join(infra) or r"\item Standard layout"
    return rf"""
\section{{Architecture}}
\label{{sec:architecture}}
\subsection{{Pattern}}
Primary pattern: \textbf{{{esc(code.architecture_pattern or 'General purpose')}}}.
\subsection{{Technology Stack}}
\begin{{itemize}}
  {stack}
\end{{itemize}}
\subsection{{Entry Points}}
\begin{{itemize}}
  {entries}
\end{{itemize}}
\subsection{{Infrastructure}}
\begin{{itemize}}
  {infra_str}
\end{{itemize}}
"""

def _ltx_languages(code):
    if not code.languages_breakdown:
        return ""
    rows = "\n".join(rf"  {esc(lang)} & {_lang_bar(pct)} & {pct}\% \\" for lang, pct in list(code.languages_breakdown.items())[:12])
    return rf"""
\section{{Languages}}
\label{{sec:languages}}
\begin{{tabular}}{{lll}}
\toprule
\textbf{{Language}} & \textbf{{Distribution}} & \textbf{{Share}} \\
\midrule
{rows}
\bottomrule
\end{{tabular}}
"""

def _ltx_structure(struct):
    return rf"""
\section{{Project Structure}}
\label{{sec:structure}}
\noindent\textbf{{{struct.file_count:,} files}} across \textbf{{{struct.directory_count} directories}}.
\begin{{verbatim}}
{struct.file_tree[:2500] if struct.file_tree else "Tree not available"}
\end{{verbatim}}
"""

def _ltx_dependencies(code):
    if not code.dependencies:
        return ""
    deps = code.dependencies[:30]
    mid  = (len(deps)+1)//2
    col1 = "\n  ".join(rf"\item \texttt{{{esc(d)}}}" for d in deps[:mid])
    col2 = "\n  ".join(rf"\item \texttt{{{esc(d)}}}" for d in deps[mid:])
    return rf"""
\section{{Dependencies}}
\label{{sec:dependencies}}
\begin{{minipage}}[t]{{0.48\textwidth}}
\begin{{itemize}}
  {col1}
\end{{itemize}}
\end{{minipage}}
\hfill
\begin{{minipage}}[t]{{0.48\textwidth}}
\begin{{itemize}}
  {col2}
\end{{itemize}}
\end{{minipage}}
"""

def _ltx_roadmap(meta):
    return rf"""
\section{{Roadmap}}
\label{{sec:roadmap}}
See \url{{{esc(meta.url)}/issues}} for planned features and known bugs.
\begin{{itemize}}
  \item[$\square$] Check milestones: \url{{{esc(meta.url)}/milestones}}
  \item[$\square$] View project boards: \url{{{esc(meta.url)}/projects}}
  \item[$\square$] Suggest a feature: \url{{{esc(meta.url)}/issues/new}}
\end{{itemize}}
"""

def _ltx_faq(meta, code):
    items = [
        ("How do I report a bug?", rf"Open an issue at \url{{{esc(meta.url)}/issues/new}} with reproduction steps."),
        ("How do I request a feature?", rf"Open a feature request at \url{{{esc(meta.url)}/issues/new}}."),
    ]
    if code.environment_variables:
        items.append(("Where do I configure environment variables?", r"Create a \texttt{.env} file. See Section~\ref{sec:configuration}."))
    if code.api_endpoints:
        items.append(("Where is the API documentation?", r"Start the server and visit \url{http://localhost:8000/docs}."))
    items.append(("Is this actively maintained?", rf"Last updated \textbf{{{esc(meta.updated_at[:10])}}}. See \url{{{esc(meta.url)}/commits}}."))
    blocks = "\n\n".join(rf"\noindent\textbf{{Q: {esc(q)}}}\\[0.3em]{a}\vspace{{0.5em}}" for q, a in items)
    return rf"""
\section{{FAQ}}
\label{{sec:faq}}
{blocks}
"""

def _ltx_changelog(meta):
    return rf"""
\section{{Changelog}}
\label{{sec:changelog}}
Full version history and release notes: \url{{{esc(meta.url)}/releases}}
\begin{{itemize}}
  \item Breaking changes per version
  \item New features and bug fixes
  \item Migration guides
\end{{itemize}}
"""

def _ltx_links(user_links, meta):
    auto_rows = "\n  ".join(
        r"\item \textbf{" + esc(label) + r":} \url{" + esc(url) + "}"
        for label, url in [
            ("GitHub Repository", meta.url),
            ("Issues",            f"{meta.url}/issues"),
            ("Pull Requests",     f"{meta.url}/pulls"),
            ("Releases",          f"{meta.url}/releases"),
            ("Contributors",      f"{meta.url}/graphs/contributors"),
        ]
    )
    user_section = ""
    if user_links:
        user_items = []
        for lnk in user_links:
            label = lnk.label
            url   = lnk.url
            desc  = lnk.description or ""
            if _is_placeholder(label):
                rendered_label = r"\textit{\textless " + esc(label[1:-1]) + r"\textgreater}"
            else:
                rendered_label = r"\textbf{" + esc(label) + "}"
            if _is_placeholder(url):
                rendered_url = r"\textit{\textless " + esc(url[1:-1]) + r"\textgreater}"
            else:
                rendered_url = r"\url{" + esc(url) + "}"
            desc_part = ""
            if desc:
                desc_part = (r" --- \textit{\textless " + esc(desc[1:-1]) + r"\textgreater}") if _is_placeholder(desc) else (r" --- " + esc(desc))
            user_items.append(r"\item " + rendered_label + ": " + rendered_url + desc_part)

        user_section = r"""
\subsection{Additional Links}
\begin{itemize}
  """ + "\n  ".join(user_items) + r"""
\end{itemize}"""

    return rf"""
\section{{Links \& Resources}}
\label{{sec:links}}
\subsection{{Project Links}}
\begin{{itemize}}
  {auto_rows}
\end{{itemize}}
{user_section}
"""

def _ltx_contributing(meta):
    return rf"""
\section{{Contributing}}
\label{{sec:contributing}}
Contributions are welcome!
\begin{{enumerate}}
  \item \textbf{{Fork}} the repository at \url{{{esc(meta.url)}}}
  \item \textbf{{Branch}}: \texttt{{git checkout -b feature/your-feature}}
  \item \textbf{{Commit}}: \texttt{{git commit -m 'feat: description'}}
  \item \textbf{{Push}}: \texttt{{git push origin feature/your-feature}}
  \item \textbf{{Open a Pull Request}} at \url{{{esc(meta.url)}/pulls}}
\end{{enumerate}}
Report bugs at \url{{{esc(meta.url)}/issues/new}}.
"""

def _ltx_repo_info(meta):
    return rf"""
\section{{Repository Information}}
\label{{sec:repoinfo}}
\begin{{tabular}}{{ll}}
\toprule
\textbf{{Field}} & \textbf{{Value}} \\
\midrule
Full Name        & \texttt{{{esc(meta.full_name)}}} \\
Primary Language & {esc(meta.language or 'Multiple')} \\
Stars            & {meta.stars:,} \\
Forks            & {meta.forks:,} \\
Open Issues      & {meta.open_issues} \\
License          & {esc(meta.license or 'Not specified')} \\
Created          & {esc(meta.created_at[:10])} \\
Last Updated     & {esc(meta.updated_at[:10])} \\
Default Branch   & \texttt{{{esc(meta.default_branch)}}} \\
Size             & {meta.size_kb:,} KB \\
Is Fork          & {'Yes' if meta.is_fork else 'No'} \\
\bottomrule
\end{{tabular}}
"""

def _ltx_license(meta):
    return rf"""
\section{{License}}
\label{{sec:license}}
Licensed under \textbf{{{esc(meta.license or 'Not specified')}}}.
See \url{{{esc(meta.url)}/blob/{esc(meta.default_branch)}/LICENSE}}.
"""

def _ltx_custom(cs: CustomSection) -> str:
    label = re.sub(r"[^a-z0-9]", "", cs.title.lower())
    return rf"""
\section{{{esc(cs.title)}}}
\label{{sec:{label}}}
{esc(cs.content)}
"""

def _preamble_article(meta):
    return rf"""\documentclass{{article}}
\usepackage[utf8]{{inputenc}}\usepackage[T1]{{fontenc}}
\usepackage{{geometry}}\geometry{{margin=1in}}
\usepackage{{hyperref}}\hypersetup{{colorlinks=true,linkcolor=blue,urlcolor=blue}}
\usepackage{{booktabs}}\usepackage{{graphicx}}\usepackage{{xcolor}}
\usepackage{{listings}}\usepackage{{fancyhdr}}\usepackage{{microtype}}
\pagestyle{{fancy}}\fancyhf{{}}
\rhead{{\texttt{{{esc(meta.full_name)}}}}}\lhead{{README}}\rfoot{{\thepage}}
\title{{\textbf{{{esc(meta.name)}}}\\[0.5em]\large{{{esc(meta.description or '')}}}}}
\author{{\url{{{esc(meta.url)}}}}}\date{{\today}}
\begin{{document}}\maketitle\tableofcontents\newpage
"""

def _preamble_ieee(meta):
    return rf"""\documentclass[conference]{{IEEEtran}}
\usepackage[utf8]{{inputenc}}\usepackage{{hyperref}}\usepackage{{booktabs}}
\usepackage{{xcolor}}\usepackage{{graphicx}}\usepackage{{amsmath}}\usepackage{{url}}
\title{{{esc(meta.name)} --- Repository Documentation}}
\author{{\IEEEauthorblockN{{Open Source Project}}\IEEEauthorblockA{{GitHub: \url{{{esc(meta.url)}}}}}}}
\begin{{document}}\maketitle
\begin{{abstract}}{esc(meta.description or f'Documentation for {meta.name}.')}\end{{abstract}}
\begin{{IEEEkeywords}}{', '.join(esc(t) for t in meta.topics[:6]) if meta.topics else esc(meta.language or 'software')}\end{{IEEEkeywords}}
"""

def _preamble_acm(meta):
    return rf"""\documentclass[sigconf]{{acmart}}
\usepackage{{booktabs}}\usepackage{{xcolor}}\usepackage{{graphicx}}
\title{{{esc(meta.name)}}}\subtitle{{Repository Documentation}}
\author{{Open Source Project}}\affiliation{{\institution{{GitHub}}\country{{Online}}}}
\email{{\url{{{esc(meta.url)}}}}}
\begin{{abstract}}{esc(meta.description or f'Documentation for {meta.name}.')}\end{{abstract}}
\keywords{{{', '.join(esc(t) for t in meta.topics[:6]) if meta.topics else esc(meta.language or 'software')}}}
\begin{{document}}\maketitle
"""

def _preamble_minimal(meta):
    return rf"""\documentclass{{article}}
\usepackage[utf8]{{inputenc}}\usepackage[margin=1.2in]{{geometry}}
\usepackage{{hyperref}}\hypersetup{{colorlinks=true,linkcolor=blue,urlcolor=blue}}
\usepackage{{booktabs}}\usepackage{{xcolor}}\usepackage{{parskip}}
\setlength{{\parindent}}{{0pt}}
\title{{\textbf{{{esc(meta.name)}}}\\[0.3em]\normalsize{{{esc(meta.description or '')}}}}}
\date{{\small Last updated: {esc(meta.updated_at[:10])}}}
\begin{{document}}\maketitle\tableofcontents\newpage
"""

def _preamble_tech_report(meta):
    return rf"""\documentclass{{report}}
\usepackage[utf8]{{inputenc}}\usepackage[T1]{{fontenc}}
\usepackage{{geometry}}\geometry{{margin=1in}}
\usepackage{{hyperref}}\hypersetup{{colorlinks=true,linkcolor=blue,urlcolor=blue}}
\usepackage{{booktabs}}\usepackage{{xcolor}}\usepackage{{fancyhdr}}\usepackage{{microtype}}
\pagestyle{{fancy}}\fancyhf{{}}
\lhead{{Technical Report: {esc(meta.name)}}}\rfoot{{\thepage}}
\title{{\textbf{{Technical Report}}\\[1em]\LARGE{{{esc(meta.name)}}}\\[0.5em]\large{{Repository Documentation}}}}
\author{{Generated from GitHub Public Data}}\date{{\today}}
\begin{{document}}\maketitle
\begin{{abstract}}{esc(meta.description or f'Technical report for {meta.name}.')}\end{{abstract}}
\tableofcontents\listoftables\newpage
"""

def _preamble_elegant(meta):
    return rf"""\documentclass{{book}}
\usepackage[utf8]{{inputenc}}\usepackage[T1]{{fontenc}}
\usepackage{{geometry}}\geometry{{margin=1.1in,top=1.3in}}
\usepackage{{hyperref}}\hypersetup{{colorlinks=true,linkcolor=blue,urlcolor=blue}}
\usepackage{{booktabs}}\usepackage{{xcolor}}\usepackage{{microtype}}
\definecolor{{accent}}{{HTML}}{{2E86AB}}
\usepackage{{titlesec}}
\titleformat{{\chapter}}[display]{{\normalfont\huge\bfseries\color{{accent}}}}{{\chaptertitlename\ \thechapter}}{{20pt}}{{\Huge}}
\title{{\textcolor{{accent}}{{\textbf{{{esc(meta.name)}}}}}\\[1em]\Large{{{esc(meta.description or '')}}}}}
\author{{\url{{{esc(meta.url)}}}}}\date{{\today}}
\begin{{document}}\maketitle\tableofcontents\newpage
"""

_PREAMBLES = {
    LatexTemplate.ARTICLE:     _preamble_article,
    LatexTemplate.IEEE:        _preamble_ieee,
    LatexTemplate.ACM:         _preamble_acm,
    LatexTemplate.MINIMAL:     _preamble_minimal,
    LatexTemplate.TECH_REPORT: _preamble_tech_report,
    LatexTemplate.ELEGANT:     _preamble_elegant,
}


def generate_latex_readme(
    analysis_data: Dict[str, Any],
    summary: str,
    template: LatexTemplate,
    custom_sections: Optional[List[CustomSection]] = None,
    include_sections: Optional[List[str]] = None,
    badge_style: str = "flat",
    color_theme: str = "blue",
    user_links: Optional[List[LinkItem]] = None,
) -> Tuple[str, List[str]]:
    meta   = analysis_data["metadata"]
    struct = analysis_data["structure"]
    code   = analysis_data["code_analysis"]

    all_sections: List[Tuple[str, str]] = [
        ("Overview",          _ltx_overview(meta, summary)),
        ("Features",          _ltx_features(struct, code, meta)),
        ("Quickstart",        _ltx_quickstart(meta, code)),
        ("Installation",      _ltx_installation(meta, code, struct)),
        ("Configuration",     _ltx_configuration(code, meta)),
        ("Usage",             _ltx_usage(meta, code)),
    ]
    if code.api_endpoints:
        all_sections.append(("API Reference",  _ltx_api(code)))
    all_sections += [
        ("Testing",              _ltx_testing(code, struct, meta)),
        ("Architecture",         _ltx_architecture(struct, code)),
        ("Languages",            _ltx_languages(code)),
        ("Project Structure",    _ltx_structure(struct)),
        ("Dependencies",         _ltx_dependencies(code)),
        ("Roadmap",              _ltx_roadmap(meta)),
        ("FAQ",                  _ltx_faq(meta, code)),
        ("Changelog",            _ltx_changelog(meta)),
        ("Links & Resources",    _ltx_links(user_links, meta)),
        ("Contributing",         _ltx_contributing(meta)),
        ("Repository Information", _ltx_repo_info(meta)),
        ("License",              _ltx_license(meta)),
    ]

    if include_sections:
        all_sections = [(n, c) for n, c in all_sections if n in include_sections]

    for cs in sorted(custom_sections or [], key=lambda s: s.position):
        pos = min(cs.position, len(all_sections))
        all_sections.insert(pos, (cs.title, _ltx_custom(cs)))

    preamble = _PREAMBLES.get(template, _preamble_article)(meta)
    body     = "\n".join(c for _, c in all_sections)
    doc      = preamble + body + "\n\\end{document}\n"

    return doc, [n for n, _ in all_sections]


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — MARKDOWN SERVICE
# ══════════════════════════════════════════════════════════════════════════════

def _md_is_placeholder(value: str) -> bool:
    return bool(re.match(r"^<.+>$", value.strip()))

def _md_lang_bar(pct: float, width: int = 20) -> str:
    filled = round(pct / 100 * width)
    return "█" * filled + "░" * (width - filled)

def _md_shield(repo: str, kind: str, style: str = "flat", color: str = "blue") -> str:
    return f"![{kind}](https://img.shields.io/github/{kind}/{repo}?style={style}&color={color})"

def _md_install_cmds(meta, code, struct):
    lang = (meta.language or "").lower()
    if "python" in lang:
        return f"""```bash
git clone {meta.url}
cd {meta.name}
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```"""
    if "javascript" in lang or "typescript" in lang:
        return f"```bash\ngit clone {meta.url}\ncd {meta.name}\nnpm install\n```"
    if "go" in lang:
        return f"```bash\ngit clone {meta.url}\ncd {meta.name}\ngo mod download && go build -o {meta.name} .\n```"
    if "rust" in lang:
        return f"```bash\ngit clone {meta.url}\ncd {meta.name}\ncargo build --release\n```"
    return f"```bash\ngit clone {meta.url}\ncd {meta.name}\n```"


def _md_header(meta, badge_style, color):
    stars   = _md_shield(meta.full_name, "stars",   badge_style, color)
    forks   = _md_shield(meta.full_name, "forks",   badge_style, "gray")
    issues  = _md_shield(meta.full_name, "issues",  badge_style, "yellow")
    license = _md_shield(meta.full_name, "license", badge_style, "green")
    lang    = f"![language](https://img.shields.io/github/languages/top/{meta.full_name}?style={badge_style})"
    desc    = meta.description or "No description provided."
    return f"""<div align="center">

# {meta.name}

**{desc}**

{stars} {forks} {issues} {license} {lang}

[View on GitHub]({meta.url}) · [Report Bug]({meta.url}/issues/new) · [Request Feature]({meta.url}/issues/new)

</div>

---
"""

def _md_toc(sections):
    lines = []
    for s in sections:
        anchor = re.sub(r"-+", "-", re.sub(r"[^a-z0-9\s-]", "", s.lower()).replace(" ", "-")).strip("-")
        lines.append(f"- [{s}](#{anchor})")
    return "## Table of Contents\n\n" + "\n".join(lines) + "\n"

def _md_overview(meta, summary):
    topics = " ".join(f"`{t}`" for t in meta.topics) if meta.topics else "_None_"
    return f"""## Overview

{summary}

| | |
|---|---|
| **Repository** | [{meta.full_name}]({meta.url}) |
| **Language** | {meta.language or "Multiple"} |
| **License** | {meta.license or "Not specified"} |
| **Stars** | {meta.stars:,} |
| **Forks** | {meta.forks:,} |
| **Open Issues** | {meta.open_issues} |
| **Created** | {meta.created_at[:10]} |
| **Last Updated** | {meta.updated_at[:10]} |

**Topics:** {topics}
"""

def _md_features(struct, code, meta):
    items = []
    if struct.has_tests:   items.append(f"- ✅ **Tested** — {code.test_framework or 'test'} suite included")
    if struct.has_ci:      items.append("- 🔄 **CI/CD** — Automated build and test pipeline")
    if struct.has_docker:  items.append("- 🐳 **Docker** — Containerisation support")
    if struct.has_docs:    items.append("- 📚 **Documentation** — Included in repository")
    if code.api_endpoints: items.append(f"- 🌐 **REST API** — {len(code.api_endpoints)} endpoint(s) detected")
    if code.environment_variables: items.append(f"- ⚙️ **Configurable** — {len(code.environment_variables)} environment variable(s)")
    if code.build_tool:    items.append(f"- 🔧 **Build Automation** — Uses {code.build_tool}")
    if meta.stars > 100:   items.append(f"- ⭐ **Community** — {meta.stars:,} stars, {meta.forks:,} forks")
    if not items:
        items = ["- 🔓 **Open Source** — Free to use and modify",
                 "- 🤝 **Community Driven** — Contributions welcome"]
    return "## Features\n\n" + "\n".join(items) + "\n"

def _md_quickstart(meta, code):
    lang = (meta.language or "").lower()
    if "python" in lang:
        run = f"python {code.key_modules[0]}" if code.key_modules else "python main.py"
        cmds = f"```bash\ngit clone {meta.url} && cd {meta.name}\npython -m venv venv && source venv/bin/activate\npip install -r requirements.txt\n{run}\n```"
    elif "javascript" in lang or "typescript" in lang:
        cmds = f"```bash\ngit clone {meta.url} && cd {meta.name}\nnpm install && npm start\n```"
    elif "go" in lang:
        cmds = f"```bash\ngit clone {meta.url} && cd {meta.name}\ngo mod download && go run .\n```"
    elif "rust" in lang:
        cmds = f"```bash\ngit clone {meta.url} && cd {meta.name}\ncargo run\n```"
    else:
        cmds = f"```bash\ngit clone {meta.url}\ncd {meta.name}\n```"
    return f"## Quickstart\n\nGet up and running in under 2 minutes:\n\n{cmds}\n\n> See [Installation](#installation) for full setup.\n"

def _md_installation(meta, code, struct):
    lang = (meta.language or "").lower()
    prereqs = ("- Python 3.8+ — https://python.org\n- pip or Poetry" if "python" in lang
               else "- Node.js 16+ — https://nodejs.org" if "javascript" in lang or "typescript" in lang
               else "- Go 1.19+ — https://go.dev" if "go" in lang
               else "- Rust toolchain — https://rustup.rs" if "rust" in lang
               else f"- {meta.language or 'Required runtime'} installed")
    cmds = _md_install_cmds(meta, code, struct)
    docker = ""
    if struct.has_docker:
        docker = f"\n### Docker\n\n```bash\ndocker build -t {meta.name.lower()} .\ndocker run -p 9000:9000 {meta.name.lower()}\n```\n"
    return f"## Installation\n\n### Prerequisites\n\n{prereqs}\n- Git — https://git-scm.com\n\n### Setup\n\n{cmds}\n{docker}"

def _md_configuration(code, meta):
    if not code.environment_variables:
        return f"## Configuration\n\nNo environment variables detected. See [repository docs]({meta.url}).\n"
    env_lines = "\n".join(f"{v}=<enter value>" for v in code.environment_variables[:20])
    rows = "\n".join(f"| `{v}` | `<enter value>` | _See repository docs_ |" for v in code.environment_variables)
    return f"""## Configuration

Create a `.env` file in the project root:

```env
{env_lines}
```

| Variable | Example | Description |
|---|---|---|
{rows}

> ⚠️ Never commit your `.env` file to version control.
"""

def _md_usage(meta, code):
    lang = (meta.language or "").lower()
    if "python" in lang:
        ex = f"```python\nfrom {meta.name.replace('-','_')} import main\nmain()\n```"
    elif "javascript" in lang:
        ex = f"```javascript\nconst app = require('./{meta.name}');\napp();\n```"
    else:
        ex = f"```bash\n# See {meta.url}\n```"
    api_hint = ""
    if code.api_endpoints:
        api_hint = f"\n### API Usage\n\n```bash\ncurl -X GET http://localhost:9000{code.api_endpoints[0]}\n```\nSee [API Reference](#api-reference) for all endpoints."
    return f"## Usage\n\n### Basic Example\n\n{ex}\n{api_hint}\n\nFor more examples visit [{meta.full_name}]({meta.url}).\n"

def _md_api(code):
    if not code.api_endpoints:
        return ""
    rows = "\n".join(f"| `{ep}` | GET | _Auto-detected_ |" for ep in code.api_endpoints)
    return f"## API Reference\n\n| Endpoint | Method | Description |\n|---|---|---|\n{rows}\n\n> 💡 Visit `http://localhost:9000/docs` for interactive Swagger UI.\n"

def _md_testing(code, struct, meta):
    if not struct.has_tests:
        return f"## Testing\n\nNo test suite detected. See [Contributing](#contributing).\n"
    fw = code.test_framework or "test suite"
    if code.test_framework == "pytest":
        cmds = "```bash\npytest\npytest --cov=. --cov-report=html\n```"
    elif code.test_framework == "Jest":
        cmds = "```bash\nnpm test\nnpm test -- --coverage\n```"
    else:
        cmds = "```bash\npython -m unittest discover -v\n```"
    ci = "\n> Tests run automatically on every pull request via CI/CD." if struct.has_ci else ""
    return f"## Testing\n\nThis project uses **{fw}**.\n\n{cmds}\n{ci}\n"

def _md_architecture(struct, code):
    stack   = "\n".join(f"- {s}" for s in struct.detected_stack) or "- Not determined"
    entries = "\n".join(f"- `{e}`" for e in struct.entry_points[:8]) or "- None detected"
    infra   = []
    if struct.has_tests:  infra.append(f"| Tests      | ✅ {code.test_framework or 'Present'} |")
    if struct.has_ci:     infra.append("| CI/CD      | ✅ Configured |")
    if struct.has_docker: infra.append("| Docker     | ✅ Supported |")
    if code.build_tool:   infra.append(f"| Build Tool | {code.build_tool} |")
    infra_table = "\n".join(infra) if infra else "| Standard | Layout |"
    return f"""## Architecture

**Pattern:** `{code.architecture_pattern or "General purpose"}`

### Technology Stack

{stack}

### Entry Points

{entries}

### Infrastructure

| Component | Status |
|---|---|
{infra_table}
"""

def _md_languages(code):
    if not code.languages_breakdown:
        return ""
    rows = "\n".join(f"| {lang} | `{_md_lang_bar(pct)}` | {pct}% |"
                     for lang, pct in list(code.languages_breakdown.items())[:12])
    return f"## Languages\n\n| Language | Distribution | Share |\n|---|---|---|\n{rows}\n"

def _md_structure(struct):
    return f"## Project Structure\n\n**{struct.file_count:,} files** across **{struct.directory_count} directories**\n\n```\n{struct.file_tree[:3000] if struct.file_tree else 'Tree not available'}\n```\n"

def _md_dependencies(code):
    if not code.dependencies:
        return ""
    return "## Dependencies\n\n" + "\n".join(f"- `{d}`" for d in code.dependencies[:40]) + "\n"

def _md_roadmap(meta):
    return f"""## Roadmap

See [open issues]({meta.url}/issues) for planned features and known bugs.

- [ ] Check [milestones]({meta.url}/milestones) for upcoming releases
- [ ] View [project boards]({meta.url}/projects) for work in progress
- [ ] [Suggest a feature]({meta.url}/issues/new?labels=enhancement)
"""

def _md_faq(meta, code):
    items = [
        ("How do I report a bug?", f"Open an issue at [{meta.url}/issues/new]({meta.url}/issues/new)."),
        ("How do I request a feature?", f"Open a feature request at [{meta.url}/issues/new]({meta.url}/issues/new)."),
    ]
    if code.environment_variables:
        items.append(("Where do I configure environment variables?", "Create a `.env` file. See [Configuration](#configuration)."))
    if code.api_endpoints:
        items.append(("Where is the API documentation?", "Start the server and visit `http://localhost:9000/docs`."))
    items.append(("Is this actively maintained?", f"Last updated **{meta.updated_at[:10]}**. See [commit history]({meta.url}/commits)."))
    blocks = "\n\n".join(f"**Q: {q}**\n\n{a}" for q, a in items)
    return f"## FAQ\n\n{blocks}\n"

def _md_changelog(meta):
    return f"## Changelog\n\nSee [{meta.url}/releases]({meta.url}/releases) for full version history.\n"

def _md_links(user_links, meta):
    auto_rows = "\n".join(
        f"| [{label}]({url}) | {desc} |"
        for label, url, desc in [
            ("GitHub Repository", meta.url,                          "Source code"),
            ("Issues",            f"{meta.url}/issues",              "Bug reports and features"),
            ("Pull Requests",     f"{meta.url}/pulls",               "Contribute code"),
            ("Releases",          f"{meta.url}/releases",            "Version history"),
            ("Contributors",      f"{meta.url}/graphs/contributors", "Project contributors"),
        ]
    )
    user_section = ""
    if user_links:
        user_rows = []
        for lnk in user_links:
            label = lnk.label
            url   = lnk.url
            desc  = lnk.description or "—"
            label_md = f"`{label}`" if _md_is_placeholder(label) else label
            url_md   = f"`{url}`"   if _md_is_placeholder(url)   else f"[{url}]({url})"
            desc_md  = f"`{desc}`"  if _md_is_placeholder(desc)  else desc
            user_rows.append(f"| {label_md} | {url_md} | {desc_md} |")
        user_section = "\n### Additional Links\n\n| Label | URL | Description |\n|---|---|---|\n" + "\n".join(user_rows) + "\n"

    return f"## Links & Resources\n\n### Project Links\n\n| Link | Description |\n|---|---|\n{auto_rows}\n{user_section}"

def _md_contributing(meta):
    return f"""## Contributing

Contributions are welcome! 🎉

1. **Fork** [{meta.url}]({meta.url})
2. **Clone**: `git clone https://github.com/<enter your username>/{meta.name}`
3. **Branch**: `git checkout -b feature/<enter feature name>`
4. **Make changes** and write tests
5. **Commit**: `git commit -m "feat: <enter description>"`
6. **Push**: `git push origin feature/<enter feature name>`
7. **Open a Pull Request** at [{meta.url}/pulls]({meta.url}/pulls)

Found a bug? [Open an issue]({meta.url}/issues/new).
"""

def _md_license(meta):
    return f"## License\n\nLicensed under **{meta.license or 'Not specified'}**. See [`LICENSE`]({meta.url}/blob/{meta.default_branch}/LICENSE).\n"

def _md_custom(cs: CustomSection) -> str:
    return f"## {cs.title}\n\n{cs.content}\n"


def generate_md_readme(
    analysis_data: Dict[str, Any],
    summary: str,
    custom_sections: Optional[List[CustomSection]] = None,
    include_sections: Optional[List[str]] = None,
    badge_style: str = "flat",
    color_theme: str = "blue",
    user_links: Optional[List[LinkItem]] = None,
) -> Tuple[str, List[str]]:
    meta   = analysis_data["metadata"]
    struct = analysis_data["structure"]
    code   = analysis_data["code_analysis"]

    all_sections: List[Tuple[str, str]] = [
        ("Overview",          _md_overview(meta, summary)),
        ("Features",          _md_features(struct, code, meta)),
        ("Quickstart",        _md_quickstart(meta, code)),
        ("Installation",      _md_installation(meta, code, struct)),
        ("Configuration",     _md_configuration(code, meta)),
        ("Usage",             _md_usage(meta, code)),
    ]
    if code.api_endpoints:
        all_sections.append(("API Reference", _md_api(code)))
    all_sections += [
        ("Testing",           _md_testing(code, struct, meta)),
        ("Architecture",      _md_architecture(struct, code)),
        ("Languages",         _md_languages(code)),
        ("Project Structure", _md_structure(struct)),
        ("Dependencies",      _md_dependencies(code)),
        ("Roadmap",           _md_roadmap(meta)),
        ("FAQ",               _md_faq(meta, code)),
        ("Changelog",         _md_changelog(meta)),
        ("Links & Resources", _md_links(user_links, meta)),
        ("Contributing",      _md_contributing(meta)),
        ("License",           _md_license(meta)),
    ]

    all_sections = [(n, c) for n, c in all_sections if c.strip()]

    if include_sections:
        all_sections = [(n, c) for n, c in all_sections if n in include_sections]

    for cs in sorted(custom_sections or [], key=lambda s: s.position):
        pos = min(cs.position, len(all_sections))
        all_sections.insert(pos, (cs.title, _md_custom(cs)))

    section_names = [n for n, _ in all_sections]
    header = _md_header(meta, badge_style, color_theme)
    toc    = _md_toc(section_names)
    body   = "\n---\n\n".join(c for _, c in all_sections)
    doc    = header + "\n" + toc + "\n---\n\n" + body

    return doc, section_names


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 8 — ROUTER + ALL ROUTES
# ══════════════════════════════════════════════════════════════════════════════
# Mounted at /readme by backend-ai/main.py. CORS + JWT handled at the top
# level. SecurityMiddleware (defined above) and the startup banner are wired
# in by main.py during its lifespan.

router = APIRouter(tags=["README Generator"])


async def startup_banner():
    """Called from backend-ai/main.py's lifespan."""
    groq_key   = "active" if os.getenv("GROQ_API_KEY")   else "not set (template fallback)"
    github_key = "active" if os.getenv("GITHUB_TOKEN")   else "not set (60 req/hr limit)"
    logger.info("README Generator: Groq=%s  GitHub=%s", groq_key, github_key)
    if not _INDEX_HTML.exists():
        logger.warning("readme_gen index.html missing at %s", _INDEX_HTML)


async def shutdown_cleanup():
    """Called from backend-ai/main.py's lifespan."""
    await session_store.purge_expired()


# ── UI Route — serves index.html at /readme/ ──────────────────────────────────

@router.get("/", include_in_schema=False)
async def serve_ui():
    """
    Serve the README Generator web UI.
    Place index.html in the same directory as main.py.
    """
    if not _INDEX_HTML.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                f"index.html not found at {_INDEX_HTML}. "
                "Place index.html in the same directory as main.py."
            ),
        )
    return FileResponse(str(_INDEX_HTML), media_type="text/html")


# ── Health & Info ──────────────────────────────────────────────────────────────

@router.get("/info", tags=["Info"])
async def api_info():
    """JSON overview of all available endpoints."""
    return {
        "service": "GitHub README Generator API",
        "version": "2.1.0",
        "ui":      "GET /",
        "docs":    "/docs",
        "redoc":   "/redoc",
        "privacy": "No repository data is persisted.",
        "endpoints": {
            "LaTeX auto (JSON)":    "POST /api/v1/readme/auto",
            "LaTeX auto (file)":    "POST /api/v1/readme/auto/raw",
            "Markdown auto (JSON)": "POST /api/v1/markdown/auto",
            "Markdown auto (file)": "POST /api/v1/markdown/auto/raw",
            "Analyze repo":         "POST /api/v1/repo/analyze",
            "Generate LaTeX":       "POST /api/v1/readme/generate",
            "Generate LaTeX raw":   "POST /api/v1/readme/generate/raw",
            "List templates":       "GET  /api/v1/templates/",
            "Rate limit status":    "GET  /rate-limit-status",
            "AI status":            "GET  /ai-status",
            "Session status":       "GET  /api/v1/session/status",
        },
    }

@router.get("/health", tags=["Info"])
async def health():
    return {
        "status": "ok",
        "active_sessions": await session_store.active_count(),
        "ui_available": _INDEX_HTML.exists(),
    }

@router.get("/ai-status", tags=["Info"])
async def ai_status():
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    return {
        "groq": {
            "active":     bool(groq_key),
            "model":      GROQ_MODEL if groq_key else "N/A",
            "status":     "Groq API active" if groq_key else "No GROQ_API_KEY — using template fallback",
            "note":       "Get a free key at https://console.groq.com",
            "free_tier":  "14,400 tokens/min, 1,000 req/day on llama-3.3-70b-versatile",
        }
    }

@router.get("/rate-limit-status", tags=["Info"])
async def rate_limit_status():
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if not token:
        return {"github_token": "not set", "limit": 60, "note": "Set GITHUB_TOKEN in .env for 5000 req/hr"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{GITHUB_API}/rate_limit", headers=_build_github_headers())
            data = resp.json().get("rate", {})
            return {
                "github_token": "active",
                "limit":     data.get("limit", 0),
                "remaining": data.get("remaining", 0),
                "reset_at":  data.get("reset", 0),
            }
    except Exception as e:
        return {"error": str(e)}


# ── Session routes ─────────────────────────────────────────────────────────────

@router.post("/api/v1/session/create", response_model=SessionResponse, tags=["Session"])
async def create_session(request: ConsentRequest):
    token = await session_store.create({
        "repo_url":  request.repo_url,
        "depth":     request.analysis_depth,
        "consented": True,
        "state":     "created",
    })
    return SessionResponse(
        session_token=token,
        message="Session created. Now call POST /api/v1/repo/analyze",
        privacy_notice="No data is stored. Session expires in 1 hour.",
        expires_in_seconds=SESSION_TTL,
    )

@router.delete("/api/v1/session/{token}", tags=["Session"])
async def delete_session(token: str):
    deleted = await session_store.delete(token)
    return {"deleted": deleted}

@router.get("/api/v1/session/status", tags=["Session"])
async def session_status():
    return {"active_sessions": await session_store.active_count()}


# ── Repo analysis ──────────────────────────────────────────────────────────────

@router.post("/api/v1/repo/analyze", response_model=RepoAnalysisResponse, tags=["Repository"])
async def analyze_repository(request: ConsentRequest):
    token = await session_store.create({"state": "analyzing", "consented": True})
    try:
        data    = await analyze_repo(request.repo_url, request.analysis_depth)
        summary = await generate_ai_summary(data)
        await session_store.update(token, {
            "state":    "analyzed",
            "analysis": data,
            "summary":  summary,
            "repo_url": request.repo_url,
        })
        return RepoAnalysisResponse(
            session_token=token,
            repo_url=request.repo_url,
            metadata=data["metadata"],
            structure=data["structure"],
            code_analysis=data["code_analysis"],
            ai_summary=summary,
        )
    except ValueError as e:
        await session_store.delete(token)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await session_store.delete(token)
        logger.error("Analysis failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=str(e))


# ── LaTeX README routes ────────────────────────────────────────────────────────

@router.post("/api/v1/readme/generate", response_model=ReadmeGenerateResponse, tags=["README LaTeX"])
async def generate_readme(request: ReadmeGenerateRequest):
    session = await session_store.get(request.session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    if session.get("state") != "analyzed":
        raise HTTPException(status_code=400, detail="Repo not yet analyzed. Call /api/v1/repo/analyze first.")

    latex_source, sections = generate_latex_readme(
        analysis_data=session["analysis"], summary=session["summary"],
        template=request.template,
        custom_sections=request.custom_sections,
        include_sections=request.include_sections,
        badge_style=request.badge_style,
        color_theme=request.color_theme,
        user_links=request.user_links,
    )
    tmpl_hints = {
        LatexTemplate.ARTICLE:     "pdflatex readme.tex",
        LatexTemplate.IEEE:        "pdflatex readme.tex (requires IEEEtran.cls)",
        LatexTemplate.ACM:         "pdflatex readme.tex (requires acmart.cls)",
        LatexTemplate.MINIMAL:     "pdflatex readme.tex",
        LatexTemplate.TECH_REPORT: "pdflatex readme.tex && pdflatex readme.tex",
        LatexTemplate.ELEGANT:     "pdflatex readme.tex && pdflatex readme.tex",
    }
    return ReadmeGenerateResponse(
        session_token=request.session_token,
        template_used=request.template,
        latex_source=latex_source,
        sections_generated=sections,
        custom_sections_included=len(request.custom_sections or []),
        compilation_hint=tmpl_hints.get(request.template, "pdflatex readme.tex"),
    )

@router.post("/api/v1/readme/generate/raw", tags=["README LaTeX"])
async def generate_readme_raw(request: ReadmeGenerateRequest):
    result = await generate_readme(request)
    repo_name = (await session_store.get(request.session_token) or {}).get("repo_url", "repo").split("/")[-1]
    return PlainTextResponse(
        content=result.latex_source,
        media_type="application/x-tex",
        headers={"Content-Disposition": f'attachment; filename="README_{repo_name}.tex"'},
    )


# ── LaTeX auto pipeline ────────────────────────────────────────────────────────

@router.post("/api/v1/readme/auto", response_model=AutoGenerateResponse, tags=["README LaTeX"])
async def auto_generate_readme(request: AutoGenerateRequest):
    """🚀 One-shot pipeline — send a repo URL, get a LaTeX README back."""
    token = await session_store.create({"state": "auto_pipeline", "consented": True})
    try:
        data    = await analyze_repo(request.repo_url, request.analysis_depth)
        summary = await generate_ai_summary(data)
        await session_store.update(token, {"state": "analyzed", "analysis": data, "summary": summary})

        latex_source, sections = generate_latex_readme(
            analysis_data=data, summary=summary,
            template=request.template,
            custom_sections=request.custom_sections,
            include_sections=request.include_sections,
            badge_style=request.badge_style,
            color_theme=request.color_theme,
            user_links=request.user_links,
        )
        meta   = data["metadata"]
        struct = data["structure"]
        code   = data["code_analysis"]
        tmpl_hints = {
            LatexTemplate.ARTICLE:     "pdflatex readme.tex",
            LatexTemplate.TECH_REPORT: "pdflatex readme.tex && pdflatex readme.tex",
            LatexTemplate.ELEGANT:     "pdflatex readme.tex && pdflatex readme.tex",
        }
        return AutoGenerateResponse(
            session_token=token,
            repo_url=request.repo_url,
            repo_name=meta.full_name,
            repo_description=meta.description,
            stars=meta.stars,
            primary_language=meta.language,
            files_analyzed=struct.file_count,
            detected_stack=struct.detected_stack,
            dependencies_found=len(code.dependencies),
            endpoints_found=len(code.api_endpoints),
            ai_summary=summary,
            template_used=request.template,
            latex_source=latex_source,
            sections_generated=sections,
            custom_sections_included=len(request.custom_sections or []),
            compilation_hint=tmpl_hints.get(request.template, "pdflatex readme.tex"),
        )
    except ValueError as e:
        await session_store.delete(token)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await session_store.delete(token)
        logger.error("Auto-pipeline failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/api/v1/readme/auto/raw", tags=["README LaTeX"])
async def auto_generate_readme_raw(request: AutoGenerateRequest):
    """🚀 One-shot pipeline — downloads .tex file directly."""
    token = await session_store.create({"state": "auto_pipeline_raw", "consented": True})
    try:
        data    = await analyze_repo(request.repo_url, request.analysis_depth)
        summary = await generate_ai_summary(data)
        latex_source, _ = generate_latex_readme(
            analysis_data=data, summary=summary,
            template=request.template,
            custom_sections=request.custom_sections,
            include_sections=request.include_sections,
            badge_style=request.badge_style,
            color_theme=request.color_theme,
            user_links=request.user_links,
        )
        repo_name = data["metadata"].name.lower().replace(" ", "-")
        return PlainTextResponse(
            content=latex_source,
            media_type="application/x-tex",
            headers={"Content-Disposition": f'attachment; filename="README_{repo_name}.tex"'},
        )
    except ValueError as e:
        await session_store.delete(token)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await session_store.delete(token)
        raise HTTPException(status_code=502, detail=str(e))


# ── Markdown auto pipeline ─────────────────────────────────────────────────────

@router.post("/api/v1/markdown/auto", response_model=MdGenerateResponse, tags=["README Markdown"])
async def auto_generate_md(request: MdGenerateRequest):
    """🚀 One-shot pipeline — returns a Markdown README as JSON."""
    token = await session_store.create({"state": "md_pipeline", "consented": True})
    try:
        data    = await analyze_repo(request.repo_url, request.analysis_depth)
        summary = await generate_ai_summary(data)
        await session_store.update(token, {"state": "analyzed", "analysis": data, "summary": summary})

        md_source, sections = generate_md_readme(
            analysis_data=data, summary=summary,
            custom_sections=request.custom_sections,
            include_sections=request.include_sections,
            badge_style=request.badge_style,
            color_theme=request.color_theme,
            user_links=request.user_links,
        )
        meta = data["metadata"]
        return MdGenerateResponse(
            session_token=token,
            repo_url=request.repo_url,
            repo_name=meta.full_name,
            repo_description=meta.description,
            stars=meta.stars,
            primary_language=meta.language,
            files_analyzed=data["structure"].file_count,
            ai_summary=summary,
            markdown_source=md_source,
            sections_generated=sections,
            custom_sections_included=len(request.custom_sections or []),
        )
    except ValueError as e:
        await session_store.delete(token)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await session_store.delete(token)
        logger.error("MD pipeline failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/api/v1/markdown/auto/raw", tags=["README Markdown"])
async def auto_generate_md_raw(request: MdGenerateRequest):
    """🚀 One-shot pipeline — downloads README.md directly."""
    token = await session_store.create({"state": "md_pipeline_raw", "consented": True})
    try:
        data    = await analyze_repo(request.repo_url, request.analysis_depth)
        summary = await generate_ai_summary(data)
        md_source, _ = generate_md_readme(
            analysis_data=data, summary=summary,
            custom_sections=request.custom_sections,
            include_sections=request.include_sections,
            badge_style=request.badge_style,
            color_theme=request.color_theme,
            user_links=request.user_links,
        )
        repo_name = data["metadata"].name.lower().replace(" ", "-")
        return PlainTextResponse(
            content=md_source,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="README_{repo_name}.md"'},
        )
    except ValueError as e:
        await session_store.delete(token)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await session_store.delete(token)
        raise HTTPException(status_code=502, detail=str(e))


# ── Templates ──────────────────────────────────────────────────────────────────

@router.get("/api/v1/templates/", response_model=TemplatesListResponse, tags=["Templates"])
async def list_templates():
    """List all 6 supported LaTeX templates."""
    return TemplatesListResponse(templates=[
        TemplateInfo(id=LatexTemplate.ARTICLE,     name="Article",     description="Standard article with TOC, header/footer",           packages_required=["geometry","hyperref","booktabs","fancyhdr"],   best_for="General documentation"),
        TemplateInfo(id=LatexTemplate.IEEE,        name="IEEE",        description="IEEE double-column conference format",                packages_required=["IEEEtran","hyperref","amsmath"],                best_for="Academic/technical papers"),
        TemplateInfo(id=LatexTemplate.ACM,         name="ACM",         description="ACM SIGCONF format",                                  packages_required=["acmart","booktabs"],                            best_for="Academic submissions"),
        TemplateInfo(id=LatexTemplate.MINIMAL,     name="Minimal",     description="Clean, no-frills layout",                            packages_required=["geometry","hyperref","parskip"],                best_for="Quick reference docs"),
        TemplateInfo(id=LatexTemplate.TECH_REPORT, name="Tech Report", description="Full report with chapters, TOC and list of tables",  packages_required=["report","booktabs","fancyhdr","tocloft"],       best_for="Internal technical reports"),
        TemplateInfo(id=LatexTemplate.ELEGANT,     name="Elegant",     description="Book-style with coloured chapter headings",          packages_required=["book","xcolor","titlesec"],                     best_for="Polished presentations"),
    ])

# Entry point removed — start the unified backend via backend-ai/main.py.