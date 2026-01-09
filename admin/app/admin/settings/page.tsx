"use client";

import React, { useState } from "react";
import { SettingsSidebar } from "@/components/admin/settings/SettingsSidebar";
import { GeneralSettings } from "@/components/admin/settings/GeneralSettings";
import { PasswordSettings } from "@/components/admin/settings/PasswordSettings";
import { useCurrentUser } from "@/lib/api/queries";

type SettingsTab = "general" | "password";

export default function SettingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const { data: currentUser, isLoading, error } = useCurrentUser();

  return (
    <div className="px-4 md:px-8">
      <div className="mb-6">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === "general" && (
            <>
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                  <p className="text-[14px] text-red-700">
                    Failed to load account details. Please try again later.
                  </p>
                </div>
              ) : (
                <GeneralSettings
                  name={currentUser?.name || ""}
                  email={currentUser?.email || ""}
                  role={currentUser?.role || ""}
                  isLoading={isLoading}
                />
              )}
            </>
          )}

          {activeTab === "password" && <PasswordSettings />}
        </div>
      </div>
    </div>
  );
}
