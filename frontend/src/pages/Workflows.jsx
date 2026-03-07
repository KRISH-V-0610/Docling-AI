import React, { useState } from 'react';
import {
  Upload, Settings, Cpu, Code2, FileText, Download,
  Bot, Scan, Search, Github, ArrowRight, ArrowDown,
  CheckCircle2, Database, Layers, Sparkles, RotateCcw,
  ChevronRight, Shield, MessageSquare
} from 'lucide-react';

/* ── primitives ─────────────────────────────────────────── */
function Arrow({ vertical = false }) {
  return vertical
    ? <div className="flex justify-center my-1"><ArrowDown className="w-5 h-5 text-[var(--color-primary-500)]" /></div>
    : <ArrowRight className="w-5 h-5 text-[var(--color-primary-500)] shrink-0" />;
}

/* All nodes use the same theme — subtle variation via opacity/border */
function StepNode({ icon: Icon, label, sub, num, dim = false }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-2 px-4 py-4 rounded-2xl border min-w-[110px] shadow-sm transition-opacity
        ${dim
          ? 'bg-[var(--color-surface-100)] border-[var(--color-surface-300)] opacity-70'
          : 'bg-white border-[var(--color-surface-200)]'
        }`}
    >
      {num !== undefined && (
        <span className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[var(--color-primary-600)] text-[var(--color-primary-50)] text-[11px] font-bold flex items-center justify-center shadow">
          {num}
        </span>
      )}
      <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-50)] border border-[var(--color-surface-200)] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[var(--color-primary-600)]" />
      </div>
      <span className="text-xs font-bold text-center leading-tight text-[var(--color-text-main)]">{label}</span>
      {sub && <span className="text-[10px] text-center text-[var(--color-text-muted)] leading-tight">{sub}</span>}
    </div>
  );
}

function FlowRow({ children }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {children}
    </div>
  );
}

function SectionBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-primary-600)] text-[var(--color-primary-50)] text-xs font-bold uppercase tracking-wide">
      {children}
    </span>
  );
}

function WorkflowCard({ id, icon: Icon, title, desc, children, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border-2 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer
        ${active ? 'border-[var(--color-primary-500)]' : 'border-[var(--color-surface-200)]'}`}
    >
      {/* header */}
      <div className={`px-6 py-5 flex items-center gap-4 transition-colors
        ${active
          ? 'bg-[var(--color-primary-600)] text-[var(--color-primary-50)]'
          : 'bg-[var(--color-surface-100)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-200)]'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
          ${active ? 'bg-white/20' : 'bg-white border border-[var(--color-surface-300)]'}`}
        >
          <Icon className={`w-6 h-6 ${active ? '' : 'text-[var(--color-primary-600)]'}`} />
        </div>
        <div>
          <h3 className="text-lg font-anton font-normal tracking-wide">{title}</h3>
          <p className={`text-sm ${active ? 'opacity-70' : 'text-[var(--color-text-muted)]'}`}>{desc}</p>
        </div>
        <ChevronRight className={`ml-auto w-5 h-5 transition-transform ${active ? 'rotate-90' : ''}`} />
      </div>

      {/* diagram body */}
      {active && (
        <div className="px-6 py-8 bg-[var(--color-surface-50)]" onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

function AgentPipeline() {
  const agents = [
    { icon: Search, label: 'Structure Analysis' },
    { icon: Settings, label: 'Style Formatter' },
    { icon: Shield, label: 'Compliance Checker' },
    { icon: FileText, label: 'Ref Normalizer' },
    { icon: Sparkles, label:  'Agentic Refiner' },
    { icon: Code2, label: 'LaTeX Generator' },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] text-center">
        6-Agent Processing Pipeline
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {agents.map((a, i) => (
          <React.Fragment key={i}>
            <StepNode icon={a.icon} label={a.label} num={i + 1} dim={i % 2 === 1} />
            {i < agents.length - 1 && <Arrow />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── divider with label ─────────────────────────────────── */
function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-[var(--color-surface-200)]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
      <div className="flex-1 h-px bg-[var(--color-surface-200)]" />
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="mt-4 p-4 rounded-xl bg-[var(--color-primary-50)] border border-[var(--color-surface-200)] text-sm text-[var(--color-text-main)] leading-relaxed">
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════════════ */
export function Workflows() {
  const [active, setActive] = useState('reconstruct');
  const toggle = (id) => setActive(p => p === id ? null : id);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-12">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="text-center space-y-4">
        <SectionBadge><Layers className="w-3.5 h-3.5" /> Platform Workflows</SectionBadge>
        <h1 className="text-5xl font-anton font-normal tracking-wide text-[var(--color-text-main)]">
          How Dockling Works
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto leading-relaxed">
          Four distinct AI-powered workflows that take your manuscript from raw DOCX to publication-ready output.
          Click any workflow to explore the full pipeline.
        </p>
      </div>

      {/* ── Overview diagram ─────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-6 text-center">
          System Architecture Overview
        </p>
        <div className="flex flex-wrap justify-center items-center gap-3">
          <StepNode icon={Upload} label="Upload DOCX" />
          <Arrow />
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <StepNode icon={Cpu} label="Reconstruct" sub="Latex Format" />
              <Arrow />
              <StepNode icon={CheckCircle2} label="Validate" sub="Auto-check" dim />
            </div>
            <div className="flex items-center gap-2">
              <StepNode icon={Scan} label="Deep Scan" sub="6 Agents" dim />
              <Arrow />
              <StepNode icon={Code2} label="LaTeX Editor" sub="Monaco" />
            </div>
          </div>
          <Arrow />
          <StepNode icon={Download} label="Download" />
        </div>

        <Divider label="Supporting Workflows" />

        <div className="flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2">
            <StepNode icon={MessageSquare} label="DocBot" sub="Chat RAG" dim />
            <Arrow />
            <StepNode icon={Bot} label="AI Answer" sub="Agentic" />
          </div>
          <div className="flex items-center gap-2">
            <StepNode icon={Github} label="GitHub Repo" dim />
            <Arrow />
            <StepNode icon={FileText} label="README Gen" sub="LaTeX / MD" />
          </div>
        </div>
      </div>

      {/* ── Workflow cards ────────────────────────────────── */}
      <div className="space-y-4">

        {/* 1 — Reconstruct */}
        <WorkflowCard
          id="reconstruct" icon={Cpu}
          title="Reconstruct Workflow"
          desc="End-to-end document formatting with streaming AI agents"
          active={active === 'reconstruct'} onClick={() => toggle('reconstruct')}
        >
          <div className="space-y-5">
            <FlowRow>
              <StepNode num={1} icon={Upload} label="Upload DOCX" />
              <Arrow />
              <StepNode num={2} icon={Settings} label="Configure Style" sub="IEEE / APA / MLA…" dim />
              <Arrow />
              <StepNode num={3} icon={Cpu} label="AI Processing" sub="SSE stream" />
            </FlowRow>
            <Arrow vertical />
            <FlowRow>
              <StepNode num={4} icon={Code2} label="LaTeX Output" />
              <Arrow />
              <StepNode num={5} icon={FileText} label="Markdown Output" dim />
              <Arrow />
              <StepNode num={6} icon={RotateCcw} label="Auto Upload" sub="to Project" dim />
              <Arrow />
              <StepNode num={7} icon={Download} label="Download" />
            </FlowRow>
            <InfoBox>
              <strong>Key capabilities:</strong> Streaming SSE for live log feedback · Agent powered LaTeX generation · Multi-format output (LaTeX + Markdown) · Auto-saves reconstructed file back to the active project.
            </InfoBox>
          </div>
        </WorkflowCard>

        {/* 2 — Deep Scan */}
        <WorkflowCard
          id="deepscan" icon={Scan}
          title="Deep Scan Workflow"
          desc="6-agent compliance pipeline — upload, format, compile, preview"
          active={active === 'deepscan'} onClick={() => toggle('deepscan')}
        >
          <div className="space-y-5">
            <FlowRow>
              <StepNode num={1} icon={Upload} label="Upload DOCX" />
              <Arrow />
              <StepNode num={2} icon={Settings} label="Configure Style" dim />
              <Arrow />
              <StepNode num={3} icon={Cpu} label="Processing" sub="SSE stream" />
            </FlowRow>
            <Arrow vertical />
            <AgentPipeline />
            <Arrow vertical />
            <FlowRow>
              <StepNode num={8} icon={Code2} label="LaTeX Editor" sub="Monaco IDE" />
              <Arrow />
              <StepNode num={9} icon={FileText} label="PDF Preview" sub="Compile live" dim />
              <Arrow />
              <StepNode num={10} icon={Bot} label="Agent View" sub="DOCX preview" dim />
              <Arrow />
              <StepNode num={11} icon={Download} label="Download" sub="DOCX + LaTeX" />
            </FlowRow>
            <InfoBox>
              <strong>Compliance scoring:</strong> Each agent outputs a normalised score. The final compliance score (0–100%) combines structure, style, references, and formatting checks.
            </InfoBox>
          </div>
        </WorkflowCard>

        {/* 3 — DocBot */}
        <WorkflowCard
          id="docbot" icon={Bot}
          title="DocBot / Advance Workshop"
          desc="RAG-powered conversational assistant for your documents"
          active={active === 'docbot'} onClick={() => toggle('docbot')}
        >
          <div className="space-y-5">
            <FlowRow>
              <StepNode num={1} icon={Upload} label="Upload DOCX" />
              <Arrow />
              <StepNode num={2} icon={Database} label="Vector Store" sub="RAG index" dim />
              <Arrow />
              <StepNode num={3} icon={MessageSquare} label="Ask Question" />
            </FlowRow>
            <Arrow vertical />
            <FlowRow>
              <StepNode num={4} icon={Search} label="Semantic Search" sub="Retrieval" dim />
              <Arrow />
              <StepNode num={5} icon={Sparkles} label="Agentic Doc-Editor" sub="DocBot" />
              <Arrow />
              <StepNode num={6} icon={Bot} label="Streamed Answer" dim />
            </FlowRow>
            <InfoBox>
              <strong>Advance Workshop features:</strong> Multi-document chat · Local document library · GitHub README generation via API · Conversation history persisted in localStorage.
            </InfoBox>
          </div>
        </WorkflowCard>

        {/* 4 — README Generator */}
        <WorkflowCard
          id="readme" icon={Github}
          title="README Generator Workflow"
          desc="Auto-generate LaTeX & Markdown documentation from GitHub"
          active={active === 'readme'} onClick={() => toggle('readme')}
        >
          <div className="space-y-5">
            <FlowRow>
              <StepNode num={1} icon={Github} label="GitHub URL" dim />
              <Arrow />
              <StepNode num={2} icon={Search} label="Repo Analysis" sub="API scrape" />
              <Arrow />
              <StepNode num={3} icon={Sparkles} label="AI Summary" sub="" dim />
            </FlowRow>
            <Arrow vertical />
            <FlowRow>
              <StepNode num={4} icon={Settings} label="Template Select" sub="Article / IEEE…" />
              <Arrow />
              <StepNode num={5} icon={Code2} label="LaTeX README" sub=".tex file" dim />
              <Arrow />
              <StepNode num={6} icon={FileText} label="Markdown README" sub=".md file" />
              <Arrow />
              <StepNode num={7} icon={Download} label="Download" />
            </FlowRow>
            <InfoBox>
              <strong>18 sections generated:</strong> Overview · Features · Quickstart · Installation · Configuration · Usage · API Reference · Testing · Architecture · Languages · Project Structure · Dependencies · Roadmap · FAQ · Changelog · Links · Contributing · License.
            </InfoBox>
          </div>
        </WorkflowCard>

      </div>

      {/* ── Legend ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-6">
        <h3 className="text-sm font-bold text-[var(--color-text-main)] mb-4 uppercase tracking-wide">Legend</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-surface-200)] bg-white text-[var(--color-text-main)]">
            <div className="w-3 h-3 rounded-full bg-[var(--color-primary-600)]" /> Primary step
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-surface-200)] bg-[var(--color-surface-100)] text-[var(--color-text-muted)]">
            <div className="w-3 h-3 rounded-full bg-[var(--color-surface-300)]" /> Secondary / background step
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-text-main)]">
            <div className="w-3 h-3 rounded-full bg-[var(--color-primary-500)]" /> Active / selected workflow
          </div>
        </div>
      </div>

    </div>
  );
}
