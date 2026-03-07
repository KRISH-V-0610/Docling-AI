/**
 * Pipeline Step Progress Bar
 * Reusable horizontal stepper showing circles + connecting line.
 */
import React from "react";

export function PipelineStepBar({ currentStep, steps }) {
  const fill =
    steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div className="relative flex items-center justify-between w-full max-w-xl mx-auto px-4">
      {/* Background track */}
      <div className="absolute left-[12%] right-[12%] top-4 h-1 bg-gray-200 rounded-full z-0 overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-700 ease-in-out"
          style={{ width: `${fill}%` }}
        />
      </div>

      {/* Step circles */}
      {steps.map((label, idx) => {
        const num = idx + 1;
        const active = num === currentStep;
        const done = num < currentStep;
        return (
          <div key={label} className="flex flex-col items-center relative z-10 w-16">
            <div
              className={`w-9 h-9 flex items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 ${
                active
                  ? "bg-white border-indigo-600 text-indigo-600 shadow-md ring-4 ring-indigo-50 scale-110"
                  : done
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-gray-50 border-gray-300 text-gray-400"
              }`}
            >
              {done ? "✓" : num}
            </div>
            <span
              className={`mt-2 text-xs font-semibold whitespace-nowrap ${
                active ? "text-gray-900" : done ? "text-gray-700" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
