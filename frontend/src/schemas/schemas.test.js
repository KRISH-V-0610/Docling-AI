import { describe, it, expect } from 'vitest';
import {
  authResponseSchema,
  loginFormSchema,
  signupFormSchema,
  projectSchema,
  pipelineFinalSchema,
  parseTolerant,
} from './index';

describe('auth schemas', () => {
  it('accepts a real login response', () => {
    const r = authResponseSchema.safeParse({ token: 'abc', user: { username: 'k', email: 'k@x.com' } });
    expect(r.success).toBe(true);
  });
  it('rejects bad email in loginForm', () => {
    expect(loginFormSchema.safeParse({ email: 'nope', password: 'secret1' }).success).toBe(false);
  });
  it('flags password mismatch in signupForm', () => {
    const r = signupFormSchema.safeParse({
      username: 'kk', email: 'k@x.com', password: 'secret1', confirmPassword: 'secret2',
    });
    expect(r.success).toBe(false);
  });
});

describe('project schema', () => {
  it('accepts a project with embedded files + unknown extra fields', () => {
    const r = projectSchema.safeParse({
      _id: '1', title: 'Doc', files: [{ originalName: 'a.docx' }], somethingNew: true,
    });
    expect(r.success).toBe(true);
  });
});

describe('pipeline final + parseTolerant', () => {
  it('parses the is_final payload', () => {
    const r = pipelineFinalSchema.safeParse({
      is_final: true, latex: '\\documentclass{article}', job: 'job1',
      assets: ['fig1.png'], missing_figures: [{ n: 2, caption: 'chart' }],
    });
    expect(r.success).toBe(true);
  });
  it('parseTolerant returns raw data on mismatch (fail-open)', () => {
    const weird = { totally: 'wrong' };
    expect(parseTolerant(projectSchema, weird, 'test')).toBe(weird);
  });
});
