// Zod schema barrel + a tolerant validation helper.
//
// The helper is FAIL-OPEN by design: if an API response doesn't match the
// schema we log a dev warning and still return the raw data, so a backend
// field change never hard-breaks the UI. The schemas document the contract and
// surface drift in the console / tests — they are not a runtime gate.
import { z } from 'zod';

export * from './auth.schema';
export * from './project.schema';
export * from './deepscan.schema';

/**
 * Validate `data` against `schema`. Returns the parsed value on success; on
 * failure logs a warning (labelled) and returns the original data untouched.
 * @template T
 * @param {import('zod').ZodType<T>} schema
 * @param {unknown} data
 * @param {string} [label]
 * @returns {T}
 */
export function parseTolerant(schema, data, label = 'response') {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (import.meta.env?.DEV) {
      console.warn(`[schema] ${label} did not match:`, result.error.issues);
    }
    return data;
  }
  return result.data;
}

export { z };
