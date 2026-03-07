"""
FormatForge Pipeline API — Self-Contained Package
==================================================
Full pipeline:  Upload DOCX → Static Formatting (6-agent) → LLM LaTeX Generation → Download
Exposes SSE streaming endpoint: POST /api/pipeline/stream
"""

import os
import sys
import json
import logging
import tempfile
import shutil
from pathlib import Path

# Ensure backend modules resolve relative to this package
PACKAGE_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PACKAGE_ROOT))

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Output dirs ──────────────────────────────────────────────
OUTPUT_DIR = PACKAGE_ROOT / "output"
OUTPUT_FORMATTED_DIR = OUTPUT_DIR / "formatted"
OUTPUT_FORMATTED_DIR.mkdir(parents=True, exist_ok=True)

# Patch backend.config so agents can resolve output dir
os.environ.setdefault("OUTPUT_FORMATTED_DIR", str(OUTPUT_FORMATTED_DIR))

# ── FastAPI app ──────────────────────────────────────────────

app = FastAPI(
    title="FormatForge Pipeline API",
    description="Self-contained formatting pipeline: Upload → Format → LaTeX → Download",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Include the full SSE streaming router ────────────────────
try:
    from backend.agno_router import agno_router
    app.include_router(agno_router)
    logger.info("Full pipeline router loaded (POST /api/v2/pipeline/stream)")
except Exception as exc:
    logger.warning(f"Agno pipeline router not loaded: {exc}")


# ── Health check ─────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "package": "formatforge_pipeline"}


# ── Available styles ─────────────────────────────────────────

@app.get("/api/styles")
def list_styles():
    styles_dir = PACKAGE_ROOT / "backend" / "styles"
    styles = {}
    for f in styles_dir.glob("*.json"):
        styles[f.stem] = f.stem.upper().replace("_", " ")
    return {"available_styles": styles}


# ── Simple (non-streaming) format endpoint ───────────────────

@app.post("/api/format")
async def format_document(
    file: UploadFile = File(...),
    style: str = Form("apa7"),
):
    """Upload a manuscript, select a style, and get a formatted document back."""
    suffix = Path(file.filename or "upload.docx").suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        from backend.agents.orchestrator import Orchestrator
        orchestrator = Orchestrator()
        result = await orchestrator.run(input_path=tmp_path, style_id=style)

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error_message or "Pipeline failed")

        return JSONResponse(content={
            "success": True,
            "output_filename": result.output_filename,
            "compliance_score": result.compliance_report.overall_score if result.compliance_report else None,
            "processing_time_seconds": result.processing_time_seconds,
        })
    finally:
        tmp_path.unlink(missing_ok=True)


# ── Download formatted file ──────────────────────────────────

@app.get("/api/download/{filename}")
def download_file(filename: str):
    """Download a formatted output file."""
    file_path = OUTPUT_FORMATTED_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )


# ── Main entry ───────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  FormatForge Pipeline API — Starting on port 8090")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8090, reload=False)
