import React, { useState } from 'react';
import {
  Code2, Copy, Check, ExternalLink, Zap, BookOpen,
  FileText, Bot, Cpu, Layers, ChevronDown, ChevronUp
} from 'lucide-react';

/* ── tiny helpers ───────────────────────────────────────── */
function Badge({ children }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[var(--color-surface-200)] text-[var(--color-text-main)] border border-[var(--color-surface-300)]">
      {children}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white opacity-70 hover:opacity-100"
      title="Copy"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ code, lang = 'bash' }) {
  return (
    <div className="relative rounded-xl bg-[#1a1d27] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#12141e] border-b border-white/10">
        <span className="w-3 h-3 rounded-full bg-red-400/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
        <span className="w-3 h-3 rounded-full bg-green-400/70" />
        <span className="ml-2 text-[11px] text-white/40 font-mono">{lang}</span>
      </div>
      <pre className="px-5 py-4 text-sm font-mono text-[#e2e8f0] overflow-x-auto leading-relaxed whitespace-pre-wrap">{code}</pre>
      <CopyButton text={code} />
    </div>
  );
}

function Accordion({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[var(--color-surface-200)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-[var(--color-surface-50)] transition-colors text-left"
      >
        <span className="font-semibold text-[var(--color-text-main)]">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 bg-white border-t border-[var(--color-surface-100)]">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── API Endpoint card ──────────────────────────────────── */
function EndpointCard({ method, path, desc, badge, request, response }) {
  return (
    <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[var(--color-surface-100)] bg-[var(--color-surface-50)]">
        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--color-primary-600)] text-[var(--color-primary-50)]">{method}</span>
        <code className="font-mono text-sm text-[var(--color-text-main)] bg-white border border-[var(--color-surface-200)] px-3 py-1 rounded-lg">{path}</code>
        {badge && <Badge>{badge.label}</Badge>}
        <span className="text-sm text-[var(--color-text-muted)] ml-auto">{desc}</span>
      </div>
      <div className="p-5 space-y-4">
        {request && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Request Body</p>
            <CodeBlock code={request} lang="json" />
          </div>
        )}
        {response && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Response</p>
            <CodeBlock code={response} lang="json" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Feature card ───────────────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col gap-3 p-6 rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="w-11 h-11 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[var(--color-primary-600)]" />
      </div>
      <h3 className="font-bold text-[var(--color-text-main)]">{title}</h3>
      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{desc}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════ */
export function Integrations() {
  const [activeTab, setActiveTab] = useState('python');

  const snippets = {
    python: `import requests

API_BASE = "http://localhost:8000/api/v2"

# Format & reconstruct a manuscript
with open("manuscript.docx", "rb") as f:
    response = requests.post(
        f"{API_BASE}/reconstruct/stream",
        files={"file": f},
        data={
            "format_style": "ieee",
            "custom_rules": "",
            "model": "gemini-2.0-flash"
        },
        stream=True
    )

for line in response.iter_lines():
    if line.startswith(b"data: "):
        import json
        payload = json.loads(line[6:])
        if payload.get("log"):
            print(payload["log"])
        if payload.get("is_final"):
            print("LaTeX:", payload["latex"][:200])
            print("Markdown:", payload["markdown"][:200])`,

    curl: `# 1. Upload & reconstruct a manuscript (streamipcng)
curl -X POST http://localhost:8000/api/v2/reconstruct/stream \\
  -F "file=@manuscript.docx" \\
  -F "format_style=ieee" \\
  -F "model=gemini-2.0-flash" \\
  --no-buffer

# 2. Ask the document chatbot
curl -X POST http://localhost:8000/api/v2/ask \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Summarize the methodology section", "context": "..."}'

# 3. Deep scan pipeline
curl -X POST http://localhost:8090/api/v2/deep-scan/stream \\
  -F "file=@paper.docx" \\
  -F "format_style=apa7" \\
  --no-buffer`,

    js: `const API_BASE = "http://localhost:8000/api/v2";

async function reconstructDocument(file, formatStyle = "ieee") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("format_style", formatStyle);
  formData.append("model", "gemini-2.0-flash");

  const response = await fetch(\`\${API_BASE}/reconstruct/stream\`, {
    method: "POST",
    body: formData,
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (const chunk of buffer.split("\\n\\n")) {
      if (chunk.startsWith("data: ")) {
        const payload = JSON.parse(chunk.slice(6));
        if (payload.log) console.log(payload.log);
        if (payload.is_final) return payload;
      }
    }
  }
}`,
  };

  const tabs = [
    { id: 'python', label: 'Python' },
    { id: 'curl', label: 'cURL' },
    { id: 'js', label: 'JavaScript' },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-12">

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary-600)] text-[var(--color-primary-50)] text-sm font-semibold">
          <Zap className="w-4 h-4" /> Developer API
        </div>
        <h1 className="text-5xl font-anton font-normal tracking-wide text-[var(--color-text-main)]">
          Integrations & API
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto leading-relaxed">
          Embed Docling's document formatting intelligence directly into your research pipelines, submission systems, or academic tools.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Badge>REST API</Badge>
          <Badge>Streaming SSE</Badge>
          <Badge>LLM-Powered</Badge>
          <Badge>LaTeX Output</Badge>
        </div>
      </div>

      {/* ── Feature cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FeatureCard icon={Cpu} title="Reconstruct" desc="Convert DOCX manuscripts into journal-ready LaTeX and Markdown with AI agents." />
        <FeatureCard icon={Bot} title="DocBot" desc="Conversational Q&A on your uploaded documents using RAG-based retrieval." />
        <FeatureCard icon={Layers} title="Deep Scan" desc="6-stage AI pipeline for full document analysis, compliance scoring, and formatting." />
        <FeatureCard icon={FileText} title="README Gen" desc="Auto-generate LaTeX & Markdown READMEs from any public GitHub repository." />
      </div>

      {/* ── Quick start code ──────────────────────────────── */}
      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-anton font-normal tracking-wide text-[var(--color-text-main)]">Quick Start</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Pick your language and start making API calls in minutes.</p>
        </div>

        <div className="flex gap-2 border-b border-[var(--color-surface-200)]">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${activeTab === t.id
                ? 'border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <CodeBlock code={snippets[activeTab]} lang={activeTab === 'js' ? 'javascript' : activeTab} />
      </section>

      {/* ── API Docs ──────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-anton font-normal tracking-wide text-[var(--color-text-main)]">API Reference</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">All endpoints are served from the local FastAPI backends. Base URLs shown below.</p>
        </div>

        {/* Base URLs */}
        <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 space-y-3">
          <h3 className="font-semibold text-[var(--color-text-main)] text-sm uppercase tracking-wide">Base URLs</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm font-mono">
            {[
              { label: 'Reconstruct API', url: 'http://localhost:8000/api/v2' },
              { label: 'Deep Scan Pipeline', url: 'http://localhost:8090/api/v2' },
              { label: 'DocBot / Chat API', url: 'http://localhost:8000/api/v2/' },
              { label: 'README Generator API', url: 'http://localhost:9000/api/v1' },
            ].map(b => (
              <div key={b.url} className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--color-surface-50)] border border-[var(--color-surface-200)]">
                <span className="text-xs text-[var(--color-text-muted)] font-sans font-semibold">{b.label}</span>
                <code className="text-[var(--color-primary-600)]">{b.url}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-4">
          <EndpointCard
            method="POST"
            path="/api/v2/reconstruct/stream"
            desc="Format a manuscript — returns a streaming SSE event stream"
            badge={{ label: 'SSE Stream', color: 'blue' }}
            request={`// multipart/form-data
{
  "file": "<your .docx file>",
  "format_style": "ieee | apa7 | mla | chicago | vancouver",
  "custom_rules": "optional extra instructions",
  "model": "gemini-2.0-flash"
}`}
            response={`// Each SSE event has this shape:
{ "log": "Agent 1: Formatting title page..." }
{ "log": "Agent 6: LaTeX generation complete" }
// Final event:
{
  "is_final": true,
  "latex": "\\\\documentclass{article}...",
  "markdown": "# Title\\n\\n..."
}`}
          />

          <EndpointCard
            method="POST"
            path="/api/v2/ask"
            desc="Conversational chatbot for uploaded documents"
            request={`{
  "query": "What is the abstract of this paper?",
  "context": "optional document text to anchor the query"
}`}
            response={`{
  "response": "The abstract discusses..."
}`}
          />

          <EndpointCard
            method="POST"
            path="/api/v2/deep-scan/stream"
            desc="6-agent deep scan pipeline — compliance + full formatting"
            badge={{ label: 'SSE Stream', color: 'blue' }}
            request={`// multipart/form-data
{
  "file": "<your .docx file>",
  "format_style": "ieee"
}`}
            response={`// Events: agent progress, compliance score, formatted file path
{ "stage": "agent", "agent": 1, "log": "Inspecting document structure..." }
{ "is_final": true, "compliance_score": 0.87, "formatted_file": "output.docx", "latex": "..." }`}
          />

          <EndpointCard
            method="POST"
            path="/api/v1/readme/auto/raw"
            desc="Auto-generate & download a LaTeX README for any GitHub repo"
            badge={{ label: 'Port 9000', color: 'purple' }}
            request={`{
  "repo_url": "https://github.com/owner/repo",
  "user_consents": true,
  "analysis_depth": "standard",
  "template": "article | ieee | acm | minimal | tech_report | elegant"
}`}
            response={`// Returns raw .tex file content as text/plain`}
          />

          <EndpointCard
            method="POST"
            path="/api/v1/markdown/auto"
            desc="Generate a full Markdown README for a GitHub repository"
            badge={{ label: 'Port 9000', color: 'purple' }}
            request={`{
  "repo_url": "https://github.com/owner/repo",
  "user_consents": true,
  "analysis_depth": "standard"
}`}
            response={`{
  "readme": "# My Repo\\n\\n...",
  "sections": ["Overview", "Features", "Installation", ...]
}`}
          />
        </div>
      </section>

      {/* ── Authentication note ───────────────────────────── */}
      <section className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-6 space-y-3">
        <h2 className="text-xl font-anton font-normal tracking-wide text-[var(--color-text-main)] flex items-center gap-2">
          <Code2 className="w-5 h-5 text-[var(--color-primary-600)]" /> Authentication
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          The local APIs currently do not require an API key — they are designed for local research and development use.
          For production deployments, configure your <code className="bg-[var(--color-surface-100)] px-1.5 py-0.5 rounded text-xs font-mono">.env</code> files with appropriate LLM keys:
        </p>
        <CodeBlock lang=".env" code={`# Python/api.py and AgentCode/api.py
GEMINI_API_KEY=your_google_gemini_key
GROQ_API_KEY=your_groq_key

# readme_github
GROQ_API_KEY=your_groq_key
GITHUB_TOKEN=your_github_personal_access_token`} />
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-anton font-normal tracking-wide text-[var(--color-text-main)]">FAQ</h2>
        <div className="space-y-3">
          <Accordion title="Which format styles are supported?">
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              <strong>IEEE</strong>, <strong>APA 7</strong>, <strong>MLA</strong>, <strong>Chicago</strong>, and <strong>Vancouver</strong>.
              Pass one of these as the <code className="bg-[var(--color-surface-100)] px-1 rounded text-xs font-mono">format_style</code> field.
            </p>
          </Accordion>
          <Accordion title="Can I run Docling on my own server?">
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              Yes — all backends are FastAPI apps. Serve them behind nginx or any reverse proxy.
              Remember to set appropriate CORS origins in production.
            </p>
          </Accordion>
          <Accordion title="What file formats are supported for upload?">
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              <code className="bg-[var(--color-surface-100)] px-1 rounded text-xs font-mono">.docx</code> files are the primary supported format.
              PDF support is planned for a future release.
            </p>
          </Accordion>
          <Accordion title="How does the streaming SSE work?">
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              The reconstruct and deep scan endpoints return <strong>Server-Sent Events (SSE)</strong>.
              Each event is a JSON object with a <code className="bg-[var(--color-surface-100)] px-1 rounded text-xs font-mono">log</code> field.
              The final event has <code className="bg-[var(--color-surface-100)] px-1 rounded text-xs font-mono">is_final: true</code> and contains the full output.
            </p>
          </Accordion>
        </div>
      </section>

      {/* ── Footer CTA ────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--color-surface-300)] bg-[var(--color-primary-600)] p-8 text-[var(--color-primary-50)] text-center space-y-4">
        <h2 className="text-3xl font-anton font-normal tracking-wide">Ready to integrate?</h2>
        <p className="opacity-80 max-w-xl mx-auto text-sm leading-relaxed">
          Start with the Quick Start snippets above, or spin up the local API servers and explore the interactive Swagger docs.
        </p>
        <div className="flex justify-center gap-4 flex-wrap pt-2">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-surface-100)] text-[var(--color-text-main)] text-sm font-bold hover:bg-white transition-colors shadow-md"
          >
            <BookOpen className="w-4 h-4" /> Reconstruct API Docs
          </a>
          <a
            href="http://localhost:9000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-[var(--color-primary-50)] border border-white/20 text-sm font-bold hover:bg-white/20 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> README API Docs
          </a>
        </div>
      </div>

    </div>
  );
}
