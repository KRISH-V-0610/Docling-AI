import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, normalizeError } from './httpClient';
import { authService } from './authService';
import { projectService } from './projectService';

// Spy on the REAL shared instance's request method — request() closes over this
// exact `http`, so spying here intercepts every service call.
let spy;
beforeEach(() => { spy = vi.spyOn(http, 'request'); });
afterEach(() => { spy.mockRestore(); });

describe('authService', () => {
  it('login returns validated { token, user } on success', async () => {
    spy.mockResolvedValue({ data: { token: 't1', user: { username: 'k', email: 'k@x.com' } } });
    const data = await authService.login('k@x.com', 'secret1');
    expect(data.token).toBe('t1');
    expect(data.user.username).toBe('k');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ method: 'post', url: expect.stringContaining('/login') }));
  });

  it('login throws a normalized error on failure', async () => {
    spy.mockRejectedValue({ response: { status: 401, data: { error: 'Bad creds' } } });
    await expect(authService.login('x@y.com', 'nope')).rejects.toMatchObject({ message: 'Bad creds', status: 401 });
  });
});

describe('projectService', () => {
  it('list returns an array of projects', async () => {
    spy.mockResolvedValue({ data: [{ _id: '1', title: 'A', files: [] }] });
    const projects = await projectService.list();
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe('A');
  });

  it('create posts the title and returns the project', async () => {
    spy.mockResolvedValue({ data: { _id: '9', title: 'New' } });
    const p = await projectService.create('New');
    expect(p._id).toBe('9');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ method: 'post', data: { title: 'New' } }));
  });

  it('network error (no response) normalizes to a friendly message', async () => {
    spy.mockRejectedValue({ request: {} });
    await expect(projectService.list()).rejects.toMatchObject({ status: null });
  });
});

describe('normalizeError', () => {
  it('prefers server error → message → detail', () => {
    expect(normalizeError({ response: { status: 500, data: { detail: 'boom' } } }).message).toBe('boom');
  });
  it('timeout maps to a retry message', () => {
    expect(normalizeError({ request: {}, code: 'ECONNABORTED' }).message).toMatch(/timed out/i);
  });
});
