import React from "react";

type SettingsTab = "general" | "password";

type SettingsSidebarProps = {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
};

export function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <h2 className="mb-4 font-geist text-[18px] font-medium leading-[120%] tracking-[-0.36px] text-[#030712]">
        Settings
      </h2>
      <nav className="space-y-2">
        <button
          onClick={() => onTabChange("general")}
          className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-left font-public text-[14px] font-medium transition-colors ${
            activeTab === "general"
              ? "bg-[#F9FAFB] text-[#030712] border border-[#E5E7EB]"
              : "text-[#6A7282] hover:bg-[#F9FAFB]"
          }`}
        >
          General
        </button>
        <button
          onClick={() => onTabChange("password")}
          className={`w-full flex items-center gap-3 rounded-lg px-4 py-2 text-left font-public text-[14px] font-medium transition-colors ${
            activeTab === "password"
              ? "bg-[#F9FAFB] text-[#030712] border border-[#E5E7EB]"
              : "text-[#6A7282] hover:bg-[#F9FAFB]"
          }`}
        >
          Password
        </button>
      </nav>
    </div>
  );
}

