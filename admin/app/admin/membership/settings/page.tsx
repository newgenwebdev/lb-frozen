"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMembershipSettings } from "@/lib/api/queries";
import { useUpdateMembershipSettings } from "@/lib/api/mutations";
import type { ProgramType, EvaluationTrigger } from "@/lib/types/membership-settings";

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

export default function MembershipSettingsPage(): React.JSX.Element {
  const router = useRouter();
  const { data: settings, isLoading, error } = useMembershipSettings();
  const updateSettings = useUpdateMembershipSettings();

  // Form state
  const [programType, setProgramType] = useState<ProgramType>("free");
  const [price, setPrice] = useState<string>("");
  const [durationMonths, setDurationMonths] = useState<string>("lifetime");
  const [evaluationPeriodMonths, setEvaluationPeriodMonths] = useState<string>("12");
  const [evaluationTrigger, setEvaluationTrigger] = useState<EvaluationTrigger>("both");
  const [autoEnroll, setAutoEnroll] = useState<boolean>(true);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  const [hasChanges, setHasChanges] = useState(false);

  // Sync form state with fetched settings
  useEffect(() => {
    if (settings) {
      setProgramType(settings.program_type);
      setPrice(settings.price > 0 ? (settings.price / 100).toFixed(2) : "");
      setDurationMonths(settings.duration_months?.toString() ?? "lifetime");
      setEvaluationPeriodMonths(settings.evaluation_period_months.toString());
      setEvaluationTrigger(settings.evaluation_trigger);
      setAutoEnroll(settings.auto_enroll_on_first_order);
      setIsEnabled(settings.is_enabled);
      setHasChanges(false);
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings) {
      const priceInCents = Math.round(parseFloat(price || "0") * 100);
      const durationValue = durationMonths === "lifetime" ? null : parseInt(durationMonths);
      const changed =
        programType !== settings.program_type ||
        priceInCents !== settings.price ||
        durationValue !== settings.duration_months ||
        parseInt(evaluationPeriodMonths) !== settings.evaluation_period_months ||
        evaluationTrigger !== settings.evaluation_trigger ||
        autoEnroll !== settings.auto_enroll_on_first_order ||
        isEnabled !== settings.is_enabled;
      setHasChanges(changed);
    }
  }, [programType, price, durationMonths, evaluationPeriodMonths, evaluationTrigger, autoEnroll, isEnabled, settings]);

  const handleCancel = () => {
    if (settings) {
      setProgramType(settings.program_type);
      setPrice(settings.price > 0 ? (settings.price / 100).toFixed(2) : "");
      setDurationMonths(settings.duration_months?.toString() ?? "lifetime");
      setEvaluationPeriodMonths(settings.evaluation_period_months.toString());
      setEvaluationTrigger(settings.evaluation_trigger);
      setAutoEnroll(settings.auto_enroll_on_first_order);
      setIsEnabled(settings.is_enabled);
      setHasChanges(false);
    }
  };

  const handleSave = async () => {
    const priceInCents = Math.round(parseFloat(price || "0") * 100);
    await updateSettings.mutateAsync({
      program_type: programType,
      price: programType === "paid" ? priceInCents : 0,
      duration_months: programType === "paid" && durationMonths !== "lifetime" ? parseInt(durationMonths) : null,
      evaluation_period_months: parseInt(evaluationPeriodMonths),
      evaluation_trigger: evaluationTrigger,
      auto_enroll_on_first_order: autoEnroll,
      is_enabled: isEnabled,
    });
  };

  const durationOptions: DropdownOption[] = [
    { label: "Lifetime", value: "lifetime" },
    { label: "1 Month", value: "1" },
    { label: "3 Months", value: "3" },
    { label: "6 Months", value: "6" },
    { label: "1 Year", value: "12" },
  ];

  const evaluationPeriodOptions: DropdownOption[] = [
    { label: "Last 3 months", value: "3" },
    { label: "Last 6 months", value: "6" },
    { label: "Last 12 months", value: "12" },
    { label: "Last 24 months", value: "24" },
  ];

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
          <p className="text-red-600">Failed to load membership settings</p>
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
            Membership Settings
          </h1>
          <p className="mt-1 font-public text-[14px] text-[#6A7282]">
            Configure your membership program type and rules
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
            disabled={!hasChanges || updateSettings.isPending}
            className={`rounded-lg px-4 py-2 font-public text-[14px] font-medium transition-colors ${
              hasChanges && !updateSettings.isPending
                ? "bg-[#030712] text-white hover:bg-[#1f2937]"
                : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
            }`}
          >
            {updateSettings.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Program Status */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Program Status
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-public text-[14px] font-medium text-[#030712]">
                Enable Membership Program
              </p>
              <p className="font-public text-[13px] text-[#6A7282]">
                When disabled, new customers cannot join the program
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

        {/* Program Type */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Program Type
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setProgramType("free")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                programType === "free"
                  ? "border-[#030712] bg-[#F9FAFB]"
                  : "border-[#E5E7EB] hover:border-[#D1D5DB]"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full border-2 ${
                  programType === "free" ? "border-[#030712] bg-[#030712]" : "border-[#D1D5DB]"
                }`}>
                  {programType === "free" && (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
                <span className="font-geist text-[16px] font-medium text-[#030712]">
                  Free Loyalty Program
                </span>
              </div>
              <p className="font-public text-[13px] text-[#6A7282]">
                All customers automatically join at the base tier. No payment required.
              </p>
            </button>
            <button
              onClick={() => setProgramType("paid")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                programType === "paid"
                  ? "border-[#030712] bg-[#F9FAFB]"
                  : "border-[#E5E7EB] hover:border-[#D1D5DB]"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full border-2 ${
                  programType === "paid" ? "border-[#030712] bg-[#030712]" : "border-[#D1D5DB]"
                }`}>
                  {programType === "paid" && (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
                <span className="font-geist text-[16px] font-medium text-[#030712]">
                  Paid Membership
                </span>
              </div>
              <p className="font-public text-[13px] text-[#6A7282]">
                Customers pay a fee to join the membership program.
              </p>
            </button>
          </div>

          {/* Paid Membership Options */}
          {programType === "paid" && (
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#E5E7EB] pt-6">
              <div>
                <label className="mb-2 block font-public text-[14px] font-medium text-[#030712]">
                  Membership Price
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 18.3327C14.6024 18.3327 18.3334 14.6017 18.3334 9.99935C18.3334 5.39698 14.6024 1.66602 10 1.66602C5.39765 1.66602 1.66669 5.39698 1.66669 9.99935C1.66669 14.6017 5.39765 18.3327 10 18.3327Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 5.83398V14.1673" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12.0833 7.5H8.95833C8.55344 7.5 8.16501 7.66095 7.87871 7.94726C7.59241 8.23356 7.43146 8.62199 7.43146 9.02688C7.43146 9.43177 7.59241 9.8202 7.87871 10.1065C8.16501 10.3928 8.55344 10.5537 8.95833 10.5537H11.0417C11.4466 10.5537 11.835 10.7147 12.1213 11.001C12.4076 11.2873 12.5685 11.6757 12.5685 12.0806C12.5685 12.4855 12.4076 12.8739 12.1213 13.1602C11.835 13.4465 11.4466 13.6075 11.0417 13.6075H7.5" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g $50.00"
                    value={price}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setPrice(value);
                    }}
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2.5 pl-12 pr-4 font-public text-[14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-[#030712]"
                  />
                </div>
              </div>
              <CustomDropdown
                label="Duration"
                value={durationMonths}
                onChange={setDurationMonths}
                options={durationOptions}
              />
            </div>
          )}
        </div>

        {/* Auto-Enrollment */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Auto-Enrollment
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-public text-[14px] font-medium text-[#030712]">
                Enroll customers on first order
              </p>
              <p className="font-public text-[13px] text-[#6A7282]">
                Automatically create membership when a customer places their first order
              </p>
            </div>
            <button
              onClick={() => setAutoEnroll(!autoEnroll)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoEnroll ? "bg-[#10B981]" : "bg-[#E5E7EB]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoEnroll ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Tier Evaluation Rules */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Tier Evaluation Rules
          </h2>
          <div className="space-y-4">
            <div>
              <CustomDropdown
                label="Evaluation Period"
                value={evaluationPeriodMonths}
                onChange={setEvaluationPeriodMonths}
                options={evaluationPeriodOptions}
                className="max-w-xs"
              />
              <p className="mt-2 font-public text-[13px] text-[#6A7282]">
                The rolling period used to calculate customer activity for tier qualification
              </p>
            </div>

            <div className="border-t border-[#E5E7EB] pt-4">
              <label className="mb-2 block font-public text-[14px] font-medium text-[#030712]">
                When to Evaluate Tiers
              </label>
              <p className="mb-3 font-public text-[13px] text-[#6A7282]">
                Choose when the system should check and update customer tiers
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="evaluationTrigger"
                    value="on_order"
                    checked={evaluationTrigger === "on_order"}
                    onChange={() => setEvaluationTrigger("on_order")}
                    className="h-4 w-4 accent-[#030712]"
                  />
                  <div>
                    <span className="font-public text-[14px] text-[#030712]">On Order Placed</span>
                    <p className="font-public text-[12px] text-[#6A7282]">
                      Evaluate tier immediately after each order
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="evaluationTrigger"
                    value="daily"
                    checked={evaluationTrigger === "daily"}
                    onChange={() => setEvaluationTrigger("daily")}
                    className="h-4 w-4 accent-[#030712]"
                  />
                  <div>
                    <span className="font-public text-[14px] text-[#030712]">Daily (Scheduled Job)</span>
                    <p className="font-public text-[12px] text-[#6A7282]">
                      Evaluate all members once per day at 2:00 AM
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="evaluationTrigger"
                    value="both"
                    checked={evaluationTrigger === "both"}
                    onChange={() => setEvaluationTrigger("both")}
                    className="h-4 w-4 accent-[#030712]"
                  />
                  <div>
                    <span className="font-public text-[14px] text-[#030712]">Both</span>
                    <p className="font-public text-[12px] text-[#6A7282]">
                      Evaluate on order and run daily job for downgrades
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Related Settings */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
            Related Settings
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/admin/membership/tiers"
              className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4 transition-colors hover:bg-[#F9FAFB]"
            >
              <div>
                <p className="font-public text-[14px] font-medium text-[#030712]">
                  Tier Configuration
                </p>
                <p className="font-public text-[13px] text-[#6A7282]">
                  Manage tier thresholds and benefits
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/admin/membership/points"
              className="flex items-center justify-between rounded-lg border border-[#E5E7EB] p-4 transition-colors hover:bg-[#F9FAFB]"
            >
              <div>
                <p className="font-public text-[14px] font-medium text-[#030712]">
                  Points Configuration
                </p>
                <p className="font-public text-[13px] text-[#6A7282]">
                  Configure earning and redemption rules
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
