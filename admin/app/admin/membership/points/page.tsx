"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePointsConfig } from "@/lib/api/queries";
import { useUpdatePointsConfig } from "@/lib/api/mutations";
import type { PointsEarningType } from "@/lib/types/membership-settings";

type DropdownOption = { label: string; value: string };

function CustomDropdown({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  className?: string;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={className} ref={dropdownRef}>
      <label className="mb-2 block font-public text-[14px] font-medium text-[#030712]">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 font-public text-[14px] font-medium outline-none transition-colors hover:border-[#D1D5DB] focus:border-[#030712]"
        >
          <span className={selectedOption ? "text-[#030712]" : "text-[#99A1AF]"}>
            {selectedOption?.label || "Select..."}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full cursor-pointer px-4 py-2.5 text-left font-public text-[14px] transition-colors ${
                  value === option.value
                    ? "bg-[#F9FAFB] font-medium text-[#030712]"
                    : "text-[#030712] hover:bg-[#F9FAFB]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PointsConfigPage(): React.JSX.Element {
  const { data: config, isLoading, error } = usePointsConfig();
  const updateConfig = useUpdatePointsConfig();

  // Form state - Earning
  const [earningType, setEarningType] = useState<PointsEarningType>("percentage");
  const [earningRate, setEarningRate] = useState<string>("5");
  const [includeTax, setIncludeTax] = useState<boolean>(false);
  const [includeShipping, setIncludeShipping] = useState<boolean>(false);

  // Form state - Redemption
  const [pointsPerDollar, setPointsPerDollar] = useState<string>("100");
  const [minPointsToRedeem, setMinPointsToRedeem] = useState<string>("100");
  const [maxRedemptionPercentage, setMaxRedemptionPercentage] = useState<string>("50");

  // Form state - Expiration
  const [expirationMonths, setExpirationMonths] = useState<string>("0");

  // Form state - Status
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  const [hasChanges, setHasChanges] = useState(false);

  // Sync form state with fetched config
  useEffect(() => {
    if (config) {
      setEarningType(config.earning_type);
      setEarningRate(config.earning_rate.toString());
      setIncludeTax(config.include_tax_in_earning);
      setIncludeShipping(config.include_shipping_in_earning);
      setPointsPerDollar(config.redemption_rate > 0 ? Math.round(1 / config.redemption_rate).toString() : "100");
      setMinPointsToRedeem(config.min_points_to_redeem.toString());
      setMaxRedemptionPercentage(config.max_redemption_percentage.toString());
      setExpirationMonths(config.expiration_months.toString());
      setIsEnabled(config.is_enabled);
      setHasChanges(false);
    }
  }, [config]);

  // Track changes
  useEffect(() => {
    if (config) {
      const currentPointsPerDollar = config.redemption_rate > 0 ? Math.round(1 / config.redemption_rate) : 100;
      const changed =
        earningType !== config.earning_type ||
        parseFloat(earningRate) !== config.earning_rate ||
        includeTax !== config.include_tax_in_earning ||
        includeShipping !== config.include_shipping_in_earning ||
        parseInt(pointsPerDollar) !== currentPointsPerDollar ||
        parseInt(minPointsToRedeem) !== config.min_points_to_redeem ||
        parseInt(maxRedemptionPercentage) !== config.max_redemption_percentage ||
        parseInt(expirationMonths) !== config.expiration_months ||
        isEnabled !== config.is_enabled;
      setHasChanges(changed);
    }
  }, [earningType, earningRate, includeTax, includeShipping, pointsPerDollar, minPointsToRedeem, maxRedemptionPercentage, expirationMonths, isEnabled, config]);

  const handleCancel = () => {
    if (config) {
      setEarningType(config.earning_type);
      setEarningRate(config.earning_rate.toString());
      setIncludeTax(config.include_tax_in_earning);
      setIncludeShipping(config.include_shipping_in_earning);
      setPointsPerDollar(config.redemption_rate > 0 ? Math.round(1 / config.redemption_rate).toString() : "100");
      setMinPointsToRedeem(config.min_points_to_redeem.toString());
      setMaxRedemptionPercentage(config.max_redemption_percentage.toString());
      setExpirationMonths(config.expiration_months.toString());
      setIsEnabled(config.is_enabled);
      setHasChanges(false);
    }
  };

  const handleSave = async () => {
    const points = parseInt(pointsPerDollar) || 100;
    await updateConfig.mutateAsync({
      earning_type: earningType,
      earning_rate: parseFloat(earningRate) || 0,
      include_tax_in_earning: includeTax,
      include_shipping_in_earning: includeShipping,
      redemption_rate: 1 / points,
      min_points_to_redeem: parseInt(minPointsToRedeem) || 0,
      max_redemption_percentage: parseInt(maxRedemptionPercentage) || 0,
      expiration_months: parseInt(expirationMonths) || 0,
      is_enabled: isEnabled,
    });
  };

  const expirationOptions: DropdownOption[] = [
    { label: "Never expire", value: "0" },
    { label: "6 months of inactivity", value: "6" },
    { label: "12 months of inactivity", value: "12" },
    { label: "18 months of inactivity", value: "18" },
    { label: "24 months of inactivity", value: "24" },
  ];

  // Calculate display values
  const calculatedPointsPerDollar = parseInt(pointsPerDollar) || 100;
  const earningRateNum = parseFloat(earningRate) || 0;

  if (isLoading) {
    return (
      <div className="px-8 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-8 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load points configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-geist text-[24px] font-medium text-[#030712]">
            Points Configuration
          </h1>
          <p className="mt-1 font-public text-[14px] text-[#6A7282]">
            Configure how customers earn and redeem points
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!hasChanges}
            className={`rounded-lg border px-4 py-2 font-public text-[14px] font-medium transition-colors ${
              hasChanges
                ? "border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
                : "border-[#E5E7EB] bg-[#F9FAFB] text-[#9CA3AF] cursor-not-allowed"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateConfig.isPending}
            className={`rounded-lg px-4 py-2 font-public text-[14px] font-medium transition-colors ${
              hasChanges && !updateConfig.isPending
                ? "bg-[#030712] text-white hover:bg-[#1f2937]"
                : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
            }`}
          >
            {updateConfig.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Points Status */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Points System Status
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-public text-[14px] font-medium text-[#030712]">
                Enable Points System
              </p>
              <p className="font-public text-[13px] text-[#6A7282]">
                When disabled, customers will not earn or redeem points
              </p>
            </div>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled ? "bg-[#10B981]" : "bg-[#E5E7EB]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Earning Rules */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Earning Rules
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-public text-[14px] font-medium text-[#030712]">
                Earning Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setEarningType("percentage")}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    earningType === "percentage"
                      ? "border-[#030712] bg-[#F9FAFB]"
                      : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-4 w-4 rounded-full border-2 ${
                      earningType === "percentage" ? "border-[#030712] bg-[#030712]" : "border-[#D1D5DB]"
                    }`}>
                      {earningType === "percentage" && (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <span className="font-geist text-[14px] font-medium text-[#030712]">
                      Percentage of Order
                    </span>
                  </div>
                  <p className="font-public text-[12px] text-[#6A7282] ml-6">
                    e.g., 5% of order total as points
                  </p>
                </button>
                <button
                  onClick={() => setEarningType("per_currency")}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    earningType === "per_currency"
                      ? "border-[#030712] bg-[#F9FAFB]"
                      : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-4 w-4 rounded-full border-2 ${
                      earningType === "per_currency" ? "border-[#030712] bg-[#030712]" : "border-[#D1D5DB]"
                    }`}>
                      {earningType === "per_currency" && (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <span className="font-geist text-[14px] font-medium text-[#030712]">
                      Per Currency Unit
                    </span>
                  </div>
                  <p className="font-public text-[12px] text-[#6A7282] ml-6">
                    e.g., 1 point per $1 spent
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block font-public text-[14px] font-medium text-[#030712]">
                Earning Rate
              </label>
              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="text"
                  value={earningRate}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setEarningRate(value);
                  }}
                  className="w-24 rounded-lg border border-[#E5E7EB] px-4 py-2.5 font-public text-[14px] outline-none transition-colors focus:border-[#030712]"
                />
                <span className="font-public text-[14px] text-[#6A7282]">
                  {earningType === "percentage" ? "% of order total" : "point(s) per $1 spent"}
                </span>
              </div>
              <p className="mt-2 font-public text-[12px] text-[#6A7282]">
                {earningType === "percentage"
                  ? `Example: A $100 order earns ${Math.round(100 * earningRateNum / 100)} points`
                  : `Example: A $100 order earns ${Math.round(100 * earningRateNum)} points`}
              </p>
            </div>

            <div className="border-t border-[#E5E7EB] pt-4 space-y-3">
              <p className="font-public text-[14px] font-medium text-[#030712]">
                What to include in point calculation
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTax}
                  onChange={() => setIncludeTax(!includeTax)}
                  className="h-4 w-4 rounded accent-[#030712]"
                />
                <span className="font-public text-[14px] text-[#030712]">Include taxes</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeShipping}
                  onChange={() => setIncludeShipping(!includeShipping)}
                  className="h-4 w-4 rounded accent-[#030712]"
                />
                <span className="font-public text-[14px] text-[#030712]">Include shipping costs</span>
              </label>
            </div>
          </div>
        </div>

        {/* Redemption Rules */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Redemption Rules
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-public text-[14px] font-medium text-[#030712]">
                Points Value
              </label>
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={pointsPerDollar}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setPointsPerDollar(value);
                  }}
                  className="w-24 rounded-lg border border-[#E5E7EB] px-4 py-2.5 font-public text-[14px] outline-none transition-colors focus:border-[#030712]"
                />
                <span className="font-public text-[14px] text-[#6A7282]">
                  points = $1.00
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block font-public text-[14px] font-medium text-[#030712]">
                Minimum Points to Redeem
              </label>
              <input
                type="text"
                value={minPointsToRedeem}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setMinPointsToRedeem(value);
                }}
                className="w-32 rounded-lg border border-[#E5E7EB] px-4 py-2.5 font-public text-[14px] outline-none transition-colors focus:border-[#030712]"
              />
              <p className="mt-1 font-public text-[12px] text-[#6A7282]">
                Customers must have at least this many points to redeem
              </p>
            </div>

            <div>
              <label className="mb-2 block font-public text-[14px] font-medium text-[#030712]">
                Maximum Redemption per Order
              </label>
              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="text"
                  value={maxRedemptionPercentage}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setMaxRedemptionPercentage(value);
                  }}
                  className="w-20 rounded-lg border border-[#E5E7EB] px-4 py-2.5 font-public text-[14px] outline-none transition-colors focus:border-[#030712]"
                />
                <span className="font-public text-[14px] text-[#6A7282]">
                  % of order total
                </span>
              </div>
              <p className="mt-1 font-public text-[12px] text-[#6A7282]">
                Maximum percentage of an order that can be paid with points
              </p>
            </div>
          </div>
        </div>

        {/* Expiration Rules */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Point Expiration
          </h2>
          <div>
            <CustomDropdown
              label="Points Expire After"
              value={expirationMonths}
              onChange={setExpirationMonths}
              options={expirationOptions}
              className="max-w-xs"
            />
            <p className="mt-2 font-public text-[13px] text-[#6A7282]">
              {expirationMonths === "0"
                ? "Points will never expire automatically"
                : `Points will expire if a customer has no activity for ${expirationMonths} months`}
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-6">
          <h3 className="mb-3 font-geist text-[16px] font-medium text-[#1E40AF]">
            Current Configuration Summary
          </h3>
          <div className="space-y-2 font-public text-[14px] text-[#1E40AF]">
            <p>
              <span className="font-medium">Earning:</span>{" "}
              {earningType === "percentage"
                ? `${earningRateNum}% of order total`
                : `${earningRateNum} point(s) per $1 spent`}
              {(includeTax || includeShipping) && (
                <span className="text-[13px]">
                  {" "}(including {[includeTax && "tax", includeShipping && "shipping"].filter(Boolean).join(" & ")})
                </span>
              )}
            </p>
            <p>
              <span className="font-medium">Redemption:</span>{" "}
              {calculatedPointsPerDollar} points = $1.00 (min {minPointsToRedeem} points, max {maxRedemptionPercentage}% of order)
            </p>
            <p>
              <span className="font-medium">Expiration:</span>{" "}
              {expirationMonths === "0" ? "Points never expire" : `After ${expirationMonths} months of inactivity`}
            </p>
          </div>
        </div>

        {/* Related Settings */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Related Settings
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/admin/membership/settings"
              className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4 transition-colors hover:bg-[#F9FAFB]"
            >
              <div>
                <p className="font-public text-[14px] font-medium text-[#030712]">
                  Membership Settings
                </p>
                <p className="font-public text-[13px] text-[#6A7282]">
                  Configure program type and evaluation rules
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/admin/membership/tiers"
              className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4 transition-colors hover:bg-[#F9FAFB]"
            >
              <div>
                <p className="font-public text-[14px] font-medium text-[#030712]">
                  Tier Configuration
                </p>
                <p className="font-public text-[13px] text-[#6A7282]">
                  Manage tier-specific points multipliers
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
