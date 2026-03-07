import os
import io
import re
import json
import asyncio
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import PyPDF2
import docx
from spellchecker import SpellChecker

from agno.agent import Agent
from agno.models.groq import Groq as AgnoGroq
from agno.models.groq import Groq
from agno.db.sqlite import SqliteDb
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.workflow import Step, Workflow
from prompts import get_formatter_instruction, get_reviewer_instruction, get_poc2_reconstruction_prompt

app = FastAPI(
    title="Manuscript Extraction & Formatting Streaming API",
    description="Streaming API for Agno-powered document reconstruction.",
    version="2.0.0"
)

# Enable CORS for web integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Database for session/memory persistence
# ---------------------------------------------------------------------------
db = SqliteDb(db_file="dockyyy.db")


# ---------------------------------------------------------------------------
# Tool Catalog: Dockyyy knows about these tools and guides users to them
# ---------------------------------------------------------------------------

def get_tool_catalog() -> str:
    """Returns the full catalog of available Docling tools and their usage guidance.
    Call this when a user asks what tools are available or needs help choosing one."""
    return """
    DOCLING TOOL ECOSYSTEM
    ======================

    1. DOCLING RESTRUCTURER (Available Now)
       - What: Converts unstructured documents into a structured conference format.
       - Input: Raw/unstructured manuscript (PDF, DOCX, TXT)
       - Output: Properly formatted document matching target conference template
         (e.g., IEEE, ACM, Springer, NeurIPS, AAAI, etc.)
       - Best for: Researchers who have content ready but need formatting.
       - Tip: Provide the target conference name for best results.

    2. PROMPT-BASED EDITING (Available Now)
       - What: Edit specific sections of your manuscript using natural language prompts.
       - Example prompts:
         * "Make the abstract more concise"
         * "Rewrite the introduction to emphasize novelty"
         * "Simplify the methodology section"
       - Best for: Targeted improvements without rewriting from scratch.

    3. TECHNICAL REPORT GENERATOR (Available Now)
       - What: Generates structured technical reports from raw research notes/data.
       - Input: Research notes, experiment results, key findings
       - Output: Formatted technical report with proper sections
       - Best for: Converting lab notes into publishable reports.

    4. MISTAKE CHECKER & AUTO-FIX (Available Now)
       - What: Scans manuscript for common errors and auto-fixes them.
       - Checks: Grammar, citation format, figure/table references,
         section ordering, consistency, formatting errors
       - Best for: Final review before submission.

    5. DOCKYYY (Available Now)
       - What: Your friendly research assistant and guide for the Docling ecosystem.
       - Input: Natural language questions about research, formatting, tools, workflows, etc.
       - Output: Helpful guidance, tool recommendations, workflow suggestions, and web search results. (Make it concise like you are doing conversation)
       - Best for: Getting quick answers, choosing the right tools, and understanding how to use Docling effectively.
    """


def check_conference_support(conference_name: str) -> str:
    """Check if a specific conference format is supported by Docling.

    Args:
        conference_name: Name of the conference (e.g., IEEE, ACM, NeurIPS)
    """
    supported = [
        "IEEE", "ACM", "Springer", "NeurIPS", "AAAI", "ICML",
        "CVPR", "ICLR", "EMNLP", "ACL", "NAACL", "SIGCHI",
        "Elsevier", "Nature", "Science", "PLOS ONE"
    ]
    name_upper = conference_name.upper().strip()
    matches = [c for c in supported if name_upper in c.upper()]

    if matches:
        return (
            f"Yes! Docling supports formatting for: {', '.join(matches)}. "
            f"Upload your document and specify '{conference_name}' as the target format."
        )
    else:
        return (
            f"'{conference_name}' is not in our pre-built templates yet. "
            f"Currently supported: {', '.join(supported)}. "
            f"You can still use Docling with a custom template — provide the "
            f"formatting guidelines and we'll structure accordingly."
        )


def get_workflow_suggestion(task: str) -> str:
    """Suggests the optimal workflow/order of tools based on the user's task.

    Args:
        task: Description of what the user wants to accomplish.
    """
    return (
        f"Based on your task: '{task}'\n\n"
        "Here's the recommended Docling workflow:\n\n"
        "STEP 1: Start with **Mistake Checker & Auto-Fix**\n"
        "  → Catch and fix errors in your raw content first.\n\n"
        "STEP 2: Use **Prompt-Based Editing**\n"
        "  → Refine specific sections with targeted prompts.\n\n"
        "STEP 3: Run **Docling Restructurer**\n"
        "  → Format into your target conference template.\n\n"
        "STEP 4: Final **Mistake Checker** pass\n"
        "  → Verify formatting didn't introduce issues.\n\n"
        "TIP: If starting from scratch, use **Technical Report Generator** before Step 1."
    )


