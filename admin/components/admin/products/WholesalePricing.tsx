"use client";

import React from "react";

export type WholesaleTier = {
  minQty: number;
  price: number; // in cents
};

type WholesalePricingProps = {
  tiers: WholesaleTier[];
  onChange: (tiers: WholesaleTier[]) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
};

export function WholesalePricing({
  tiers,
  onChange,
  enabled,
  onEnabledChange,
}: WholesalePricingProps): React.JSX.Element {
  const addTier = (): void => {
    // Calculate next min qty based on last tier
    const lastTier = tiers[tiers.length - 1];
    const nextMinQty = lastTier ? lastTier.minQty + 10 : 1;

    onChange([...tiers, { minQty: nextMinQty, price: 0 }]);
  };

  const removeTier = (index: number): void => {
    const updated = tiers.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateTier = (index: number, field: keyof WholesaleTier, value: number): void => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };

    // Sort tiers by minQty to ensure proper ordering
    updated.sort((a, b) => a.minQty - b.minQty);

    onChange(updated);
  };

  // Calculate max qty for each tier (next tier's minQty - 1, or unlimited for last tier)
  const getMaxQty = (index: number): string => {
    if (index === tiers.length - 1) {
      return "Unlimited";
    }
    const nextTier = tiers[index + 1];
    if (nextTier && nextTier.minQty > tiers[index].minQty) {
      return (nextTier.minQty - 1).toString();
    }
    return "—";
  };

  // Format price from cents to display value
  const formatPrice = (cents: number): string => {
    if (cents === 0) return "";
    return (cents / 100).toFixed(2);
  };

  // Parse price input to cents
  const parsePrice = (value: string): number => {
    const cleanPrice = value.replace(/[^0-9.]/g, "");
    const price = parseFloat(cleanPrice);
    return isNaN(price) ? 0 : Math.round(price * 100);
  };

  return (
    <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
      {/* Header with toggle */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
          </label>
          <h2 className="font-geist text-[16px] font-medium leading-[150%] tracking-[-0.16px] text-[#020817]">
            Wholesale Pricing
          </h2>
        </div>
        {enabled && (
          <button
            type="button"
            onClick={addTier}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3.33333V12.6667M3.33333 8H12.6667" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add Tier
          </button>
        )}
      </div>

      {enabled && (
        <>
          {/* Help text */}
          <p className="mb-4 font-geist text-[13px] text-[#6A7282]">
            Set quantity-based pricing tiers. Max quantity is automatically calculated from the next tier.
          </p>

          {tiers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center">
              <p className="font-geist text-[14px] text-[#6A7282]">
                No pricing tiers added yet
              </p>
              <button
                type="button"
                onClick={addTier}
                className="mt-3 font-geist text-[14px] font-medium text-[#030712] underline hover:no-underline"
              >
                Add your first tier
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB]">
                    <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                      <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                        Tier
                      </span>
                    </th>
                    <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                      <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                        Min Qty
                      </span>
                    </th>
                    <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                      <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                        Max Qty
                      </span>
                    </th>
                    <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                      <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                        Unit Price (SGD)
                      </span>
                    </th>
                    <th className="border-b border-[#E5E7EB] px-4 py-3 text-center w-20">
                      <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                        Action
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier, index) => (
                    <tr key={index} className="bg-white">
                      {/* Tier number */}
                      <td className="border-b border-r border-[#E5E7EB] px-4 py-4">
                        <span className="font-geist text-[14px] font-medium text-[#030712]">
                          Tier {index + 1}
                        </span>
                      </td>

                      {/* Min Qty - editable */}
                      <td className="border-b border-r border-[#E5E7EB] px-4 py-4">
                        <input
                          type="number"
                          value={tier.minQty || ""}
                          onChange={(e) => updateTier(index, "minQty", parseInt(e.target.value) || 1)}
                          min="1"
                          placeholder="1"
                          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                        />
                      </td>

                      {/* Max Qty - auto-calculated, read-only */}
                      <td className="border-b border-r border-[#E5E7EB] px-4 py-4">
                        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                          <span className="font-geist text-[14px] font-normal text-[#6A7282]">
                            {getMaxQty(index)}
                          </span>
                        </div>
                      </td>

                      {/* Unit Price - editable */}
                      <td className="border-b border-r border-[#E5E7EB] px-4 py-4">
                        <input
                          type="number"
                          step="0.01"
                          value={tier.price > 0 ? tier.price / 100 : ""}
                          onChange={(e) => updateTier(index, "price", parsePrice(e.target.value))}
                          min="0"
                          placeholder="0.00"
                          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                        />
                      </td>

                      {/* Action - delete */}
                      <td className="border-b border-[#E5E7EB] px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeTier(index)}
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-[#6A7282] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                          title="Remove tier"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4H14M5.33333 4V2.66667C5.33333 2.29848 5.63181 2 6 2H10C10.3682 2 10.6667 2.29848 10.6667 2.66667V4M12.6667 4V13.3333C12.6667 13.7015 12.3682 14 12 14H4C3.63181 14 3.33333 13.7015 3.33333 13.3333V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Validation warnings */}
          {tiers.length > 0 && (
            <div className="mt-4 space-y-2">
              {/* Check for duplicate or invalid min quantities */}
              {tiers.some((tier, i) =>
                tiers.findIndex(t => t.minQty === tier.minQty) !== i
              ) && (
                <p className="font-geist text-[12px] text-[#DC2626]">
                  Warning: Duplicate minimum quantities detected. Each tier should have a unique min qty.
                </p>
              )}
              {/* Check for tiers with 0 price */}
              {tiers.some(tier => tier.price === 0) && (
                <p className="font-geist text-[12px] text-[#F59E0B]">
                  Note: Some tiers have no price set yet.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
