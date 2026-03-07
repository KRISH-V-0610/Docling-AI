# HackaMineD: AI-Powered Research & Manuscript Formatting System

Welcome to **HackaMineD**, a full-stack, AI-agent-powered ecosystem designed to radically simplify the academic and technical writing process. 

HackaMineD takes unstructured manuscripts (PDF, DOCX, TXT), runs them through a sophisticated multi-agent pipeline, and restructures them to strictly adhere to complex publication guidelines (IEEE, ACM, Springer, etc.)—complete with spell checking, document validation, LaTeX compilation, and a helpful research assistant bot.

---

## 🎯 Core Features

1. **Agno Multi-Agent Pipeline (`api.py`)** 🤖
   - **Formatter Agent:** Restructures unstructured text into the exact heading hierarchy and citation style required by the target journal.
   - **Reviewer Agent:** Polishes the output to guarantee academic tone and formatting consistency.
   - **Markdown Agent:** Standardizes the output into clean, reliable Markdown.
   - **LaTeX Converter:** Intelligently converts the resulting Markdown into a 100% compilable, conference-ready LaTeX (`.tex`) document.

2. **Automated Error Checking & Validation** 🛡️
   - **Spell Checker:** Scans the text and generates contextual auto-fix suggestions for misspelled words.
   - **Formatting Validation:** Compares the final output structure against the journal's strict guidelines to generate a **Compliance Score** (0-100%).
   - **Side-by-Side Editor:** The "Validation Area" securely allows users to review the original manuscript alongside the generated Markdown, auto-applying spelling fixes or investigating dropped citations.

3. **LaTeX IDE & PDF Compilation** 📄
   - Contains a built-in code editor for raw `.tex` inspection.
   - Connects to an external compiling API to instantly render your manuscript into a downloadable PDF.
   
4. **Dockyyy: The Interactive Research Assistant** 🦆
   - A floating companion bot seamlessly integrated throughout the app.
   - Built with Groq (Llama-3.3 70b) and integrated with DuckDuckGo.
   - Has native context awareness: On the Validation page, it invisibly reads your current document. Ask it questions like *"Does my methodology section look correct?"* and it will answer based on your actual paper!

5. **Project & File Management Workspace** 🗂️
   - Robust filesystem allowing users to upload `.txt`, `.docx`, and `.pdf` files.
   - Full history state, saving all Original, Reconstructed Markdown, and Generated LaTeX versions.

---

## 🛠️ Tech Stack Architecture

### Frontend (`/frontend`)
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS + Framer Motion for premium micro-animations.
- **State Management:** Zustand (`useAppStore.js`) + React Router for navigation.
- **Editors:** 
  - `react-quill-new` (For Side-by-Side visual Validation)
  - `@uiw/react-md-editor` (For Markdown editing)
  - `monaco-editor` (For raw LaTeX editing)
- **Key Files:**
  - `Process.jsx` - Manages the SSE streaming UI when the agents are running.
  - `ValidationArea.jsx` - The side-by-side reconciliation tool.
  - `ProjectWorkspace.jsx` - File tree and tabbed IDE.
  - `ChatBot.jsx` - The global Dockyyy component.

### Pipeline API (`/Python`)
- **Framework:** FastAPI
- **LLM Orchestration:** `Agno` (Agents, Workflows)
- **LLM Engine:** Groq (Llama-3 & Llama-4-Maverick 17b)
- **Tools:** DuckDuckGo Web Search, PySpellChecker
- **Key Files:**
  - `api.py` - The core engine containing the Agentic Pipeline and the SSE `/reconstruct/stream` endpoint. Also houses the `/ask` endpoint for Dockyyy.
  
### Node Backend (`/backend`)
- **Framework:** Express.js + Node.js
- **Database:** MongoDB (Mongoose)
- **Features:** JWT Authentication, Project CRUD operations, and GridFS/S3 file storage handling.

---

## 🚀 Getting Started

### 1. Start the Node Backend
```bash
cd backend
npm install
npm run dev
# Runs on port 5000 by default. Requires MongoDB and JWT Secrets in .env
```

### 2. Start the AI Python Engine
```bash
cd Python
pip install fastapi uvicorn agno PyPDF2 python-docx pyspellchecker python-dotenv
uvicorn api:app --port 8000 --reload
# Runs on port 8000. Requires GROQ_API_KEY in .env
```

### 3. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on the standard Vite port (e.g. 5173). Connects to API_URL endpoints.
```

---

## 📖 The User Journey

1. **Dashboard:** Start a new job or view history.
2. **Upload:** Drop an unstructured Word doc or PDF file.
3. **Configure:** Select the required target format (e.g. `IEEE`). The LLM intelligently parses your chosen format requirements.
4. **Process:** Watch the magic happen. The pipeline streams Server-Sent Events (SSE) to the UI, showing exactly which agents are formatting, reviewing, and checking your document live.
5. **Validation:** Review the Compliance Score. Use the "Autofix" button to automatically patch spelling errors highlighted by the system.
6. **Workspace / LaTeX:** Jump into the IDE, make final text adjustments, and hit **Compile PDF** to download your publication-ready manuscript!
