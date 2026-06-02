import { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Table2,
  Sigma,
  BookMarked,
  FileInput,
  FileDown,
  LayoutTemplate,
  MessageSquare,
  Copy,
  Check,
  Loader2,
  Upload,
} from 'lucide-react';
import { ENDPOINTS, authHeaders } from '../config/api';
import { PageMeta } from '../components/PageMeta';

// ── Small helpers ──────────────────────────────────────────────

const STYLES = ['article', 'ieee', 'acm', 'springer', 'apa'];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeOut({ label, value }) {
  if (!value) return null;
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <CopyButton text={value} />
      </div>
      <pre className="max-h-80 overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
        {value}
      </pre>
    </div>
  );
}

const card = 'rounded-2xl border border-slate-700 bg-slate-800/60 p-5';
const input =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500';
const btn =
  'inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50';

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.log || `Request failed (${res.status})`);
  return data;
}

// ── Tool panels ────────────────────────────────────────────────

function TablePanel() {
  const [data, setData] = useState('Method,Accuracy,F1\nBaseline,0.81,0.79\nOurs,0.93,0.92');
  const [caption, setCaption] = useState('Comparison of results');
  const [hasHeader, setHasHeader] = useState(true);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setBusy(true); setErr(''); setOut('');
    try {
      const r = await postJSON(`${ENDPOINTS.toolkit}/table`, { data, caption, has_header: hasHeader });
      setOut(r.latex);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className={card}>
      <h2 className="mb-1 text-lg font-semibold text-white">Table → LaTeX</h2>
      <p className="mb-4 text-sm text-slate-400">Paste CSV or tab-separated rows and get a clean <code>booktabs</code> table.</p>
      <textarea className={`${input} h-36 font-mono`} value={data} onChange={(e) => setData(e.target.value)} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input className={`${input} flex-1 min-w-[12rem]`} placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
          First row is header
        </label>
        <button className={btn} onClick={run} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Table2 size={16} />} Generate
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
      <CodeOut label="LaTeX" value={out} />
    </div>
  );
}

function EquationPanel() {
  const [desc, setDesc] = useState('sum from i equals 1 to n of i squared');
  const [display, setDisplay] = useState(true);
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setBusy(true); setErr(''); setOut('');
    try {
      const r = await postJSON(`${ENDPOINTS.toolkit}/equation`, { description: desc, display });
      setOut(r.wrapped);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className={card}>
      <h2 className="mb-1 text-lg font-semibold text-white">Equation → LaTeX</h2>
      <p className="mb-4 text-sm text-slate-400">Describe a formula in words (or paste plain math) — get LaTeX math back.</p>
      <input className={input} value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="mt-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={display} onChange={(e) => setDisplay(e.target.checked)} />
          Display (block) equation
        </label>
        <button className={btn} onClick={run} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sigma size={16} />} Convert
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
      <CodeOut label="LaTeX" value={out} />
    </div>
  );
}

function BibtexPanel() {
  const [refs, setRefs] = useState(
    'Smith, J. (2020). A great paper on things. Journal of Things, 5(2), 10-20.\nDoe, A., & Roe, B. (2019). Another study. Science Reports, 3(1), 1-9.'
  );
  const [enrich, setEnrich] = useState(false);
  const [out, setOut] = useState('');
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setBusy(true); setErr(''); setOut(''); setMeta(null);
    try {
      const r = await postJSON(`${ENDPOINTS.toolkit}/bibtex`, { references: refs, enrich });
      setOut(r.bibtex);
      setMeta({ count: r.count, enriched: r.enriched, snippet: r.snippet });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className={card}>
      <h2 className="mb-1 text-lg font-semibold text-white">References → BibTeX</h2>
      <p className="mb-4 text-sm text-slate-400">Paste a reference list — get a <code>.bib</code> file. Enrich looks up DOIs &amp; pages from CrossRef.</p>
      <textarea className={`${input} h-36`} value={refs} onChange={(e) => setRefs(e.target.value)} />
      <div className="mt-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />
          Enrich from CrossRef (slower)
        </label>
        <button className={btn} onClick={run} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <BookMarked size={16} />} Generate .bib
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
      {meta && (
        <p className="mt-3 text-xs text-slate-400">
          Parsed {meta.count} reference(s){meta.enriched ? `, enriched ${meta.enriched} from CrossRef` : ''}.
        </p>
      )}
      <CodeOut label="BibTeX" value={out} />
      {meta?.snippet && <CodeOut label="Preamble snippet" value={meta.snippet} />}
    </div>
  );
}

