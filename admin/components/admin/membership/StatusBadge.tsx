import React from "react";
import type { MembershipPromoStatus } from "@/lib/types/membership";

type StatusBadgeProps = {
  status: MembershipPromoStatus;
};

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  const isActive = status === "active";

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

