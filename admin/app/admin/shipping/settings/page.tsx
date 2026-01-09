"use client";

import React, { useState } from "react";
import { ShippingSettingsSidebar } from "@/components/admin/shipping/ShippingSettingsSidebar";
import { PickupAddressSettings } from "@/components/admin/shipping/PickupAddressSettings";
import { ApiSettings } from "@/components/admin/shipping/ApiSettings";

type SettingsTab = "pickup" | "api";

export default function ShippingSettingsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>("pickup");

  return (
    <div className="px-4 md:px-8">
      <div className="mb-6">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Shipping Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <ShippingSettingsSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        <div className="lg:col-span-3">
          {activeTab === "pickup" && <PickupAddressSettings />}
          {activeTab === "api" && <ApiSettings />}
        </div>
      </div>
    </div>
  );
}
