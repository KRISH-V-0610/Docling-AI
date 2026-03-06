import React from 'react';
import { Check } from 'lucide-react';
import { cn } from './Button';

export function StepProgress({ currentStep, steps }) {
    return (
        <div className="flex items-center justify-center w-full max-w-3xl mx-auto mb-10">
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;

                return (
                    <React.Fragment key={step}>
                        <div className="flex flex-col items-center relative">
                            <div
                                className={cn(
                                    "w-10 h-10 flex items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-300 z-10",
                                    isActive ? "bg-white border-[var(--color-primary-600)] text-[var(--color-primary-600)] shadow-sm" :
                                        isCompleted ? "bg-[var(--color-primary-600)] border-[var(--color-primary-600)] text-white" :
                                            "bg-white border-[var(--color-surface-300)] text-[var(--color-text-muted)]"
                                )}
                            >
                                {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
                            </div>
                            <span
                                className={cn(
                                    "absolute top-12 text-xs font-medium whitespace-nowrap transition-colors duration-300",
                                    isActive ? "text-[var(--color-primary-600)]" :
                                        isCompleted ? "text-[var(--color-text-main)]" :
                                            "text-[var(--color-text-muted)]"
                                )}
                            >
                                {step}
                            </span>
                        </div>

                        {index < steps.length - 1 && (
                            <div className="flex-1 h-0.5 mx-4 bg-[var(--color-surface-200)] relative top-[-10px]">
                                <div
                                    className="absolute top-0 left-0 h-full bg-[var(--color-primary-500)] transition-all duration-500 ease-in-out"
                                    style={{ width: isCompleted ? '100%' : '0%' }}
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
