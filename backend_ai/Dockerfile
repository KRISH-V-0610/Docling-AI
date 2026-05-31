# ─────────────────────────────────────────────────────────────
# Docling AI — Python / FastAPI backend (backend_ai)
# ─────────────────────────────────────────────────────────────
# STAGE 1: Python base with system tools
FROM python:3.11-slim AS base

# Install curl + tar to fetch tectonic, then remove them to keep the image lean
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl tar pandoc \
    && rm -rf /var/lib/apt/lists/*

# ── Install tectonic (baked into the image at build time) ────
# This runs ONCE when you do `docker compose up --build`.
# Every subsequent `docker compose up` just starts the image — no download.
RUN curl -fsSL \
      https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz \
    | tar xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/tectonic \
    && tectonic --version

# ── Install Python dependencies (also baked in) ──────────────
# Copy ONLY requirements first so Docker can cache this layer.
# If you change requirements.txt → layer re-runs.
# If you only change Python code → this layer is reused (fast rebuild).
WORKDIR /repo
COPY backend_ai/requirements.txt backend_ai/requirements.txt
RUN pip install --no-cache-dir -r backend_ai/requirements.txt

# ── Copy the rest of the source code ─────────────────────────
COPY . .

# ── Runtime ──────────────────────────────────────────────────
EXPOSE 8000
CMD ["python", "-m", "backend_ai.main"]
