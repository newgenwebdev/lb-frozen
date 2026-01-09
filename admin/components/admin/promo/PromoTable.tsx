"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Coupon, PromoStatus } from "@/lib/types/promo";

export type CouponSortField = "displayId" | "code" | "type" | "value" | "date" | "status";
export type SortDirection = "asc" | "desc";

type PromoTableProps = {
  coupons: Coupon[];
  isLoading?: boolean;
  sortField?: CouponSortField;
  sortDirection?: SortDirection;
  onSort?: (field: CouponSortField) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function isExpired(endsAt: string | null): boolean {
  if (!endsAt) return false;
  return new Date(endsAt) < new Date();
}

function StatusBadge({ status, endsAt }: { status: PromoStatus; endsAt: string | null }): React.JSX.Element {
  const expired = isExpired(endsAt);
  const isActive = status === "active" && !expired;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full ${
          isActive ? "bg-[#10B981]" : "bg-[#F59E0B]"
        }`}
      />
      <span className="font-public text-[14px] font-medium text-[#030712]">
        {isActive ? "Active" : "Non Active"}
      </span>
    </div>
  );
}


type SortIconProps = {
  field: CouponSortField;
  currentField?: CouponSortField;
  direction?: SortDirection;
};

function SortIcon({ field, currentField, direction }: SortIconProps): React.JSX.Element {
  const isActive = field === currentField;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform ${isActive && direction === "asc" ? "rotate-180" : ""}`}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PromoTable({
  coupons,
  isLoading = false,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
}: PromoTableProps): React.JSX.Element {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (field: CouponSortField): void => {
    onSort?.(field);
  };

  const handleMenuToggle = (id: string, e: React.MouseEvent<HTMLButtonElement>): void => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const openUp = buttonRect.bottom > viewportHeight - 200;
      setMenuPosition({
        top: openUp ? buttonRect.top : buttonRect.bottom + 4,
        left: buttonRect.right - 120, // 120px is menu width
        openUp,
      });
      setOpenMenuId(id);
    }
  };

  const handleEdit = (id: string): void => {
    setOpenMenuId(null);
    setMenuPosition(null);
    onEdit?.(id);
  };

  const handleDelete = (id: string): void => {
    setOpenMenuId(null);
    setMenuPosition(null);
    onDelete?.(id);
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
          <p className="mt-4 font-public text-[14px] text-[#6A7282]">
            Loading coupons...
          </p>
        </div>
      </div>
    );
  }

  if (!coupons || coupons.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <div className="p-12 text-center">
          <div className="mb-4 text-[48px]">🎟️</div>
          <h3 className="mb-2 font-geist text-[18px] font-medium text-[#030712]">
            No coupons found
          </h3>
          <p className="font-public text-[14px] text-[#6A7282]">
            Get started by adding your first coupon
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="py-3 pl-6 pr-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <button
                  onClick={() => handleSort("displayId")}
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                >
                  <span>Coupons ID</span>
                  <SortIcon field="displayId" currentField={sortField} direction={sortDirection} />
                </button>
              </th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <button
                  onClick={() => handleSort("code")}
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                >
                  <span>Code</span>
                  <SortIcon field="code" currentField={sortField} direction={sortDirection} />
                </button>
              </th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <button
                  onClick={() => handleSort("type")}
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                >
                  <span>Type</span>
                  <SortIcon field="type" currentField={sortField} direction={sortDirection} />
                </button>
              </th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <button
                  onClick={() => handleSort("value")}
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                >
                  <span>Value</span>
                  <SortIcon field="value" currentField={sortField} direction={sortDirection} />
                </button>
              </th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <button
                  onClick={() => handleSort("date")}
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                >
                  <span>Date</span>
                  <SortIcon field="date" currentField={sortField} direction={sortDirection} />
                </button>
              </th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <button
                  onClick={() => handleSort("status")}
                  className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                >
                  <span>Status</span>
                  <SortIcon field="status" currentField={sortField} direction={sortDirection} />
                </button>
              </th>
              <th className="py-3 pl-3 pr-6 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                <span></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr
                key={coupon.id}
                className="border-b border-[#E5E7EB] transition-colors hover:bg-[#F9FAFB]"
              >
                <td className="py-4 pl-6 pr-3">
                  <span className="font-public text-[14px] font-medium text-[#030712]">
                    {coupon.displayId}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <span className="font-public text-[14px] font-medium text-[#030712]">
                    {coupon.code}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <span className="font-public text-[14px] font-medium text-[#030712]">
                    {coupon.type === "percentage" ? "%" : "fixed"}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <span className="font-public text-[14px] font-medium text-[#030712]">
                    {coupon.value}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <span className="font-public text-[14px] font-medium text-[#030712]">
                    {coupon.startDate} - {coupon.endDate}
                  </span>
                </td>
                <td className="px-3 py-4">
                  <StatusBadge status={coupon.status} endsAt={coupon.endsAt} />
                </td>
                <td className="py-4 pl-3 pr-6">
                  <button
                    onClick={(e) => handleMenuToggle(coupon.id, e)}
                    className="cursor-pointer text-[#030712] transition-colors hover:text-[#6A7282]"
                    aria-label="More options"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M12.3388 8.00339C12.3388 8.18757 12.1895 8.33687 12.0053 8.33687C11.8212 8.33687 11.6719 8.18757 11.6719 8.00339C11.6719 7.81922 11.8212 7.66992 12.0053 7.66992C12.1895 7.66992 12.3388 7.81922 12.3388 8.00339"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8.33687 8.00339C8.33687 8.18757 8.18757 8.33687 8.00339 8.33687C7.81922 8.33687 7.66992 8.18757 7.66992 8.00339C7.66992 7.81922 7.81922 7.66992 8.00339 7.66992C8.18757 7.66992 8.33687 7.81922 8.33687 8.00339"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4.33491 8.00339C4.33491 8.18757 4.18561 8.33687 4.00144 8.33687C3.81727 8.33687 3.66797 8.18757 3.66797 8.00339C3.66797 7.81922 3.81727 7.66992 4.00144 7.66992C4.18561 7.66992 4.33491 7.81922 4.33491 8.00339"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Portal-rendered dropdown menu - floats outside table */}
      {openMenuId && menuPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed w-[120px] rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg z-[9999]"
          style={{
            top: menuPosition.openUp ? "auto" : menuPosition.top,
            bottom: menuPosition.openUp ? `${window.innerHeight - menuPosition.top + 4}px` : "auto",
            left: menuPosition.left,
          }}
        >
          <button
            onClick={() => handleEdit(openMenuId)}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left font-public text-[14px] text-[#030712] transition-colors hover:bg-[#F9FAFB]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M8.5 2.5L11.5 5.5M1 13H4L12.5 4.5C12.8978 4.10218 13.1213 3.56261 13.1213 3C13.1213 2.43739 12.8978 1.89782 12.5 1.5C12.1022 1.10218 11.5626 0.878679 11 0.878679C10.4374 0.878679 9.89782 1.10218 9.5 1.5L1 10V13Z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Edit
          </button>
          <button
            onClick={() => handleDelete(openMenuId)}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left font-public text-[14px] text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
            >
              <path
                d="M1 3.5H13M11.5 3.5V12C11.5 12.5 11 13 10.5 13H3.5C3 13 2.5 12.5 2.5 12V3.5M4.5 3.5V2.5C4.5 2 5 1.5 5.5 1.5H8.5C9 1.5 9.5 2 9.5 2.5V3.5M5.5 6.5V10M8.5 6.5V10"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
