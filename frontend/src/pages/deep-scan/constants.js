// Shared constants for the DeepScan wizard (Track A5 decomposition).
import { Upload, Settings, Play, Code2, Bot } from 'lucide-react';

export const STYLES = [
  { id: 'ieee', label: 'IEEE' },
  { id: 'apa7', label: 'APA 7th' },
  { id: 'vancouver', label: 'Vancouver' },
  { id: 'mla', label: 'MLA' },
  { id: 'chicago', label: 'Chicago' },
];

export const STEPS = ['Upload', 'Configure', 'Process', 'LaTeX', 'Agent'];
export const STEP_ICONS = [Upload, Settings, Play, Code2, Bot];

/** Wall-clock timestamp for the process log lines. */
export function now() {
  return new Date().toLocaleTimeString();
}
