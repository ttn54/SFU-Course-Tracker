import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toastIdCounter = 0;
let globalAddToast: ((message: string, type: ToastType) => void) | null = null;

/** Call from anywhere to show a toast notification */
export function showToast(message: string, type: ToastType = 'error') {
  if (globalAddToast) {
    globalAddToast(message, type);
  }
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    globalAddToast = (message: string, type: ToastType) => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => {
      globalAddToast = null;
    };
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} className="text-green-400 flex-shrink-0" />,
    error: <XCircle size={18} className="text-red-400 flex-shrink-0" />,
    warning: <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0" />,
  };

  const borderColors: Record<ToastType, string> = {
    success: 'border-green-500/40',
    error: 'border-red-500/40',
    warning: 'border-yellow-500/40',
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 bg-dark-card border ${borderColors[toast.type]} rounded-lg shadow-xl animate-slide-in`}
        >
          {icons[toast.type]}
          <span className="text-sm text-gray-200 flex-1">{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-gray-500 hover:text-gray-300 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
