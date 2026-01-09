"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export type ToastType = "success" | "error" | "warning" | "info" | "undo";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onUndo?: () => void;
  countdown?: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  // For order cancellation modal
  orderDetails?: {
    orderId: string;
    paymentMethod?: string;
    paymentTime?: string;
  };
  // For category deletion modal
  categoryDetails?: {
    categoryId: string;
    categoryName: string;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showUndoToast: (message: string, onUndo: () => void, duration?: number) => void;
  removeToast: (id: string) => void;
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const timerRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const countdownRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const showToast = useCallback((message: string, type: ToastType = "info", duration: number = 4000): void => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(id);
      }, duration);
      timerRefs.current.set(id, timer);
    }
  }, []);

  const showUndoToast = useCallback((message: string, onUndo: () => void, duration: number = 5000): void => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const countdownSeconds = Math.ceil(duration / 1000);

    const newToast: Toast = {
      id,
      message,
      type: "undo",
      duration,
      onUndo,
      countdown: countdownSeconds,
    };

    setToasts((prev) => [...prev, newToast]);

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      setToasts((prev) =>
        prev.map((toast) => {
          if (toast.id === id && toast.countdown && toast.countdown > 1) {
            return { ...toast, countdown: toast.countdown - 1 };
          }
          return toast;
        })
      );
    }, 1000);
    countdownRefs.current.set(id, countdownInterval);

    // Auto remove after duration
    const timer = setTimeout(() => {
      removeToast(id);
    }, duration);
    timerRefs.current.set(id, timer);
  }, []);

  const removeToast = useCallback((id: string): void => {
    // Clear timers
    const timer = timerRefs.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRefs.current.delete(id);
    }
    const countdown = countdownRefs.current.get(id);
    if (countdown) {
      clearInterval(countdown);
      countdownRefs.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const confirm = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    const normalizedOptions: ConfirmOptions = typeof options === "string"
      ? { message: options }
      : options;

    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options: normalizedOptions,
        resolve,
      });
    });
  }, []);

  const handleConfirmResponse = useCallback((confirmed: boolean): void => {
    if (confirmState.resolve) {
      confirmState.resolve(confirmed);
    }
    setConfirmState({
      isOpen: false,
      options: null,
      resolve: null,
    });
  }, [confirmState.resolve]);

  const options = confirmState.options;
  const isOrderCancel = options?.orderDetails != null;
  const isCategoryDelete = options?.categoryDetails != null;

  return (
    <ToastContext.Provider value={{ toasts, showToast, showUndoToast, removeToast, confirm }}>
      {children}
      {/* Confirm Dialog */}
      {confirmState.isOpen && options && (
        <div className="fixed inset-0 z-200 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => handleConfirmResponse(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl">
            {/* Close button */}
            <button
              onClick={() => handleConfirmResponse(false)}
              className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-6 pt-8">
              {/* Icon */}
              <div className="mb-4 flex justify-center">
                {isCategoryDelete ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <path d="M47.5 4.42578C49.6415 4.42578 51.6957 5.27576 53.21 6.79004C54.7242 8.30431 55.5742 10.3585 55.5742 12.5V14.4258L67.5 14.4258C68.3154 14.4258 69.0972 14.7496 69.6738 15.3262C70.2504 15.9028 70.5742 16.6846 70.5742 17.5C70.5742 18.3154 70.2504 19.0972 69.6738 19.6738C69.0972 20.2504 68.3154 20.5742 67.5 20.5742H65.5742V65C65.5742 66.4785 64.9868 67.896 63.9414 68.9414C62.896 69.9868 61.4785 70.5742 60 70.5742H20C18.5215 70.5742 17.104 69.9868 16.0586 68.9414C15.0132 67.896 14.4258 66.4785 14.4258 65L14.4258 20.5742H12.5C11.6846 20.5742 10.9028 20.2504 10.3262 19.6738C9.74958 19.0972 9.42578 18.3154 9.42578 17.5L9.42969 17.3477C9.46737 16.5877 9.78559 15.8668 10.3262 15.3262C10.9028 14.7496 11.6846 14.4258 12.5 14.4258H24.4258V12.5C24.4258 10.3585 25.2758 8.30432 26.79 6.79004C28.3043 5.27576 30.3585 4.42578 32.5 4.42578L47.5 4.42578ZM32.5 30.5742C31.9893 30.5742 31.4998 30.7776 31.1387 31.1387C30.7776 31.4998 30.5742 31.9893 30.5742 32.5L30.5742 52.5C30.5742 53.0107 30.7776 53.5002 31.1387 53.8613C31.4998 54.2224 31.9893 54.4258 32.5 54.4258C33.0107 54.4258 33.5002 54.2224 33.8613 53.8613C34.2224 53.5002 34.4258 53.0107 34.4258 52.5V32.5C34.4258 31.9893 34.2224 31.4998 33.8613 31.1387C33.5002 30.7776 33.0107 30.5742 32.5 30.5742ZM47.5 30.5742C46.9893 30.5742 46.4998 30.7776 46.1387 31.1387C45.7776 31.4998 45.5742 31.9893 45.5742 32.5V52.5C45.5742 53.0107 45.7776 53.5002 46.1387 53.8613C46.4998 54.2224 46.9893 54.4258 47.5 54.4258C48.0107 54.4258 48.5002 54.2224 48.8613 53.8613C49.2224 53.5002 49.4258 53.0107 49.4258 52.5V32.5C49.4258 31.9893 49.2224 31.4998 48.8613 31.1387C48.5002 30.7776 48.0107 30.5742 47.5 30.5742ZM32.5 10.5742C31.9893 10.5742 31.4998 10.7776 31.1387 11.1387C30.7776 11.4998 30.5742 11.9893 30.5742 12.5V14.4258H49.4258V12.5C49.4258 11.9893 49.2224 11.4998 48.8613 11.1387C48.5002 10.7776 48.0107 10.5742 47.5 10.5742L32.5 10.5742Z" fill="#D54033" stroke="white" strokeWidth="1.14914"/>
                  </svg>
                ) : isOrderCancel ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#FEF2F2]">
                    <svg className="h-8 w-8 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                ) : options.type === "danger" ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#FEF2F2]">
                    <svg className="h-8 w-8 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                ) : options.type === "warning" ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#FEF3C7]">
                    <svg className="h-8 w-8 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#DBEAFE]">
                    <svg className="h-8 w-8 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="mb-2 text-center font-geist text-xl font-semibold text-[#030712]">
                {options.title || (isCategoryDelete ? "Delete Category" : isOrderCancel ? "Cancel Order" : "Confirm Action")}
              </h3>

              {/* Message */}
              <p className="mb-6 text-center font-public text-sm text-[#6A7282]">
                {options.message}
              </p>

              {/* Category Details (for delete category modal) */}
              {isCategoryDelete && options.categoryDetails && (
                <div className="mb-6 border-t border-[#E5E7EB] pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-public text-sm text-[#6A7282]">Category Id</span>
                      <span className="font-geist text-sm font-medium text-[#030712]">
                        #{options.categoryDetails.categoryId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-public text-sm text-[#6A7282]">Category Name</span>
                      <span className="font-geist text-sm font-medium text-[#030712]">
                        {options.categoryDetails.categoryName}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Details (for cancel order modal) */}
              {isOrderCancel && options.orderDetails && (
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-public text-sm text-[#6A7282]">Order Id</span>
                    <span className="font-geist text-sm font-medium text-[#030712]">
                      #{options.orderDetails.orderId}
                    </span>
                  </div>
                  {options.orderDetails.paymentMethod && (
                    <div className="flex items-center justify-between">
                      <span className="font-public text-sm text-[#6A7282]">Payment Method</span>
                      <span className="font-geist text-sm font-medium text-[#030712]">
                        {options.orderDetails.paymentMethod}
                      </span>
                    </div>
                  )}
                  {options.orderDetails.paymentTime && (
                    <div className="flex items-center justify-between">
                      <span className="font-public text-sm text-[#6A7282]">Payment Time</span>
                      <span className="font-geist text-sm font-medium text-[#030712]">
                        {options.orderDetails.paymentTime}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirmResponse(false)}
                  className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 font-public text-sm font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
                >
                  {options.cancelText || "Cancel"}
                </button>
                <button
                  onClick={() => handleConfirmResponse(true)}
                  className={`flex-1 rounded-lg px-4 py-3 font-public text-sm font-medium text-white transition-colors ${
                    isCategoryDelete || isOrderCancel || options.type === "danger"
                      ? "bg-[#DC2626] hover:bg-[#B91C1C]"
                      : options.type === "warning"
                      ? "bg-[#D97706] hover:bg-[#B45309]"
                      : "bg-[#030712] hover:bg-[#1F2937]"
                  }`}
                >
                  {options.confirmText || (isCategoryDelete ? "Delete" : isOrderCancel ? "Reject" : "Confirm")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
