import React from 'react';
import { CheckCircle2, Info, X, XCircle, AlertCircle } from 'lucide-react';
import type { ToastMessage } from '../game/types';

export const ToastStack: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style =
          toast.type === 'success'
            ? 'bg-emerald-950 text-emerald-50 border-emerald-700'
            : toast.type === 'error'
              ? 'bg-rose-950 text-rose-50 border-rose-700'
              : toast.type === 'warning'
                ? 'bg-amber-950 text-amber-50 border-amber-700'
                : 'bg-slate-900 text-slate-50 border-slate-700';

        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'error'
              ? XCircle
              : toast.type === 'warning'
                ? AlertCircle
                : Info;

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-lg text-xs sm:text-sm transition-all ${style}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Đóng thông báo"
              className="opacity-70 hover:opacity-100 p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
