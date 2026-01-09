import React from "react";
import type { ShipmentStatus } from "@/lib/types/shipment";

type ShipmentStatusBadgeProps = {
  status: ShipmentStatus;
};

export function ShipmentStatusBadge({
  status,
}: ShipmentStatusBadgeProps): React.JSX.Element {
  const isActive = status === "Active";
  const bgColor = isActive ? "bg-[#ECFDF3]" : "bg-[#FFFBEB]";
  const textColor = isActive ? "text-[#027A48]" : "text-[#B54708]";
  const iconColor = isActive ? "text-[#12B76A]" : "text-[#F79009]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-public text-[12px] font-medium ${bgColor} ${textColor}`}
    >
      {isActive ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={iconColor}
        >
          <path
            d="M9.5 3.5L5 8L2.5 5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={iconColor}
        >
          <path
            d="M6 8V6M6 4H6.005"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 6C11 8.76142 8.76142 11 6 11C3.23858 11 1 8.76142 1 6C1 3.23858 3.23858 1 6 1C8.76142 1 11 3.23858 11 6Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {status}
    </span>
  );
}

