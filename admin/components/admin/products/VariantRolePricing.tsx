"use client";

import React from "react";
import type { VariantRolePricesFormData } from "@/lib/validators/product";

type VariantRolePricingProps = {
  prices: VariantRolePricesFormData;
  onChange: (prices: VariantRolePricesFormData) => void;
  basePriceCents?: number;
};

const ROLE_FIELDS: Array<{
  key: keyof VariantRolePricesFormData;
  label: string;
  hint: string;
}> = [
  {
    key: "vip",
    label: "VIP Price",
    hint: "Shown to customers with VIP role. Leave blank to use default price.",
  },
  {
    key: "supplier",
    label: "Supplier Price",
    hint: "Shown to customers with Supplier role. Leave blank to use default price.",
  },
];

// Display value while editing — no forced 2-decimal so users can freely
// type "10", "100", "0.5" etc. without the input snapping to ".00".
function centsToInput(cents: number | undefined): string {
  if (cents === undefined || cents === null) return "";
  return String(cents / 100);
}

// Display with 2 decimals — used for hint text & "Currently:" label.
function centsToDisplay(cents: number | undefined): string {
  if (cents === undefined || cents === null) return "";
  return (cents / 100).toFixed(2);
}

function inputToCents(value: string): number | undefined {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (cleaned === "") return undefined;
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

export function VariantRolePricing({
  prices,
  onChange,
  basePriceCents,
}: VariantRolePricingProps): React.JSX.Element {
  const updateRolePrice = (
    key: keyof VariantRolePricesFormData,
    raw: string
  ): void => {
    const cents = inputToCents(raw);
    const next = { ...prices };
    if (cents === undefined) {
      delete next[key];
    } else {
      next[key] = cents;
    }
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-geist text-[14px] font-medium text-[#020817]">
            Role-Based Pricing
          </h3>
          <p className="font-geist text-[12px] text-[#6A7282]">
            Override the default price for specific customer roles.
            {basePriceCents !== undefined && (
              <>
                {" "}
                Default: <span className="font-medium text-[#030712]">RM{centsToDisplay(basePriceCents)}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROLE_FIELDS.map((field) => {
          const value = prices?.[field.key];
          return (
            <div key={field.key}>
              <div className="mb-1 flex items-center justify-between">
                <label
                  className="block font-geist text-[13px] font-medium text-[#030712]"
                  htmlFor={`role-price-${field.key}`}
                >
                  {field.label}
                </label>
                {value !== undefined && (
                  <button
                    type="button"
                    onClick={() => updateRolePrice(field.key, "")}
                    className="font-geist text-[11px] text-[#6A7282] underline hover:text-[#030712]"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-geist text-[14px] text-[#6A7282]">
                  RM
                </span>
                <input
                  id={`role-price-${field.key}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={centsToInput(value)}
                  onChange={(e) => updateRolePrice(field.key, e.target.value)}
                  placeholder="Use default price"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-3 font-geist text-[14px] text-[#030712] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                />
              </div>
              <p className="mt-1 font-geist text-[11px] text-[#9CA3AF]">
                {value !== undefined
                  ? `Currently: RM${centsToDisplay(value)}`
                  : field.hint}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