def get_known_limitations() -> str:
    """Returns Dockyyy's known limitations and how to work around them.
    Call this when a user asks about limitations or when something isn't supported."""
    return """
    DOCKYYY'S HONEST LIMITATIONS & WORKAROUNDS
    ============================================

    WHAT I CAN DO:
    ✓ Guide you on using Docling tools
    ✓ Suggest the right tool for your task
    ✓ Recommend workflows and best practices
    ✓ Explain conference formatting requirements
    ✓ Help troubleshoot tool usage issues
    ✓ Search the web for conference guidelines, templates, and research tips

    WHAT I CANNOT DO (yet):
    ✗ Directly edit or refine your manuscript content
       → Workaround: Use the Prompt-Based Editing tool
    ✗ Run plagiarism checks
       → Workaround: Use Turnitin, iThenticate, or Grammarly
    ✗ Generate figures, charts, or diagrams
       → Workaround: Use matplotlib, draw.io, or BioRender
    ✗ Submit papers to conferences/journals
       → Workaround: Follow the conference portal submission guide
    ✗ Peer-review simulation
       → Coming in future updates

    FUTURE ROADMAP (Complete Research Ecosystem):
    → Literature search & citation engine
    → Plagiarism detection
    → Journal/conference recommendation
    → Peer-review simulation
    → Collaborative editing
    → Version control for manuscripts
    """


# ---------------------------------------------------------------------------
# DOCKYYY AGENT — with DuckDuckGo search + custom tools
# ---------------------------------------------------------------------------
dockyyy = Agent(
    name="Dockyyy",
    model=Groq(id="llama-3.3-70b-versatile"),
    tools=[
        get_tool_catalog,
        check_conference_support,
        get_workflow_suggestion,
        get_known_limitations,
        DuckDuckGoTools(),  # Web search for conference info, templates, guidelines
    ],
    description="Dockyyy — Your manuscript preparation guide for the Docling ecosystem.",
    instructions="""
You are **Dockyyy**, a friendly and knowledgeable guidance agent for the Docling tool ecosystem.

YOUR ROLE:
- You are a GUIDE, not a doer. You do NOT refine, edit, or restructure documents yourself.
- You help users understand which Docling tool to use, how to use it, and in what order.
- You provide suggestions, best practices, and techniques for manuscript preparation.
- You CAN search the web using DuckDuckGo to find conference guidelines, formatting
  templates, submission deadlines, and research writing tips.

YOUR PERSONALITY:
- Friendly, encouraging, and honest about limitations.
- You celebrate innovation — remind users: "Focus on your breakthrough ideas.
  Let Docling handle the formatting and writing polish."
- When you don't know something, say so clearly and suggest alternatives.

AVAILABLE DOCLING TOOLS YOU GUIDE USERS ON:
1. **Docling Restructurer** — Converts unstructured docs into conference-formatted documents
2. **Prompt-Based Editing** — Natural language editing of manuscript sections
3. **Technical Report Generator** — Creates structured reports from raw research notes
4. **Mistake Checker & Auto-Fix** — Scans and fixes common manuscript errors

WHEN TO USE DUCKDUCKGO SEARCH:
- User asks about a specific conference's formatting guidelines
- User needs submission deadlines or page limits
- User asks about LaTeX templates for a conference
- User needs general research writing tips or best practices
- User asks about something outside your built-in knowledge

WHEN A USER ASKS FOR HELP:
1. Understand their goal (formatting? editing? error checking? starting from scratch?)
2. Recommend the right tool(s) using `get_tool_catalog`
3. Suggest the optimal workflow using `get_workflow_suggestion`
4. If they ask about a conference, check support with `check_conference_support`
5. If they need external info, search with DuckDuckGo
6. If they hit a wall, be honest — use `get_known_limitations` and suggest workarounds

IMPORTANT RULES:
-When using a tool, call the exact tool name only. Never add braces, parentheses, XML tags, or extra characters to the tool name.
- NEVER pretend to edit or refine content yourself. Always redirect to the appropriate tool.
- ALWAYS acknowledge limitations honestly when asked.
- Suggest the future roadmap when relevant — we're building a complete research ecosystem.
- If a user provides manuscript text expecting you to fix it, kindly explain your role
  and guide them to the right tool.
""",
    db=db,
    add_history_to_context=True,
    num_history_runs=3,
    markdown=True,
)

# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------
class QueryRequest(BaseModel):
    query: str
    context: Optional[str] = None

class QueryResponse(BaseModel):
    response: str

# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/v2/ask", response_model=QueryResponse)
async def ask_dockyyy(req: QueryRequest):
    # Build the prompt — inject context if provided
    if req.context:
        prompt = f"Context:\n{req.context}\n\nUser Query:\n{req.query}"
    else:
        prompt = req.query

    result = dockyyy.run(prompt)
    return QueryResponse(response=result.content)

