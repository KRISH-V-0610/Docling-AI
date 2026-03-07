# FormatForge Pipeline Package

> Self-contained **Upload → Configure → Process → Download** pipeline.
> Drop the React components into your website and spin up the Python backend.

---

## 📂 Folder Structure

```
formatforge_pipeline_package/
├── api.py                      ← FastAPI entry-point (port 8090)
├── requirements.txt            ← Python dependencies
├── .env                        ← GROQ_API_KEY (ask Harsh for the key)
├── backend/
│   ├── agents/                 ← 6 formatting agents + orchestrator
│   ├── schemas/                ← Pydantic models (DocIR, StyleSpec, …)
│   ├── styles/                 ← JSON style definitions (apa7, ieee, …)
│   ├── llm/                    ← LLM client + prompt templates
│   ├── config.py               ← Global config (paths, env vars)
│   └── agno_router.py          ← SSE streaming router
├── frontend/
│   ├── package.json            ← npm dependencies
│   └── src/
│       ├── index.js            ← Barrel export (use this!)
│       ├── components/
│       │   ├── FormatForgePipeline.jsx   ← **MAIN COMPONENT** — import this
│       │   ├── PipelineStepBar.jsx       ← Step indicator
│       │   ├── UploadStep.jsx            ← Step 1: drag-and-drop upload
│       │   ├── ConfigureStep.jsx         ← Step 2: style & model picker
│       │   ├── ProcessStep.jsx           ← Step 3: live SSE streaming log
│       │   └── ResultStep.jsx            ← Step 4: download & LaTeX view
│       ├── store/
│       │   └── usePipelineStore.js       ← Zustand state
│       └── services/
│           └── pipelineApi.js            ← HTTP/SSE calls to backend
└── output/                     ← (auto-created) formatted files land here
```

---

## 🚀 Quick Start

### 1. Backend

```bash
cd formatforge_pipeline_package

# Create & activate venv (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Make sure .env has GROQ_API_KEY
python api.py
# → Runs on http://127.0.0.1:8090
```

### 2. Frontend — Install Dependencies

```bash
cd frontend
npm install
# This installs zustand (required).
# React + ReactDOM + Tailwind must already be in YOUR project.
```

### 3. Integrate into Your React App

```jsx
// In any page / route:
import { FormatForgePipeline } from "./path-to/formatforge_pipeline_package/frontend/src";

export default function FormatPage() {
  return (
    <div className="max-w-3xl mx-auto py-10">
      <FormatForgePipeline />
    </div>
  );
}
```

That's it. The component handles the full 4-step wizard internally.

---

## ⚙️ Configuration

| What | Where | Default |
|------|-------|---------|
| Backend URL | `frontend/src/services/pipelineApi.js` → `API_BASE` | `http://127.0.0.1:8090` |
| Groq API Key | `.env` → `GROQ_API_KEY` | *(required)* |
| Backend port | `api.py` → bottom | `8090` |
| Available styles | `backend/styles/*.json` | apa7, chicago, ieee, mla, vancouver |

---

## 🔨 Dependencies

### Python (Backend)
- `fastapi`, `uvicorn`, `python-multipart`
- `python-docx`, `pdfplumber`
- `pydantic`
- `agno`, `groq` (LLM for LaTeX)
- `python-dotenv`

### JavaScript (Frontend)
- **Peer dependencies** (must be in your main project): `react >=18`, `react-dom >=18`
- **Required**: `zustand ^4.5`
- **Styling**: Components use Tailwind CSS utility classes. Your project should have Tailwind configured.

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/styles` | List available citation styles |
| `POST` | `/api/v2/pipeline/stream` | **SSE streaming pipeline** (file + style + model) |
| `GET` | `/api/v2/download/{filename}` | Download formatted DOCX |
| `POST` | `/api/format` | Synchronous (non-streaming) format |

### SSE Event Format

```json
{ "stage": 1, "log": "Parsing document...", "stage_complete": null }
{ "stage": 1, "log": "Applied heading rules", "compliance_score": null }
{ "stage": 1, "stage_complete": 1, "formatted_file": "output.docx", "compliance_score": 0.92 }
{ "stage": 2, "log": "Generating LaTeX for section 1..." }
{ "stage": 2, "is_final": true, "latex": "\\documentclass{article}...", "formatted_file": "output.docx" }
```

---

## 🎨 Customisation

- **Theming**: Components use Tailwind classes like `bg-indigo-600`, `text-gray-800`. Override by wrapping in your own container with Tailwind's `@layer` or CSS custom properties.
- **Step bar**: `PipelineStepBar.jsx` is a standalone presentational component you can restyle.
- **Add a new style**: Drop a JSON file in `backend/styles/` following the existing schema.

---

## 💡 Tips

1. The `FormatForgePipeline` component is **fully self-contained** — it manages its own state via Zustand and talks to the backend via `pipelineApi.js`.
2. If you move files, just update the `API_BASE` in `pipelineApi.js`.
3. LaTeX output comes from LLM (Stage 2). If you only need DOCX, Stage 1 alone gives you the formatted document.
4. All icons are **inline SVGs** — no icon library dependency.
