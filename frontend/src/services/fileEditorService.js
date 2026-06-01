// DocBot file-editor API (FastAPI /files via NGINX).
import { ENDPOINTS } from '../config/api';
import { request } from './httpClient';

const BASE = ENDPOINTS.fileEditor;

export const fileEditorService = {
  /** GET /documents — list editable documents. */
  listDocuments: () => request({ method: 'get', url: `${BASE}/documents` }),

  /** POST /chat — drive the DocBot editing agent. */
  chat: (message, document) =>
    request({ method: 'post', url: `${BASE}/chat`, data: { message, document } }),
};

export default fileEditorService;
