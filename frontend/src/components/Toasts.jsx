import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from './Button';

const ToastContext = createContext({});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((props) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, ...props }]);

        // Auto dismiss
        if (props.duration !== Infinity) {
            setTimeout(() => {
                removeToast(id);
            }, props.duration || 3000);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}

            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onRemove }) {
    const { title, description, variant = 'default' } = toast;

    const icons = {
        default: <Info className="h-5 w-5 text-[var(--color-text-muted)]" />,
        success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        error: <XCircle className="h-5 w-5 text-red-500" />,
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-floating)] ring-1 ring-black/5"
        >
            <div className="flex w-full items-start p-4">
                <div className="flex-shrink-0 pt-0.5">
                    {icons[variant] || icons.default}
                </div>
                <div className="ml-3 w-0 flex-1">
                    {title && <p className="text-sm font-medium text-[var(--color-text-main)]">{title}</p>}
                    {description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>}
                </div>
                <div className="ml-4 flex flex-shrink-0">
                    <button
                        type="button"
                        className="inline-flex rounded-md bg-white text-gray-400 hover:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-2"
                        onClick={onRemove}
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
