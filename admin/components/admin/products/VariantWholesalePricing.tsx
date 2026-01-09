"use client";

import React, { useState, useEffect } from "react";
import type { WholesaleTierFormData } from "@/lib/validators/product";

type VariantWholesalePricingProps = {
  isOpen: boolean;
  onClose: () => void;
  variantTitle: string;
  basePrice: number; // in cents
  enabled: boolean;
  tiers: WholesaleTierFormData[];
  onSave: (enabled: boolean, tiers: WholesaleTierFormData[]) => void;
};

export function VariantWholesalePricing({
  isOpen,
  onClose,
  variantTitle,
  basePrice,
  enabled,
  tiers,
  onSave,
}: VariantWholesalePricingProps): React.JSX.Element | null {
  // Local state for editing
  const [localEnabled, setLocalEnabled] = useState(enabled);
  const [localTiers, setLocalTiers] = useState<WholesaleTierFormData[]>(tiers);

  // Sync with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalEnabled(enabled);
      setLocalTiers(tiers.length > 0 ? [...tiers] : []);
    }
  }, [isOpen, enabled, tiers]);

  if (!isOpen) return null;

  const addTier = (): void => {
    const lastTier = localTiers[localTiers.length - 1];
    const nextMinQty = lastTier ? lastTier.minQty + 10 : 2;
    // Default to 10% less than base price or last tier price
    const defaultPrice = lastTier
      ? Math.round(lastTier.price * 0.9)
      : Math.round(basePrice * 0.9);

    setLocalTiers([...localTiers, { minQty: nextMinQty, price: defaultPrice }]);
  };

  const removeTier = (index: number): void => {
    setLocalTiers(localTiers.filter((_, i) => i !== index));
  };

  const updateTier = (
    index: number,
    field: keyof WholesaleTierFormData,
    value: number
  ): void => {
    const updated = [...localTiers];
    updated[index] = { ...updated[index], [field]: value };
    // Sort by minQty
    updated.sort((a, b) => a.minQty - b.minQty);
    setLocalTiers(updated);
  };

  const getMaxQty = (index: number): string => {
    if (index === localTiers.length - 1) {
      return "Unlimited";
    }
    const nextTier = localTiers[index + 1];
    if (nextTier && nextTier.minQty > localTiers[index].minQty) {
      return (nextTier.minQty - 1).toString();
    }
    return "—";
  };

  const getSavingsPercent = (tierPrice: number): string => {
    if (basePrice <= 0 || tierPrice >= basePrice) return "0%";
    const savings = ((basePrice - tierPrice) / basePrice) * 100;
    return `${savings.toFixed(0)}%`;
  };

  const handleSave = (): void => {
    // Validate tiers before saving
    const validTiers = localTiers.filter((t) => t.minQty > 1 && t.price > 0);
    onSave(localEnabled, validTiers);
    onClose();
  };

  const handleCancel = (): void => {
    // Reset to original values
    setLocalEnabled(enabled);
    setLocalTiers(tiers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-geist text-[18px] font-semibold text-[#030712]">
              Wholesale Pricing
            </h2>
            <p className="mt-1 font-geist text-[14px] text-[#6A7282]">
              {variantTitle} • Base price: SGD {(basePrice / 100).toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="cursor-pointer rounded-lg p-2 text-[#6A7282] transition-colors hover:bg-[#F3F4F6] hover:text-[#030712]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Enable Toggle */}
        <div className="mb-6 flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={localEnabled}
              onChange={(e) => setLocalEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
          </label>
          <span className="font-geist text-[14px] font-medium text-[#030712]">
            Enable wholesale pricing for this variant
          </span>
        </div>

        {localEnabled && (
          <>
            {/* Help text */}
            <p className="mb-4 font-geist text-[13px] text-[#6A7282]">
              Set quantity-based pricing tiers. Customers buying more units get lower prices.
            </p>

            {/* Add Tier Button */}
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={addTier}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M8 3.33333V12.6667M3.33333 8H12.6667"
                    stroke="#030712"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Add Tier
              </button>
            </div>

            {localTiers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center">
                <p className="font-geist text-[14px] text-[#6A7282]">
                  No pricing tiers added yet
                </p>
                <button
                  type="button"
                  onClick={addTier}
                  className="mt-3 cursor-pointer font-geist text-[14px] font-medium text-[#030712] underline hover:no-underline"
                >
                  Add your first tier
                </button>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[#E5E7EB]">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-[#F9FAFB]">
                    <tr>
                      <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                        <span className="font-geist text-[14px] font-medium text-[#6A7282]">
                          Tier
                        </span>
                      </th>
                      <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                        <span className="font-geist text-[14px] font-medium text-[#6A7282]">
                          Min Qty
                        </span>
                      </th>
                      <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                        <span className="font-geist text-[14px] font-medium text-[#6A7282]">
                          Max Qty
                        </span>
                      </th>
                      <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                        <span className="font-geist text-[14px] font-medium text-[#6A7282]">
                          Unit Price (SGD)
                        </span>
                      </th>
                      <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                        <span className="font-geist text-[14px] font-medium text-[#6A7282]">
                          Savings
                        </span>
                      </th>
                      <th className="w-16 border-b border-[#E5E7EB] px-4 py-3 text-center">
                        <span className="font-geist text-[14px] font-medium text-[#6A7282]">
                          Action
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {localTiers.map((tier, index) => (
                      <tr key={index} className="bg-white">
                        <td className="border-b border-r border-[#E5E7EB] px-4 py-3">
                          <span className="font-geist text-[14px] font-medium text-[#030712]">
                            Tier {index + 1}
                          </span>
                        </td>
                        <td className="border-b border-r border-[#E5E7EB] px-4 py-3">
                          <input
                            type="number"
                            value={tier.minQty || ""}
                            onChange={(e) =>
                              updateTier(
                                index,
                                "minQty",
                                parseInt(e.target.value) || 2
                              )
                            }
                            min="2"
                            placeholder="2"
                            className="w-20 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-geist text-[14px] text-[#030712] outline-none focus:border-black"
                          />
                        </td>
                        <td className="border-b border-r border-[#E5E7EB] px-4 py-3">
                          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                            <span className="font-geist text-[14px] text-[#6A7282]">
                              {getMaxQty(index)}
                            </span>
                          </div>
                        </td>
                        <td className="border-b border-r border-[#E5E7EB] px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={tier.price > 0 ? tier.price / 100 : ""}
                            onChange={(e) => {
                              const cleanPrice = e.target.value.replace(
                                /[^0-9.]/g,
                                ""
                              );
                              const price = parseFloat(cleanPrice);
                              updateTier(
                                index,
                                "price",
                                isNaN(price) ? 0 : Math.round(price * 100)
                              );
                            }}
                            min="0"
                            placeholder="0.00"
                            className="w-24 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-geist text-[14px] text-[#030712] outline-none focus:border-black"
                          />
                        </td>
                        <td className="border-b border-r border-[#E5E7EB] px-4 py-3">
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 font-geist text-[12px] font-medium text-green-700">
                            {getSavingsPercent(tier.price)}
                          </span>
                        </td>
                        <td className="border-b border-[#E5E7EB] px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeTier(index)}
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 text-[#6A7282] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                            title="Remove tier"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M2 4H14M5.33333 4V2.66667C5.33333 2.29848 5.63181 2 6 2H10C10.3682 2 10.6667 2.29848 10.6667 2.66667V4M12.6667 4V13.3333C12.6667 13.7015 12.3682 14 12 14H4C3.63181 14 3.33333 13.7015 3.33333 13.3333V4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
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
            {localTiers.length > 0 && (
              <div className="mt-4 space-y-2">
                {localTiers.some(
                  (tier, i) =>
                    localTiers.findIndex((t) => t.minQty === tier.minQty) !== i
                ) && (
                  <p className="font-geist text-[12px] text-[#DC2626]">
                    Warning: Duplicate minimum quantities detected.
                  </p>
                )}
                {localTiers.some((tier) => tier.price === 0) && (
                  <p className="font-geist text-[12px] text-[#F59E0B]">
                    Note: Some tiers have no price set yet.
                  </p>
                )}
                {localTiers.some((tier) => tier.price >= basePrice) && (
                  <p className="font-geist text-[12px] text-[#F59E0B]">
                    Warning: Some tier prices are not lower than the base price.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="cursor-pointer rounded-lg bg-[#030712] px-4 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-[#1f2937]"
          >
            Save Tiers
          </button>
        </div>
      </div>
    </div>
  );
}
