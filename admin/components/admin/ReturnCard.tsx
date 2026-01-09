import React from "react";
import type { Return, ReturnStatus, ReturnType, ReturnReason } from "@/lib/validators/return";
import { getAvatarColorClass } from "@/lib/utils/overview";

type ReturnCardProps = {
  returnItem: Return;
  index: number;
  onViewDetails?: (returnItem: Return) => void;
};

// Return status badge configuration
const returnStatusConfig: Record<ReturnStatus, { label: string; className: string }> = {
  requested: {
    label: "Requested",
    className: "bg-yellow-100 text-yellow-800",
  },
  approved: {
    label: "Approved",
    className: "bg-blue-100 text-blue-800",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800",
  },
  in_transit: {
    label: "In Transit",
    className: "bg-indigo-100 text-indigo-800",
  },
  received: {
    label: "Received",
    className: "bg-purple-100 text-purple-800",
  },
  inspecting: {
    label: "Inspecting",
    className: "bg-orange-100 text-orange-800",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-800",
  },
};

// Return type badge configuration
const returnTypeConfig: Record<ReturnType, { label: string; className: string }> = {
  refund: {
    label: "Refund",
    className: "bg-emerald-100 text-emerald-800",
  },
  replacement: {
    label: "Replacement",
    className: "bg-cyan-100 text-cyan-800",
  },
};

// Return reason labels
const returnReasonLabels: Record<ReturnReason, string> = {
  defective: "Defective/Damaged",
  wrong_item: "Wrong Item",
  not_as_described: "Not As Described",
  changed_mind: "Changed Mind",
  other: "Other",
};

export function ReturnCard({ returnItem, index, onViewDetails }: ReturnCardProps): React.JSX.Element {
  const formatCurrency = (amount: number, currency: string = "sgd"): string => {
    const currencySymbol = "$";
    return `${currencySymbol} ${(amount / 100).toFixed(2)}`;
  };

  const getCustomerInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get status configurations with fallbacks
  const statusConfig = returnStatusConfig[returnItem.status] || returnStatusConfig.requested;
  const typeConfig = returnTypeConfig[returnItem.return_type] || returnTypeConfig.refund;
  const reasonLabel = returnReasonLabels[returnItem.reason] || returnItem.reason;

  // Get first item for display
  const firstItem = returnItem.items?.[0];
  const itemsCount = returnItem.items?.length || 0;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 transition-shadow hover:shadow-sm md:p-6">
      <div className="flex gap-4">
        {/* Content */}
        <div className="flex-1">
          {/* Top: Customer Info + Status Badges */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getAvatarColorClass(index)}`}>
                <span className="font-geist text-[12px] font-medium text-white">
                  {getCustomerInitials(returnItem.customer_name || "Guest")}
                </span>
              </div>
              <div>
                <p className="overflow-hidden text-ellipsis font-geist text-[14px] font-normal leading-normal tracking-[-0.14px] text-[#030712]">
                  {returnItem.customer_name || "Guest"}
                </p>
                <p className="overflow-hidden text-ellipsis font-geist text-[12px] font-normal text-[#6A7282]">
                  Order #{returnItem.order_display_id}
                </p>
              </div>
            </div>
            {/* Status Badges */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.className}`}>
                {typeConfig.label}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-4 border-t border-[#E5E7EB]"></div>

          {/* Bottom: Return Info */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            {/* Product Info */}
            <div className="flex w-[200px] shrink-0 items-start gap-3">
              {firstItem ? (
                <>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5]">
                    {firstItem.thumbnail ? (
                      <img
                        src={firstItem.thumbnail}
                        alt={firstItem.product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[20px]">📦</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-geist text-[16px] font-medium leading-normal tracking-[-0.16px] text-[#030712]" title={firstItem.product_name}>
                      {firstItem.product_name}
                    </p>
                    <p className="overflow-hidden text-ellipsis font-geist text-[14px] font-normal leading-normal tracking-[-0.14px] text-[#6A7282]">
                      x{firstItem.quantity}
                    </p>
                    {itemsCount > 1 && (
                      <p className="mt-2 font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#030712]">
                        + {itemsCount - 1} other item{itemsCount - 1 > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F5]">
                    <span className="text-[20px]">📦</span>
                  </div>
                  <div>
                    <p className="font-geist text-[14px] font-normal text-[#6A7282]">{itemsCount} item(s)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="w-[140px] shrink-0">
              <p className="mb-1 font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#858585]">Reason</p>
              <p className="truncate font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#2F2F2F]" title={reasonLabel}>
                {reasonLabel}
              </p>
              {returnItem.reason_details && (
                <p className="mt-1 truncate font-geist text-[12px] font-normal text-[#6A7282]" title={returnItem.reason_details}>
                  {returnItem.reason_details}
                </p>
              )}
            </div>

            {/* Refund Amount */}
            <div className="w-[120px] shrink-0">
              <p className="mb-1 font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#858585]">Refund Amount</p>
              <p className="truncate font-geist text-[16px] font-bold leading-normal tracking-[-0.16px] text-[#2F2F2F]">
                {formatCurrency(returnItem.total_refund)}
              </p>
              {returnItem.refund_status && (
                <p className={`truncate font-geist text-[12px] font-medium ${
                  returnItem.refund_status === "completed" ? "text-green-600" :
                  returnItem.refund_status === "failed" ? "text-red-600" :
                  "text-[#858585]"
                }`}>
                  {returnItem.refund_status === "completed" ? "Refunded" :
                   returnItem.refund_status === "failed" ? "Failed" :
                   returnItem.refund_status === "processing" ? "Processing" :
                   "Pending"}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="w-[120px] shrink-0">
              <p className="mb-1 font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#858585]">Requested</p>
              <p className="truncate font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#2F2F2F]">
                {new Date(returnItem.requested_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="truncate font-geist text-[12px] font-normal text-[#858585]">
                {new Date(returnItem.requested_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex w-[100px] shrink-0 flex-col gap-1">
              <button
                onClick={() => onViewDetails?.(returnItem)}
                className="cursor-pointer text-left font-geist text-[14px] font-normal leading-normal tracking-[-0.14px] text-[#007AFF] transition-colors hover:underline"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