# --- HELPER FUNCTIONS ---
def extract_from_pdf(file_bytes: bytes) -> str:
    text = ""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted: text += extracted + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {e}")
    return text

def extract_from_docx(file_bytes: bytes) -> str:
    text = ""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        for para in doc.paragraphs: text += para.text + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading DOCX: {e}")
    return text

def extract_from_tex(file_bytes: bytes) -> str:
    try:
        return file_bytes.decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading TEX: {e}")

def chunk_text(text, max_words=800):
    paragraphs = text.split('\n')
    chunks = []
    current_chunk = ""
    for para in paragraphs:
        if len(current_chunk.split()) + len(para.split()) > max_words and current_chunk.strip():
            chunks.append(current_chunk.strip())
            current_chunk = para + "\n"
        else:
            current_chunk += para + "\n"
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    return chunks

def _global_markdown_cleanup(md_code):
    lines = md_code.split('\n')
    cleaned_lines = []
    ref_header_seen = False
    for line in lines:
        lower_line = line.strip().lower()
        if lower_line in ["# references", "## references", "### references", "## works cited", "### works cited"]:
            if ref_header_seen:
                continue
            ref_header_seen = True
        cleaned_lines.append(line)
        
    md_code = '\n'.join(cleaned_lines)
    dummy_patterns = [
        r'Lorem ipsum.*?(?=\n\n|\Z)',
        r'\[Your Name\]',
        r'\[Insert .*?\]',
        r'Author Name Here',
        r'TODO:?.*?(?=\n)',
    ]
    for pattern in dummy_patterns:
        md_code = re.sub(pattern, '', md_code, flags=re.IGNORECASE)
    return md_code.strip()