function ConvertPanel() {
  const [file, setFile] = useState(null);
  const [style, setStyle] = useState('article');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    if (!file) { setErr('Choose a .docx, .pdf, or .txt file first.'); return; }
    setBusy(true); setErr(''); setOut('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('style', style);
      const res = await fetch(`${ENDPOINTS.toolkit}/convert`, {
        method: 'POST', headers: authHeaders(), body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Conversion failed (${res.status})`);
      setOut(data.latex);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className={card}>
      <h2 className="mb-1 text-lg font-semibold text-white">Word / PDF → LaTeX</h2>
      <p className="mb-4 text-sm text-slate-400">Upload a manuscript and get compilable LaTeX (content preserved, no AI rewriting).</p>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-600 bg-slate-900 px-4 py-6 text-sm text-slate-300 hover:border-indigo-500">
        <Upload size={18} />
        <span>{file ? file.name : 'Choose .docx / .pdf / .txt'}</span>
        <input type="file" accept=".docx,.pdf,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <select className={`${input} w-auto`} value={style} onChange={(e) => setStyle(e.target.value)}>
          {STYLES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
        <button className={btn} onClick={run} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <FileInput size={16} />} Convert
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
      <CodeOut label="LaTeX" value={out} />
    </div>
  );
}

function ExportPanel() {
  const [latex, setLatex] = useState(
    '\\documentclass{article}\n\\begin{document}\nHello, world.\n\\end{document}'
  );
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [notes, setNotes] = useState('');

  const run = async (to) => {
    setBusy(to); setErr(''); setNotes('');
    try {
      const res = await fetch(`${ENDPOINTS.toolkit}/export?to=${to}`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ latex }),
      });
      const ctype = res.headers.get('content-type') || '';
      if (res.ok && !ctype.includes('application/json')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document.${to === 'md' ? 'md' : to}`;
        a.click();
        URL.revokeObjectURL(url);
        const n = res.headers.get('X-Latex-Notes');
        if (n) setNotes(n);
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.log || `Export failed (${res.status})`);
      }
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };

  return (
    <div className={card}>
      <h2 className="mb-1 text-lg font-semibold text-white">LaTeX → PDF / DOCX / Markdown</h2>
      <p className="mb-4 text-sm text-slate-400">Paste LaTeX and export. PDF uses tectonic; DOCX/MD use pandoc (server must have them installed).</p>
      <textarea className={`${input} h-48 font-mono`} value={latex} onChange={(e) => setLatex(e.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        {['pdf', 'docx', 'md'].map((to) => (
          <button key={to} className={btn} onClick={() => run(to)} disabled={!!busy}>
            {busy === to ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} {to.toUpperCase()}
          </button>
        ))}
      </div>
      {notes && <p className="mt-3 text-xs text-amber-400">Auto-fixes: {notes}</p>}
      {err && <p className="mt-3 whitespace-pre-wrap text-sm text-rose-400">{err}</p>}
    </div>
  );
}

function TemplatesPanel() {
  const [templates, setTemplates] = useState([]);
  const [active, setActive] = useState(null);
  const [out, setOut] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`${ENDPOINTS.toolkit}/templates`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch((e) => setErr(e.message));
  }, []);

  const load = async (id) => {
    setActive(id); setErr(''); setOut('');
    try {
      const res = await fetch(`${ENDPOINTS.toolkit}/templates/${id}`, { headers: authHeaders() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Failed');
      setOut(d.latex);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className={card}>
      <h2 className="mb-1 text-lg font-semibold text-white">Template Library</h2>
      <p className="mb-4 text-sm text-slate-400">Ready-to-edit starter documents for common journal styles.</p>
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => load(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${active === t.id ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}`}
          >
            {t.name}
          </button>
        ))}
      </div>
      {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
      <CodeOut label={active ? `${active}.tex` : 'Template'} value={out} />
    </div>
  );
}

function AssistantPanel() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! Ask me to make a table, an equation, or a bibliography — or any LaTeX question.' },
  ]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = msg.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setMsg(''); setBusy(true);
    try {
      const r = await postJSON(`${ENDPOINTS.toolkit}/chat`, { message: text });
      setMessages((m) => [...m, { role: 'assistant', text: r.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: `Error: ${e.message}` }]);
    } finally { setBusy(false); }
  };

  return (
    <div className={`${card} flex h-[32rem] flex-col`}>
      <h2 className="mb-3 text-lg font-semibold text-white">LaTeX Assistant</h2>
      <div className="flex-1 space-y-3 overflow-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-200 border border-slate-700'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-slate-400"><Loader2 size={16} className="inline animate-spin" /> thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className={input}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask for a table, equation, bibliography…"
        />
        <button className={btn} onClick={send} disabled={busy}><MessageSquare size={16} /> Send</button>
      </div>
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────

const TOOLS = [
  { id: 'convert', label: 'Word / PDF → LaTeX', icon: FileInput, render: () => <ConvertPanel /> },
  { id: 'table', label: 'Table → LaTeX', icon: Table2, render: () => <TablePanel /> },
  { id: 'equation', label: 'Equation → LaTeX', icon: Sigma, render: () => <EquationPanel /> },
  { id: 'bibtex', label: 'References → BibTeX', icon: BookMarked, render: () => <BibtexPanel /> },
  { id: 'export', label: 'LaTeX → PDF / DOCX / MD', icon: FileDown, render: () => <ExportPanel /> },
  { id: 'templates', label: 'Template Library', icon: LayoutTemplate, render: () => <TemplatesPanel /> },
  { id: 'assistant', label: 'LaTeX Assistant', icon: MessageSquare, render: () => <AssistantPanel /> },
];

export default function LatexToolkit() {
  const [tab, setTab] = useState('convert');
  const current = TOOLS.find((t) => t.id === tab);

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <PageMeta title="LaTeX Toolkit" description="Convert Word/PDF to LaTeX, build tables and equations, generate BibTeX, and export — all in one workbench." />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600/20 p-2.5 text-indigo-300"><Wrench size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">LaTeX Toolkit</h1>
            <p className="text-sm text-slate-400">A one-stop workbench: convert, build, and export LaTeX.</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>

        {current?.render()}
      </div>
    </div>
  );
}
