// TanStack Query client (Track A4). One instance for the whole app.
//
// Defaults tuned for this SaaS:
//   staleTime 30s  — don't refetch on every mount/focus within 30s (the audit's
//                    "refetch every mount" gap); fresh enough for project lists.
//   retry 1        — one automatic retry on transient failure, then surface it.
//   refetchOnWindowFocus false — avoid surprise refetches while editing.
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Central query-key registry — one source of truth so invalidation never
// mistypes a key. Use like: queryKeys.projects.all / queryKeys.project(id).
export const queryKeys = {
  projects: { all: ['projects'], recent: ['projects', 'recent'] },
  project: (id) => ['project', id],
  documents: ['documents'],
  templates: ['toolkit', 'templates'],
};

export default queryClient;
