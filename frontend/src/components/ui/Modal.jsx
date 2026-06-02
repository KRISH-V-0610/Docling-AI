// Modal — accessible, focus-trapped dialog (Track B2).
//
// Features: Escape to close, backdrop click to close, body-scroll lock while
// open, focus moves into the dialog on open and is trapped (Tab cycles within),
// and ARIA dialog semantics. Reusable for confirm flows + the Phase I diagram
// upload. Renders via portal so it's never clipped by parent overflow.
//
//   <Modal open={open} onClose={() => setOpen(false)} title="Upload image">
//     ...body...
//   </Modal>
import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, footer, className = '' }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose?.();
      return;
    }
    if (e.key !== 'Tab') return;
    // Focus trap — keep Tab within the panel.
    const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    document.body.style.overflow = 'hidden'; // lock background scroll

    // Move focus into the dialog.
    const t = setTimeout(() => {
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      (nodes && nodes.length ? nodes[0] : panelRef.current)?.focus();
    }, 0);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus?.(); // restore focus on close
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        tabIndex={-1}
        className={`relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--color-surface-200)] outline-none ${className}`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-surface-200)]">
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-100)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--color-surface-200)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
