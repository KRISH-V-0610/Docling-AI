/**
 * Step 1 — Upload
 * Drag-and-drop or click to select a .docx file.
 */
import React, { useRef, useState } from "react";
import usePipelineStore from "../store/usePipelineStore";

export function UploadStep() {
  const { uploadedFile, setUploadedFile, removeFile, setStep } = usePipelineStore();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const accept = ".docx,.pdf";

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && (f.name.endsWith(".docx") || f.name.endsWith(".pdf"))) {
      setUploadedFile(f);
    } else {
      alert("Please upload a .docx or .pdf file.");
    }
  };

  const onFileInput = (e) => {
    if (e.target.files?.[0]) setUploadedFile(e.target.files[0]);
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            dragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onFileInput} />
          <div className="mx-auto w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="font-medium text-gray-800">Drag & drop your manuscript or click to browse</p>
          <p className="text-sm text-gray-500 mt-1">Supports .docx and .pdf — max 50 MB</p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-6">
          <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-800 truncate max-w-xs">{uploadedFile.name}</p>
          <p className="text-sm text-gray-500 mb-6">
            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => removeFile()}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Remove
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Next: Configure →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
