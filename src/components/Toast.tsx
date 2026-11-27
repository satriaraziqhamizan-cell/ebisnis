import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  jenis: 'sukses' | 'error' | 'info';
  pesan: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-16 right-3 left-3 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none no-print"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const warna =
          t.jenis === 'sukses'
            ? 'bg-emerald-800 text-white border-emerald-700'
            : t.jenis === 'error'
              ? 'bg-rose-700 text-white border-rose-600'
              : 'bg-slate-900 text-white border-slate-700';

        const Ikon =
          t.jenis === 'sukses' ? CheckCircle2 : t.jenis === 'error' ? AlertCircle : Info;

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg ${warna}`}
          >
            <Ikon className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-snug flex-1">{t.pesan}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Tutup pesan"
              className="p-1 -m-1 rounded-lg hover:bg-white/15 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
