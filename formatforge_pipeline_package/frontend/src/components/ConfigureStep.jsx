/**
 * Step 2 — Configure
 * Select target style + LLM model, toggle formatting options.
 */
import React from "react";
import usePipelineStore from "../store/usePipelineStore";

const STYLES = [
  { id: "apa7", label: "APA 7th" },
  { id: "ieee", label: "IEEE" },
  { id: "vancouver", label: "Vancouver" },
  { id: "mla", label: "MLA" },
  { id: "chicago", label: "Chicago" },
];

const MODELS = [
  { id: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "LLaMA-4-Maverick 17B" },
  { id: "qwen/qwen3-32b", label: "Qwen-3 32B" },
];

export function ConfigureStep() {
  const { targetStyle, setTargetStyle, llmModel, setLlmModel, setStep } = usePipelineStore();

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
      {/* Style Selector */}
      <h3 className="text-lg font-bold text-gray-800 mb-3">Target Formatting Style</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-8">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setTargetStyle(s.id)}
            className={`px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
              targetStyle === s.id
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {s.label}
            {targetStyle === s.id && <span className="ml-1">✓</span>}
          </button>
        ))}
      </div>

      {/* LLM Engine */}
      {/* <h3 className="text-lg font-bold text-gray-800 mb-3">LLM Engine (LaTeX Generation)</h3>
      <select
        className="w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={llmModel}
        onChange={(e) => setLlmModel(e.target.value)}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select> */}

      {/* Navigation */}
      <div className="flex justify-between mt-10">
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(3)}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
        >
          Start Processing →
        </button>
      </div>
    </div>
  );
}
