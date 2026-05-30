import React, { useState } from 'react';
import {
  FileText, Cpu, Bot, Code2, Upload, Search, Settings,
  Database, MessageSquare, Sparkles, ChevronDown, ArrowRight, Layers
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Small presentational helpers
   ───────────────────────────────────────────── */
function StepNode({ icon: Icon, label, sub, num, dim }) {
  return (
    <div className="flex flex-col items-center text-center w-28 shrink-0">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 border-2 ${dim
        ? 'bg-[var(--color-surface-100)] border-[var(--color-surface-200)] text-[var(--color-text-muted)]'
        : 'bg-[var(--color-primary-50)] border-[var(--color-primary-200)] text-[var(--color-primary-600)]'
        }`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs font-bold text-[var(--color-text-main)] leading-tight">{label}</span>
      {sub && <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 leading-tight">{sub}</span>}
    </div>
  );
}

function Arrow({ vertical }) {
  return vertical
    ? <ArrowRight className="w-5 h-5 text-[var(--color-surface-400)] rotate-90 my-1 mx-auto shrink-0" />
    : <ArrowRight className="w-5 h-5 text-[var(--color-surface-400)] shrink-0" />;
}

function FlowRow({ children }) {
  return <div className="flex items-center justify-center gap-2 flex-wrap">{children}</div>;
}

function InfoBox({ children }) {
  return (
    <div className="rounded-xl bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] p-4 text-sm text-[var(--color-text-main)] leading-relaxed">
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Workflow card
   ───────────────────────────────────────────── */
function WorkflowCard({ icon: Icon, title, desc, active, onClick, children }) {
  return (
    <div className={`rounded-2xl border bg-white overflow-hidden transition-all ${active
      ? 'border-[var(--color-primary-300)] shadow-md'
      : 'border-[var(--color-surface-200)] hover:border-[var(--color-surface-300)]'
      }`}>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${active
          ? 'bg-[var(--color-primary-600)] text-white'
          : 'bg-[var(--color-surface-100)] text-[var(--color-text-muted)]'
          }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[var(--color-text-main)]">{title}</h3>
          <p className="text-sm text-[var(--color-text-muted)]">{desc}</p>
        </div>
        <ChevronDown className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform ${active ? 'rotate-180' : ''}`} />
      </button>
      {active && (
        <div className="px-5 pb-6 pt-2 border-t border-[var(--color-surface-100)]">
          {children}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════ */
export function Workflows() {
  const [active, setActive] = useState('deepscan');
  const toggle = (id) => setActive(p => (p === id ? null : id));

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-10">

      {/* ── Hero ──────────────────────────────────── */}
      <div className="text-center space-y-3">
        <h1 className="text-5xl font-anton font-normal tracking-wide text-[var(--color-text-main)]">
          How It Works
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto leading-relaxed">
          A visual guide to every AI workflow in the Docling platform — from raw manuscript to publication-ready output.
        </p>
      </div>

      {/* ── Master pipeline diagram ─────────────────── */}
      <div className="rounded-2xl border border-[var(--color-surface-200)] bg-gradient-to-br from-[var(--color-surface-50)] to-white p-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-6 text-center">
          Complete Platform Pipeline
        </h2>
        <div className="flex flex-col gap-4 items-center">
          <FlowRow>
            <StepNode icon={Upload} label="Upload" sub="DOCX / PDF" />
            <Arrow />
            <StepNode icon={Layers} label="Deep Scan" sub="Format + LaTeX" />
            <Arrow />
            <StepNode icon={Bot} label="DocBot" sub="Edit & Chat" dim />
            <Arrow />
            <StepNode icon={Code2} label="LaTeX" sub="Compile PDF" />
          </FlowRow>
        </div>
      </div>

      {/* ── Workflow cards ────────────────────────── */}
      <div className="space-y-4">
        {/* 1 — Deep Scan (core) */}
        <WorkflowCard
          icon={Layers}
          title="Deep Scan Pipeline"
          desc="Reformat a manuscript to a journal style and emit compilable LaTeX"
          active={active === 'deepscan'} onClick={() => toggle('deepscan')}
        >
          <div className="space-y-5">
            <FlowRow>
              <StepNode num={1} icon={Upload} label="Upload" />
              <Arrow />
              <StepNode num={2} icon={Search} label="Parse" sub="Structure" dim />
              <Arrow />
              <StepNode num={3} icon={FileText} label="Detect" sub="Sections" />
              <Arrow />
              <StepNode num={4} icon={Cpu} label="Format" sub="Agents" />
              <Arrow />
              <StepNode num={5} icon={Code2} label="LaTeX" sub="Output" />
            </FlowRow>
            <InfoBox>
              <strong>Two-stage engine:</strong> a static multi-agent formatter (structure detection · citation formatting · reference list · compliance scoring) followed by LLM-based LaTeX synthesis. The original content is preserved while the layout is restyled.
            </InfoBox>
          </div>
        </WorkflowCard>

        {/* 2 — DocBot */}
        <WorkflowCard
          icon={Bot}
          title="DocBot / Advance Workshop"
          desc="Natural-language editor for your DOCX documents"
          active={active === 'docbot'} onClick={() => toggle('docbot')}
        >
          <div className="space-y-5">
            <FlowRow>
              <StepNode num={1} icon={Upload} label="Upload DOCX" />
              <Arrow />
              <StepNode num={2} icon={MessageSquare} label="Describe Edit" />
              <Arrow />
              <StepNode num={3} icon={Sparkles} label="Agent Applies" sub="23 tools" dim />
              <Arrow />
              <StepNode num={4} icon={FileText} label="Updated Doc" />
            </FlowRow>
            <InfoBox>
              <strong>Advance Workshop features:</strong> Multi-document chat · Local document library · Live preview · Conversation history persisted in localStorage.
            </InfoBox>
          </div>
        </WorkflowCard>

        {/* 3 — Dockyyy */}
        <WorkflowCard
          icon={MessageSquare}
          title="Dockyyy Assistant"
          desc="Research-assistant chatbot for formatting guidance"
          active={active === 'dockyyy'} onClick={() => toggle('dockyyy')}
        >
          <div className="space-y-5">
            <FlowRow>
              <StepNode num={1} icon={MessageSquare} label="Ask" sub="Any question" />
              <Arrow />
              <StepNode num={2} icon={Database} label="Tools + Web" sub="DuckDuckGo" dim />
              <Arrow />
              <StepNode num={3} icon={Bot} label="Guidance" />
            </FlowRow>
            <InfoBox>
              <strong>What it does:</strong> recommends the right tool and workflow, checks conference support, and searches the web for templates and submission guidelines. It guides — it doesn't edit your document directly.
            </InfoBox>
          </div>
        </WorkflowCard>
      </div>

      {/* ── Tech note ──────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-6 text-center">
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          Every workflow is powered by <strong className="text-[var(--color-text-main)]">multi-agent AI pipelines</strong> running on Groq LLMs,
          with <strong className="text-[var(--color-text-main)]">streaming SSE</strong> for real-time progress.
        </p>
      </div>

    </div>
  );
}
