"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type ExportColumn = {
  id: string;
  label: string;
  key: string;
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { id: "order_id", label: "Order ID", key: "order_id" },
  { id: "product_name", label: "Product Name", key: "product_name" },
  { id: "total_revenue", label: "Total Revenue", key: "total_revenue" },
  { id: "quantity_sold", label: "Quantity Sold", key: "quantity_sold" },
  { id: "payment_method", label: "Payment Method", key: "payment_method" },
  { id: "customer_name", label: "Customer Name", key: "customer_name" },
];

type ExportSalesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onExport: (params: {
    startDate: string | null;
    endDate: string | null;
    columns: string[];
  }) => Promise<void>;
  isExporting?: boolean;
};

export function ExportSalesModal({
  isOpen,
  onClose,
  onExport,
  isExporting = false,
}: ExportSalesModalProps): React.JSX.Element | null {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(EXPORT_COLUMNS.map((col) => col.id))
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartDate("");
      setEndDate("");
      setSelectedColumns(new Set(EXPORT_COLUMNS.map((col) => col.id)));
    }
  }, [isOpen]);

  const handleColumnToggle = useCallback((columnId: string): void => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((): void => {
    if (selectedColumns.size === EXPORT_COLUMNS.length) {
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set(EXPORT_COLUMNS.map((col) => col.id)));
    }
  }, [selectedColumns.size]);

  const isAllSelected = selectedColumns.size === EXPORT_COLUMNS.length;

  // Generate filename based on date
  const generateFileName = (): string => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    return `sales-report_${dateStr}.csv`;
  };

  const handleExport = useCallback(async (): Promise<void> => {
    await onExport({
      startDate: startDate || null,
      endDate: endDate || null,
      columns: Array.from(selectedColumns),
    });
  }, [startDate, endDate, selectedColumns, onExport]);

  const handleClose = useCallback((): void => {
    if (!isExporting) {
      onClose();
    }
  }, [isExporting, onClose]);

  if (!isOpen) return null;

  return typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-geist text-lg font-semibold text-[#030712]">
                Export Sales Data
              </h2>
              <button
                onClick={handleClose}
                disabled={isExporting}
                className="cursor-pointer text-[#6A7282] transition-colors hover:text-[#030712] disabled:opacity-50"
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
            </div>

            {/* Date Range */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block font-geist text-sm font-medium text-[#030712]">
                  Start Date
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M10.6673 1.3335V4.00016"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.33333 1.3335V4.00016"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 5.99984H14"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.6667 2.66699H3.33333C2.59667 2.66699 2 3.26366 2 4.00033V12.667C2 13.4037 2.59667 14.0003 3.33333 14.0003H12.6667C13.4033 14.0003 14 13.4037 14 12.667V4.00033C14 3.26366 13.4033 2.66699 12.6667 2.66699Z"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Choose date"
                    className="h-10 w-full cursor-pointer rounded-lg border border-[#E5E7EB] bg-white pl-10 pr-3 font-geist text-sm text-[#030712] transition-colors placeholder:text-[#9CA3AF] hover:border-[#D1D5DB] focus:border-[#030712] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block font-geist text-sm font-medium text-[#030712]">
                  End Date
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M10.6673 1.3335V4.00016"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.33333 1.3335V4.00016"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 5.99984H14"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.6667 2.66699H3.33333C2.59667 2.66699 2 3.26366 2 4.00033V12.667C2 13.4037 2.59667 14.0003 3.33333 14.0003H12.6667C13.4033 14.0003 14 13.4037 14 12.667V4.00033C14 3.26366 13.4033 2.66699 12.6667 2.66699Z"
                        stroke="#6A7282"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    placeholder="Choose date"
                    className="h-10 w-full cursor-pointer rounded-lg border border-[#E5E7EB] bg-white pl-10 pr-3 font-geist text-sm text-[#030712] transition-colors placeholder:text-[#9CA3AF] hover:border-[#D1D5DB] focus:border-[#030712] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Column Selection */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <label className="font-geist text-sm font-medium text-[#030712]">
                  Time
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="peer sr-only"
                  />
                  <div className="flex h-4 w-4 items-center justify-center rounded border border-[#E5E7EB] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100 peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-2">
                    <svg
                      className="h-3 w-3 text-white opacity-0 transition-opacity"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="font-geist text-sm text-[#030712]">
                    Select All
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {EXPORT_COLUMNS.map((column) => (
                  <label
                    key={column.id}
                    className="flex cursor-pointer items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.has(column.id)}
                      onChange={() => handleColumnToggle(column.id)}
                      className="peer sr-only"
                    />
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#E5E7EB] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100 peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-2">
                      <svg
                        className="h-3 w-3 text-white opacity-0 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="font-geist text-sm text-[#030712]">
                      {column.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* File Name Preview */}
            <div className="mb-6">
              <label className="mb-2 block font-geist text-sm font-medium text-[#030712]">
                File Name Preview
              </label>
              <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M9.33333 1.33301H4C3.26667 1.33301 2.66667 1.93301 2.66667 2.66634V13.333C2.66667 14.0663 3.26667 14.6663 4 14.6663H12C12.7333 14.6663 13.3333 14.0663 13.3333 13.333V5.33301L9.33333 1.33301Z"
                    stroke="#6A7282"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.33333 1.33301V5.33301H13.3333"
                    stroke="#6A7282"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-geist text-sm text-[#6A7282]">
                  {generateFileName()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                disabled={isExporting}
                className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-6 py-2.5 font-geist text-sm font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || selectedColumns.size === 0}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#030712] px-6 py-2.5 font-geist text-sm font-medium text-white transition-colors hover:bg-[#1F2937] disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  "Export CSV"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
}
