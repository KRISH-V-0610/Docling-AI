// App-wide error boundary (Track A1). Catches render-time crashes so one broken
// component shows a recoverable fallback instead of a white screen.
//
// Used two ways:
//   • global — wraps <App> in main.jsx
//   • per-route — wraps each lazy route element in App.jsx (A5) so a crash in one
//     page doesn't take down the shell/nav.
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

function Fallback({ error, resetErrorBoundary }) {
  return (
    <div
      role="alert"
      className="flex min-h-[60vh] items-center justify-center p-6"
    >
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--color-text-main)] mb-1">
          Something went wrong
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-5">
          This part of the app hit an unexpected error. You can try again — your
          work elsewhere is unaffected.
        </p>
        {import.meta.env?.DEV && error?.message && (
          <pre className="mb-5 max-h-32 overflow-auto rounded-lg bg-[var(--color-surface-100)] p-3 text-left text-xs text-red-700 whitespace-pre-wrap">
            {error.message}
          </pre>
        )}
        <Button onClick={resetErrorBoundary} className="gap-2">
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
      </Card>
    </div>
  );
}

/**
 * Wrap any subtree. `onReset`/`resetKeys` are forwarded to react-error-boundary
 * so callers can clear state or re-key on recovery.
 */
export function ErrorBoundary({ children, onReset, resetKeys }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={Fallback}
      onReset={onReset}
      resetKeys={resetKeys}
      onError={(error, info) => {
        // Single place to forward to Sentry later (Phase B4).
        console.error('[ErrorBoundary]', error, info?.componentStack);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

export default ErrorBoundary;
