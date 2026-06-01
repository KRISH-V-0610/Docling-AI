// DocBot documents list (Track A4) — server state for AdvanceWorkspace.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fileEditorService } from '../../services';
import { queryKeys } from '../../lib/queryClient';

/** GET /files/documents — list of editable documents. */
export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => fileEditorService.listDocuments(),
  });
}

/** Imperative refetch helper for after upload/delete (which use raw axios today). */
export function useInvalidateDocuments() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.documents });
}
