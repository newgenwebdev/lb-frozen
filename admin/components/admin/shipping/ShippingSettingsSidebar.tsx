"use client";

import React from "react";

type SettingsTab = "pickup" | "api";

type ShippingSettingsSidebarProps = {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
};

export function ShippingSettingsSidebar({
  activeTab,
  onTabChange,
}: ShippingSettingsSidebarProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <h2 className="mb-4 font-geist text-[18px] font-medium leading-[120%] tracking-[-0.36px] text-[#030712]">
        Settings
      </h2>
      <nav className="space-y-2">
        <button
          onClick={() => onTabChange("pickup")}
          className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-left font-public text-[14px] font-medium transition-colors cursor-pointer ${
            activeTab === "pickup"
              ? "bg-[#F9FAFB] text-[#030712] border border-[#E5E7EB]"
              : "text-[#6A7282] hover:bg-[#F9FAFB] border border-transparent"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M8 8.66667C9.10457 8.66667 10 7.77124 10 6.66667C10 5.5621 9.10457 4.66667 8 4.66667C6.89543 4.66667 6 5.5621 6 6.66667C6 7.77124 6.89543 8.66667 8 8.66667Z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12.7143 6.66667C12.7143 11.0476 8 14.6667 8 14.6667C8 14.6667 3.28571 11.0476 3.28571 6.66667C3.28571 4.10853 5.39339 2 8 2C10.6066 2 12.7143 4.10853 12.7143 6.66667Z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Pickup Address
        </button>
        <button
          onClick={() => onTabChange("api")}
          className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-left font-public text-[14px] font-medium transition-colors cursor-pointer ${
            activeTab === "api"
              ? "bg-[#F9FAFB] text-[#030712] border border-[#E5E7EB]"
              : "text-[#6A7282] hover:bg-[#F9FAFB] border border-transparent"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M6 8H10"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 6V10"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.33333 2H12.6667C13.403 2 14 2.59695 14 3.33333V12.6667C14 13.403 13.403 14 12.6667 14H3.33333C2.59695 14 2 13.403 2 12.6667V3.33333C2 2.59695 2.59695 2 3.33333 2Z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          API Connection
        </button>
      </nav>
    </div>
  );
}
