// Project server-state hooks (Track A4) — React Query owns the projects list +
// all mutations. Replaces the fetch/optimistic logic that lived in
// useProjectStore. Recent-projects (a localStorage UI concern) stays in Zustand.
//
// Every mutation is optimistic WITH rollback: onMutate snapshots the cache and
// applies the change immediately; onError restores the snapshot (fixes the old
// "no rollback on failure" gap); onSettled refetches to converge with server.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../services';
import { queryKeys } from '../../lib/queryClient';
import useProjectStore from '../../store/useProjectStore';

/** All projects for the current user. */
export function useProjects(enabled = true) {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: () => projectService.list(),
    enabled,
  });
}

/** A single project (with embedded files). */
export function useProject(id) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => projectService.get(id),
    enabled: !!id,
  });
}

/** Create — optimistic prepend + recents sync. */
export function useCreateProject() {
  const qc = useQueryClient();
  const recordVisit = useProjectStore((s) => s.recordVisit);
  return useMutation({
    mutationFn: (title) => projectService.create(title),
    onSuccess: (newProject) => {
      qc.setQueryData(queryKeys.projects.all, (old = []) => [newProject, ...old]);
      recordVisit(newProject); // keep the localStorage recents list in sync
    },
  });
}

/** Rename — optimistic patch with rollback (+ recents sync). */
export function useRenameProject() {
  const qc = useQueryClient();
  const syncRecentRename = useProjectStore((s) => s.syncRecentRename);
  return useMutation({
    mutationFn: ({ id, title }) => projectService.update(id, { title }),
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects.all });
      const prev = qc.getQueryData(queryKeys.projects.all);
      qc.setQueryData(queryKeys.projects.all, (old = []) =>
        old.map((p) => (p._id === id ? { ...p, title } : p)));
      syncRecentRename(id, title);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.projects.all, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}

/** Delete — optimistic removal with rollback (+ recents sync). */
export function useDeleteProject() {
  const qc = useQueryClient();
  const syncRecentDelete = useProjectStore((s) => s.syncRecentDelete);
  return useMutation({
    mutationFn: (id) => projectService.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.projects.all });
      const prev = qc.getQueryData(queryKeys.projects.all);
      qc.setQueryData(queryKeys.projects.all, (old = []) => old.filter((p) => p._id !== id));
      syncRecentDelete(id);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.projects.all, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}
