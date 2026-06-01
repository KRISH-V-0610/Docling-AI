// Step 1 — Upload manuscript.
import { useState, useRef } from 'react';
import { ChevronRight, FileText, CloudUpload, X } from 'lucide-react';
import useDeepScanStore from '../../store/useDeepScanStore';
import { StepBar } from './StepNav';

export function UploadStep() {
  const { uploadedFile, setUploadedFile, removeFile, setStep } = useDeepScanStore();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && (f.name.endsWith('.docx') || f.name.endsWith('.pdf'))) {
      setUploadedFile(f);
    } else {
      alert('Please upload a .docx or .pdf file.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-anton font-normal tracking-wide text-[var(--color-text-main)] mb-2">Upload Manuscript</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Upload your <code className="bg-[var(--color-surface-100)] px-1 rounded text-xs">.docx</code> file to begin the automated formatting process.
        </p>
      </div>

      <StepBar currentStep={1} onStepClick={() => { }} disabled={false} />

      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-surface-200)] p-8">
        {!uploadedFile ? (
          <div
            className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${dragging ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]' : 'border-[var(--color-surface-300)] hover:border-[var(--color-surface-400)]'
              }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".docx,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && setUploadedFile(e.target.files[0])} />
            <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center mb-4">
              <CloudUpload className="w-7 h-7 text-[var(--color-primary-600)]" />
            </div>
            <p className="font-semibold text-[var(--color-text-main)]">Drag and drop your manuscript (.docx) or click to upload</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Maximum file size 50MB. Word documents (.docx) preferred.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 bg-[var(--color-primary-50)] rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[var(--color-primary-600)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-text-main)] truncate max-w-xs">{uploadedFile.name}</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <div className="flex gap-3">
              <button onClick={removeFile} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-surface-300)] text-[var(--color-text-main)] bg-white hover:bg-[var(--color-surface-50)]">
                <X className="w-4 h-4" /> Remove
              </button>
              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]">
                Next: Configure <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
