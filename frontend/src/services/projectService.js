// Project API (Express /api/projects). Thin wrapper over request() + schemas.
import { ENDPOINTS } from '../config/api';
import { request } from './httpClient';
import { projectSchema, projectListSchema } from '../schemas';

const BASE = ENDPOINTS.projects;

export const projectService = {
  /** GET / — all projects for the user. */
  list: () =>
    request({ method: 'get', url: BASE }, { schema: projectListSchema, label: 'projects/list' }),

  /** GET /recent — recent projects (server-side). */
  listRecent: () =>
    request({ method: 'get', url: `${BASE}/recent` }, { schema: projectListSchema, label: 'projects/recent' }),

  /** GET /:id — one project (with embedded files). */
  get: (id) =>
    request({ method: 'get', url: `${BASE}/${id}` }, { schema: projectSchema, label: 'projects/get' }),

  /** POST / — create. */
  create: (title) =>
    request({ method: 'post', url: BASE, data: { title } }, { schema: projectSchema, label: 'projects/create' }),

  /** PUT /:id — rename / update. */
  update: (id, patch) =>
    request({ method: 'put', url: `${BASE}/${id}`, data: patch }, { schema: projectSchema, label: 'projects/update' }),

  /** DELETE /:id. */
  remove: (id) =>
    request({ method: 'delete', url: `${BASE}/${id}` }),

  // ── File operations within a project ──
  /** PUT /:id/files/:fileId — save edited file content. */
  saveFile: (id, fileId, content) =>
    request({ method: 'put', url: `${BASE}/${id}/files/${fileId}`, data: { content } }),
};

export default projectService;
