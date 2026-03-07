/**
 * FormatForge Pipeline — API Service Layer
 * All HTTP calls to the backend are centralised here.
 * Teammates: change API_BASE if the backend runs on a different port/host.
 */

const API_BASE = "http://127.0.0.1:8090";

// ─── Health check ───────────────────────────────────────────
export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

// ─── Get available styles ───────────────────────────────────
export async function getStyles() {
  const res = await fetch(`${API_BASE}/api/styles`);
  return res.json();
}

// ─── Stream the full pipeline (SSE) ─────────────────────────
export function streamPipeline(file, style, model, onEvent, onError, onDone) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("style", style);
  formData.append("model", model);

  fetch(`${API_BASE}/api/v2/pipeline/stream`, {
    method: "POST",
    body: formData,
  })
    .then(async (response) => {
      if (!response.body) throw new Error("ReadableStream not supported");
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop();

        for (const chunk of chunks) {
          if (!chunk.trim() || !chunk.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(chunk.substring(6));
            onEvent(payload);
            if (payload.is_final) { onDone(payload); return; }
            if (payload.error)    { onError(payload.error); return; }
          } catch (_) { /* ignore non-JSON lines */ }
        }
      }
      onDone({});
    })
    .catch((err) => onError(err.message));
}

// ─── Download formatted file ────────────────────────────────
export function getDownloadUrl(filename) {
  return `${API_BASE}/api/v2/download/${encodeURIComponent(filename)}`;
}
