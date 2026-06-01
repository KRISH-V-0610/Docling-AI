// FormField — a labelled input with optional leading icon + inline error
// (Track B1). RHF-aware: spread a register() result onto it via {...field}.
//
//   <FormField label="Email" icon={Mail} error={errors.email?.message}
//              type="email" placeholder="you@example.com" {...register('email')} />
//
// The error replaces the old toast-for-validation pattern with per-field,
// accessible messages (aria-invalid + role="alert").
import { forwardRef } from 'react';

export const FormField = forwardRef(function FormField(
  { label, icon: Icon, error, className = '', ...inputProps },
  ref,
) {
  const hasError = Boolean(error);
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium text-[var(--color-text-main)]">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-[var(--color-text-muted)]" />
          </div>
        )}
        <input
          ref={ref}
          aria-invalid={hasError}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2 bg-[var(--color-surface-100)] border rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 text-[var(--color-text-main)] transition-colors ${
            hasError
              ? 'border-red-400 focus:ring-red-400'
              : 'border-[var(--color-surface-300)] focus:ring-[var(--color-primary-500)]'
          } ${className}`}
          {...inputProps}
        />
      </div>
      {hasError && (
        <p role="alert" className="text-red-500 text-xs font-medium mt-1">
          {error}
        </p>
      )}
    </div>
  );
});

export default FormField;
