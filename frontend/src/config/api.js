// =====================================================================
// Central backend URL configuration (Phase 1 consolidation).
//
// One source of truth for every backend the SPA talks to. Override any
// of these with Vite env vars at build/dev time — see frontend/.env.example.
// =====================================================================

const fromEnv = (key, fallback) => {
  const v = import.meta.env?.[key];
  return v && v.trim() ? v.trim().replace(/\/+$/, '') : fallback;
};

// Service roots. After Phase 2.5 there are only two backends total — Express
// (auth/projects/files) and a unified Python AI service that hosts chatbot,
// reconstruct pipeline, deep-scan, file-editor, and the README generator.
export const API = {
  EXPRESS:   fromEnv('VITE_EXPRESS_URL',   'http://localhost:3000'),
  PYTHON_AI: fromEnv('VITE_PYTHON_AI_URL', 'http://127.0.0.1:8000'),
};

// Endpoint roots — what callers actually import.
export const ENDPOINTS = {
  auth:         `${API.EXPRESS}/api/auth`,
  projects:     `${API.EXPRESS}/api/projects`,
  latexCompile: `${API.EXPRESS}/api/latex-api/compile`,

  // Python AI unified service mounts:
  //   /api/v2/ask                       → Dockyyy chatbot
  //   /deepscan/api/v2/pipeline/stream  → deep-scan (core document→LaTeX engine)
  //   /files/...                        → DocBot DOCX editor agent
  chatbot:      `${API.PYTHON_AI}/api/v2`,
  deepScan:     `${API.PYTHON_AI}/deepscan`,
  fileEditor:   `${API.PYTHON_AI}/files`,
};

// =====================================================================
// Auth helpers (Phase 3). Express signs a JWT on login and the SPA stores
// the raw token under 'token' in localStorage (see useAuthStore.js). The
// Python services share the same secret and verify the same header.
// =====================================================================

export function getAuthToken() {
  try {
    return localStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

/** Returns headers including Bearer auth when a token is available. Use
 *  for fetch() calls — axios uses the global interceptor below. */
export function authHeaders(extra = {}) {
  const t = getAuthToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : extra;
}

// --------------------------------------------------------------------------
// Global axios interceptor — attaches Bearer auth to every axios request
// across the SPA so we don't need per-call-site edits. Runs once on first
// import of this module (which every API caller already does).
// --------------------------------------------------------------------------
import axios from 'axios';

let _axiosInterceptorInstalled = false;
function _installAxiosInterceptor() {
  if (_axiosInterceptorInstalled) return;
  _axiosInterceptorInstalled = true;
  axios.interceptors.request.use((cfg) => {
    if (!cfg.headers?.Authorization && !cfg.headers?.authorization) {
      const t = getAuthToken();
      if (t) {
        cfg.headers = cfg.headers || {};
        cfg.headers.Authorization = `Bearer ${t}`;
      }
    }
    return cfg;
  });
}
_installAxiosInterceptor();

export default ENDPOINTS;
