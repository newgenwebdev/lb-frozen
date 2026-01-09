import React from "react";
import type { BannerStatus } from "@/lib/types/banner";

type BannerStatusBadgeProps = {
  status: BannerStatus;
};

export function BannerStatusBadge({ status }: BannerStatusBadgeProps): React.JSX.Element {
  const isActive = status === "active";

  return (
    <div className="flex items-center gap-2">
      {isActive ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#10B981" />
          <path d="M5.5 8L7 9.5L10.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#F59E0B" />
          <path d="M8 5V8M8 11H8.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span className="font-public text-[14px] font-medium text-[#030712]">
        {isActive ? "Active" : "Non Active"}
      </span>
    </div>
  );
}

