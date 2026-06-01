// Empty state shown when a project has no files yet (presentational).
import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import { Button } from '../../components/Button';

export function EmptyState({ uploading, onClick }) {
  return (
    <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl border-2 border-dashed border-[var(--color-primary-200)] rounded-[var(--radius-xl)] p-16 text-center bg-[var(--color-primary-50)]/30 hover:bg-[var(--color-primary-50)]/60 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <div className="w-20 h-20 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <UploadCloud className="w-10 h-10 text-[var(--color-primary-600)]" />
        </div>
        <h3 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">Upload Initial Document</h3>
        <p className="text-[var(--color-text-muted)] font-medium mb-6">
          We support `.txt`, `.md`, `.doc`, `.docx`, and `.tex` unstructured manuscript files.
        </p>
        <Button disabled={uploading} className="shadow-lg bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-900)] text-white">
          {uploading ? "Parsing Document..." : "Select File"}
        </Button>
      </motion.div>
    </div>
  );
}
