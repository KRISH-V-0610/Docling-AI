// Project + File shapes (Express /api/projects). Mirrors backend/models/Project.js
// (projectSchema with embedded fileSchema[]).
import { z } from 'zod';

export const projectFileSchema = z
  .object({
    _id: z.string().optional(),
    originalName: z.string(),
    storedName: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().optional(),
    content: z.string().optional().default(''),
    validationReport: z.array(z.any()).optional().default([]),
  })
  .passthrough();

export const projectSchema = z
  .object({
    _id: z.string(),
    user: z.string().optional(),
    title: z.string(),
    status: z.enum(['Draft', 'Processing', 'Completed']).optional(),
    files: z.array(projectFileSchema).optional().default([]),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const projectListSchema = z.array(projectSchema);
