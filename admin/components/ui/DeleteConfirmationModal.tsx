import React from "react";
import { createPortal } from "react-dom";

type DeleteConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  isLoading?: boolean;
};

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete",
  message,
  itemName,
  isLoading = false,
}: DeleteConfirmationModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const defaultMessage = itemName
    ? `Are you sure you want to delete ${itemName}?`
    : "Are you sure you want to delete this item?";

  const displayMessage = message || defaultMessage;

  return typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={!isLoading ? onClose : undefined}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            {/* Close Button */}
            <button
              onClick={!isLoading ? onClose : undefined}
              disabled={isLoading}
              className="absolute top-4 right-4 text-[#6A7282] hover:text-[#030712] transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEF2F2]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                >
                  <path
                    d="M15 12V10C15 8.89543 15.8954 8 17 8H23C24.1046 8 25 8.89543 25 10V12M15 12H10M15 12H20M25 12H30M25 12V28C25 29.1046 24.1046 30 23 30H17C15.8954 30 15 29.1046 15 28V12M20 18V24M13 18V24M27 18V24"
                    stroke="#DC2626"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-center mb-2 font-geist text-[18px] font-semibold text-[#030712]">
              {title}
            </h3>

            {/* Message */}
            <p className="text-center mb-6 font-public text-[14px] text-[#6A7282]">
              {displayMessage}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={!isLoading ? onClose : undefined}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] bg-white font-public text-[14px] font-medium text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={!isLoading ? onConfirm : undefined}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-[#DC2626] font-public text-[14px] font-medium text-white hover:bg-[#B91C1C] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
}

