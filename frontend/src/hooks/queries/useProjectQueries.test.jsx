import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { projectService } from '../../services';
import { useProjects, useDeleteProject } from './useProjectQueries';

// Fresh client per test (no retries, no cache bleed).
function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { qc, Wrapper: ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider> };
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('useProjects', () => {
  it('fetches the project list via projectService', async () => {
    vi.spyOn(projectService, 'list').mockResolvedValue([{ _id: '1', title: 'A' }]);
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ _id: '1', title: 'A' }]);
  });
});

describe('useDeleteProject rollback', () => {
  it('optimistically removes then ROLLS BACK on server error', async () => {
    const seed = [{ _id: '1', title: 'A' }, { _id: '2', title: 'B' }];
    const { qc, Wrapper } = wrapper();
    qc.setQueryData(['projects'], seed);
    vi.spyOn(projectService, 'remove').mockRejectedValue({ message: 'boom', status: 500 });
    // onSettled invalidates → a refetch; return the rolled-back list.
    vi.spyOn(projectService, 'list').mockResolvedValue(seed);

    const { result } = renderHook(() => useDeleteProject(), { wrapper: Wrapper });
    await act(async () => { await result.current.mutateAsync('1').catch(() => {}); });

    // After failure, the optimistic removal is undone (item '1' is back).
    await waitFor(() => {
      const data = qc.getQueryData(['projects']);
      expect(data).toHaveLength(2);
      expect(data.find((p) => p._id === '1')).toBeTruthy();
    });
  });
});
