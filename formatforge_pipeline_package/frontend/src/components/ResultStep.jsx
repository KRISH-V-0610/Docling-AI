/**
 * Step 4 — Result
 * Shows compliance score, download link, LaTeX preview, and reset option.
 */
import React, { useState } from "react";
import usePipelineStore from "../store/usePipelineStore";
import { getDownloadUrl } from "../services/pipelineApi";

export function ResultStep() {
  const {
    formattedFile,
    complianceScore,
    latexContent,
    resetPipeline,
  } = usePipelineStore();

  const [latexCopied, setLatexCopied] = useState(false);
  const [showLatex, setShowLatex] = useState(false);

  const scorePct = complianceScore ? Math.round(complianceScore * 100) : null;
  const scoreColor =
    scorePct >= 90 ? "text-green-600" : scorePct >= 70 ? "text-yellow-600" : "text-red-600";
  const scoreBg =
    scorePct >= 90 ? "bg-green-50 border-green-200" : scorePct >= 70 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  const copyLatex = () => {
    if (!latexContent) return;
    navigator.clipboard.writeText(latexContent).then(() => {
      setLatexCopied(true);
      setTimeout(() => setLatexCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-2">🎉</div>
        <h2 className="text-xl font-bold text-gray-800">Formatting Complete</h2>
        <p className="text-sm text-gray-500 mt-1">Your document has been processed through the full pipeline.</p>
      </div>

      {/* Compliance Score */}
      {scorePct !== null && (
        <div className={`rounded-lg border p-5 text-center ${scoreBg}`}>
          <p className="text-sm text-gray-600 mb-1">Compliance Score</p>
          <p className={`text-4xl font-bold ${scoreColor}`}>{scorePct}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {scorePct >= 90
              ? "Excellent — meets formatting standards."
              : scorePct >= 70
              ? "Good — minor formatting issues remain."
              : "Needs review — some rules were not matched."}
          </p>
        </div>
      )}

      {/* Download */}
      {formattedFile && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            {/* doc icon */}
            <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-indigo-800">{formattedFile}</p>
              <p className="text-xs text-indigo-500">Formatted DOCX ready</p>
            </div>
          </div>
          <a
            href={getDownloadUrl(formattedFile)}
            download
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            ⬇ Download
          </a>
        </div>
      )}

      {/* LaTeX Section */}
      {latexContent && (
        <div>
          <button
            onClick={() => setShowLatex(!showLatex)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 bg-gray-100 rounded-lg px-4 py-2 hover:bg-gray-200 transition-colors"
          >
            <span>📄 LaTeX Output</span>
            <span>{showLatex ? "▲ Hide" : "▼ Show"}</span>
          </button>
          {showLatex && (
            <div className="mt-2 relative">
              <button
                onClick={copyLatex}
                className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-white border shadow hover:bg-gray-50"
              >
                {latexCopied ? "✓ Copied" : "Copy"}
              </button>
              <pre className="bg-gray-900 text-green-300 text-xs p-4 pt-8 rounded-lg overflow-x-auto max-h-80 overflow-y-auto border">
                {latexContent}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center pt-2">
        <button
          onClick={resetPipeline}
          className="px-6 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ↺ Format Another Document
        </button>
      </div>
    </div>
  );
}