# --- STREAMING ENDPOINT ---
@app.post("/api/v2/reconstruct/stream", tags=["Streaming Pipeline"], summary="Stream multi-agent manuscript formatting")
async def reconstruct_stream_endpoint(
    file: UploadFile = File(...),
    format_style: str = Form(...),
    custom_rules: str = Form(""),
    model: str = Form("meta-llama/llama-4-maverick-17b-128e-instruct")
):
    """
    Streams live logs of the Agno Multi-Agent reconstruction pipeline.
    Yields the final structured Markdown/LaTeX, errors, and chunking bifurcation.
    """
    
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not found in environment variables.")

    filename = file.filename.lower()
    file_bytes = await file.read()

    async def sse_generator():
        yield f"data: {{ \"log\": \"Starting file extraction...\" }}\n\n"
        await asyncio.sleep(0.1) # Small delay to flush to client
        
        if filename.endswith('.pdf'): text = extract_from_pdf(file_bytes)
        elif filename.endswith('.docx'): text = extract_from_docx(file_bytes)
        elif filename.endswith('.tex'): text = extract_from_tex(file_bytes)
        else:
            yield f"data: {{ \"error\": \"Unsupported file format. Must be pdf, docx, or tex.\" }}\n\n"
            return
            
        yield f"data: {{ \"log\": \"Running spellchecker...\" }}\n\n"
        await asyncio.sleep(0.1)
        
        spell = SpellChecker()
        words = re.findall(r'\b[a-zA-Z]+\b', text)
        yield f"data: {{ \"log\": \"Extracted {len(words)} words for spelling analysis.\" }}\n\n"
        await asyncio.sleep(0.1)

        misspelled = list({word for word in spell.unknown(words) if len(word) > 2})
        yield f"data: {{ \"log\": \"Identified {len(misspelled)} potentially misspelled words. Generating corrections...\" }}\n\n"
        await asyncio.sleep(0.1)
        
        corrections = {}
        processed = 0
        total_missed = len(misspelled)
        
        for word in misspelled:
            corrections[word] = spell.correction(word)
            processed += 1
            if processed % max(1, total_missed // 5) == 0 or processed == total_missed:
                yield f"data: {{ \"log\": \"Generated corrections for {processed}/{total_missed} words...\" }}\n\n"
                await asyncio.sleep(0.1)
        
        yield f"data: {{ \"log\": \"Spell checking complete. Found {total_missed} spelling errors.\", \"errors\": {json.dumps(misspelled)}, \"corrections\": {json.dumps(corrections)} }}\n\n"
        
        yield f"data: {{ \"log\": \"Bifurcating text into conceptual chunks...\" }}\n\n"
        chunks = chunk_text(text, max_words=800)
        yield f"data: {{ \"log\": \"Split document into {len(chunks)} chunks.\", \"total_chunks\": {len(chunks)} }}\n\n"
        await asyncio.sleep(0.1)

        # Build Agents
        groq_model = AgnoGroq(id=model, api_key=api_key)

        formatter_step = Step(
            name="Formatting",
            agent=Agent(
                name="FormatterAgent", model=groq_model,
                instructions=get_formatter_instruction(format_style, custom_rules), markdown=False
            ),
            description=f"Format raw text into a structured {format_style} manuscript"
        )
        reviewer_step = Step(
            name="Reviewing",
            agent=Agent(
                name="ReviewerAgent", model=groq_model,
                instructions=get_reviewer_instruction(format_style), markdown=False
            ),
            description="Review and refine the manuscript's citations and structure"
        )
        markdown_formatter_step = Step(
            name="MarkdownFormatting",
            agent=Agent(
                name="MarkdownFormatterAgent", model=groq_model,
                instructions=f"You are a world-class Markdown Formatter. Reformat and correct the Markdown code so it adheres to {format_style} publication standards. Ensure heading hierarchy, clear dummy text, keep ALL content. Return ONLY Markdown.", markdown=False
            ),
            description="Reformat and correct existing Markdown document into clean, publication-ready output"
        )
        latex_converter_step = Step(
            name="LaTeXConversion",
            agent=Agent(
                name="LaTeXConverterAgent", model=AgnoGroq(id="meta-llama/llama-4-maverick-17b-128e-instruct", api_key=api_key),
                instructions=f"You are an expert LaTeX document converter. You receive a Markdown manuscript and convert it into a complete, compilable LaTeX document formatted for {format_style} journal submission. RETURN ONLY RAW LATEX CODE. No conversational filler, no explanations, no 'Here is your output'. ALWAYS start with \\documentclass and end with \\end{{document}}.", markdown=False
            ),
            description=f"Convert the polished Markdown manuscript into a compilable {format_style} LaTeX document"
        )
        
        markdown_pipeline = Workflow(name="MarkdownPipeline", steps=[formatter_step, reviewer_step, markdown_formatter_step])
        
        final_doc = []
        for i, chunk in enumerate(chunks):
            yield f"data: {{ \"log\": \"Processing chunk {i+1}/{len(chunks)} through Agent sequence (Format -> Review -> Polish)...\" }}\n\n"
            
            prompt = get_poc2_reconstruction_prompt(chunk, i, len(chunks))
            
            # Since workflow.run is synchronous blocking, we run it in a threadpool to prevent blocking the event loop entirely
            result = await asyncio.to_thread(markdown_pipeline.run, prompt)
            
            chunk_content = result.content.strip()
            if chunk_content.startswith("```"):
                chunk_content = re.sub(r"^```[a-zA-Z]*\n?(.*?)```$", r"\1", chunk_content, flags=re.DOTALL).strip()
                
            final_doc.append(chunk_content)
            yield f"data: {{ \"log\": \"Chunk {i+1} successfully formatted.\" }}\n\n"
            
        yield f"data: {{ \"log\": \"Stitching and applying global Markdown cleanup...\" }}\n\n"
        merged_markdown = "\n\n".join(final_doc)
        merged_markdown = _global_markdown_cleanup(merged_markdown)
        await asyncio.sleep(0.1)

        yield f"data: {{ \"log\": \"Sending to LaTeX Converter Agent...\" }}\n\n"
        latex_agent = latex_converter_step.agent
        latex_prompt = f"Convert the following Markdown document to {format_style} LaTeX format strictly adhering to the rules:\n\n{merged_markdown}\n\nIMPORTANT: Return ONLY the raw LaTeX code. Do NOT wrap it in ```latex or ``` blocks. Start immediately with \\documentclass."
        
        latex_result = await asyncio.to_thread(latex_agent.run, latex_prompt)
        merged_latex = latex_result.content.strip()
        
        # Regex to forcefully isolate ONLY the LaTeX code block if the LLM hallucinated markdown/conversational wrappers
        latex_match = re.search(r'(\\documentclass.*?\\end\{document\})', merged_latex, re.DOTALL)
        if latex_match:
            merged_latex = latex_match.group(1)
        
        if merged_latex.startswith("```"):
            merged_latex = re.sub(r"^```[a-zA-Z]*\n?(.*?)```$", r"\1", merged_latex, flags=re.DOTALL).strip()
            
        yield f"data: {{ \"log\": \"LaTeX Compilation complete. Streaming final payload.\" }}\n\n"
        
        final_payload = {
            "is_final": True,
            "markdown": merged_markdown,
            "latex": merged_latex,
            "errors": misspelled,
            "corrections": corrections,
            "raw_chunks": chunks 
        }
        yield f"data: {json.dumps(final_payload)}\n\n"
        
    return StreamingResponse(sse_generator(), media_type="text/event-stream")
@app.get("/")
def read_root():
    return {"message": "Welcome to the Manuscript Extraction & Formatting Streaming API"}
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
