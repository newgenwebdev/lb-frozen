"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useToast, type Toast as ToastType } from "@/contexts/ToastContext";

const toastStyles: Record<Exclude<ToastType["type"], "undo">, { bg: string; icon: React.ReactNode; iconBg: string }> = {
  success: {
    bg: "bg-white",
    iconBg: "bg-green-100",
    icon: (
      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: "bg-white",
    iconBg: "bg-red-100",
    icon: (
      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    bg: "bg-white",
    iconBg: "bg-yellow-100",
    icon: (
      <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  info: {
    bg: "bg-white",
    iconBg: "bg-blue-100",
    icon: (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function UndoToastItem({ toast, onRemove }: { toast: ToastType; onRemove: () => void }): React.JSX.Element {
  const handleUndo = (): void => {
    if (toast.onUndo) {
      toast.onUndo();
    }
    onRemove();
  };

  return (
    <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-lg transition-all duration-300 animate-in slide-in-from-right">
      {/* Trash Icon */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100">
        <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>

      {/* Message */}
      <p className="flex-1 font-public text-sm text-gray-800">{toast.message}</p>

      {/* Countdown Circle */}
      {toast.countdown && (
        <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
          <svg className="h-6 w-6 -rotate-90 transform" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="2"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
              strokeDasharray={`${(toast.countdown / 5) * 62.83} 62.83`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute font-geist text-xs font-medium text-gray-600">
            {toast.countdown}
          </span>
        </div>
      )}

      {/* Undo Button */}
      <button
        onClick={handleUndo}
        className="flex flex-shrink-0 items-center gap-1 font-public text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        Undo
      </button>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastType; onRemove: () => void }): React.JSX.Element | null {
  if (toast.type === "undo") {
    return <UndoToastItem toast={toast} onRemove={onRemove} />;
  }

  const style = toastStyles[toast.type];

  return (
    <div
      className={`${style.bg} pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-gray-200 p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-right`}
    >
      <div className={`${style.iconBg} flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full`}>
        {style.icon}
      </div>
      <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
      <button
        onClick={onRemove}
        className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer(): React.ReactPortal | null {
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>,
    document.body
  );
}
