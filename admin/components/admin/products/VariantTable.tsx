"use client";

import React, { useEffect, useState } from "react";
import type { ProductVariantFormData, WholesaleTierFormData } from "@/lib/validators/product";
import { VariantWholesalePricing } from "./VariantWholesalePricing";

type VariantTableProps = {
  variants: ProductVariantFormData[];
  variantTypes: Array<{ type: string; values: string[] }>;
  onChange: (variants: ProductVariantFormData[]) => void;
  globalDiscountEnabled?: boolean;
  onGlobalDiscountToggle?: (enabled: boolean) => void;
  globalDiscountType?: "percentage" | "fixed";
  onGlobalDiscountTypeChange?: (type: "percentage" | "fixed") => void;
  globalDiscountValue?: number;
  onGlobalDiscountValueChange?: (value: number) => void;
  showDeleteButton?: boolean;
  onDeleteVariant?: (index: number) => void;
};

export function VariantTable({
  variants,
  variantTypes,
  onChange,
  globalDiscountEnabled = false,
  onGlobalDiscountToggle,
  globalDiscountType = "percentage",
  onGlobalDiscountTypeChange,
  globalDiscountValue = 0,
  onGlobalDiscountValueChange,
  showDeleteButton = false,
  onDeleteVariant,
}: VariantTableProps): React.JSX.Element {
  // State for wholesale pricing modal
  const [wholesaleModalOpen, setWholesaleModalOpen] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);
  const [variantInventory, setVariantInventory] = useState<Array<{ stocked: number; reserved: number; available: number }>>([]);

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { getVariantInventoryDetails } = await import("@/lib/api/inventory")
        const results = await Promise.all(
          variants.map((v) => getVariantInventoryDetails(v.id, v.sku))
        )
        if (mounted) setVariantInventory(results)
      } catch (err) {
        // ignore errors, leave inventory empty
      }
    })()
    return () => {
      mounted = false
    }
  }, [variants])

  const handleVariantChange = (
    index: number,
    field: keyof ProductVariantFormData,
    value: string | number | File | null
  ): void => {
    const updated = [...variants];
    if (field === "title") {
      updated[index] = { ...updated[index], title: value as string };
    } else if (
      field === "inventory_quantity" ||
      field === "min_stock_alert" ||
      field === "weight" ||
      field === "discount"
    ) {
      updated[index] = {
        ...updated[index],
        [field]: value ? Number(value) : 0,
      };
    }
    onChange(updated);
  };

  const handlePriceChange = (index: number, priceValue: string): void => {
    const updated = [...variants];
    // Remove non-numeric characters except decimal point
    const cleanPrice = priceValue.replace(/[^0-9.]/g, "");
    const price = parseFloat(cleanPrice);
    const amount = isNaN(price) ? 0 : Math.round(price * 100);

    // Ensure prices array exists
    if (!updated[index].prices || updated[index].prices.length === 0) {
      updated[index].prices = [{ currency_code: "myr", amount }];
    } else {
      updated[index].prices[0] = {
        ...updated[index].prices[0],
        amount,
      };
    }
    onChange(updated);
  };

  // Handle wholesale pricing save
  const handleWholesaleSave = (
    enabled: boolean,
    tiers: WholesaleTierFormData[]
  ): void => {
    if (selectedVariantIndex === null) return;
    const updated = [...variants];
    updated[selectedVariantIndex] = {
      ...updated[selectedVariantIndex],
      wholesaleEnabled: enabled,
      wholesaleTiers: tiers,
    };
    onChange(updated);
  };

  // Open wholesale modal for a variant
  const openWholesaleModal = (index: number): void => {
    setSelectedVariantIndex(index);
    setWholesaleModalOpen(true);
  };

  // Helper to format price from cents to display value
  const formatPrice = (cents: number): string => {
    return (cents / 100).toFixed(2);
  };

  // Helper to get variant option value by type
  const getOptionValue = (variant: ProductVariantFormData, type: string): string => {
    return variant.options?.[type] || "";
  };

  // Get base price for a variant (first price in array, no min_quantity)
  const getVariantBasePrice = (variant: ProductVariantFormData): number => {
    if (!variant.prices || variant.prices.length === 0) return 0;
    // Find base price (no min_quantity or min_quantity <= 1)
    const basePrice = variant.prices.find(
      (p) => !p.min_quantity || p.min_quantity <= 1
    );
    return basePrice?.amount || variant.prices[0].amount || 0;
  };

  // Get wholesale tiers count display
  const getWholesaleDisplay = (variant: ProductVariantFormData): React.JSX.Element => {
    if (!variant.wholesaleEnabled || !variant.wholesaleTiers || variant.wholesaleTiers.length === 0) {
      return (
        <span className="font-geist text-[13px] text-[#9CA3AF]">Not set</span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-geist text-[12px] font-medium text-green-700">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M10 3L4.5 8.5L2 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {variant.wholesaleTiers.length} tier{variant.wholesaleTiers.length > 1 ? "s" : ""}
      </span>
    );
  };

  if (variants.length === 0) {
    return (
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-12 text-center">
        <p className="font-geist text-[16px] font-normal tracking-[-0.16px] text-[#6A7282]">
          No Variants Created
        </p>
        <p className="mt-2 font-public text-[14px] text-[#6A7282]">
          Select variant types and add options to generate variants
        </p>
      </div>
    );
  }

  const selectedVariant = selectedVariantIndex !== null ? variants[selectedVariantIndex] : null;

  return (
    <div className="space-y-4">
      {/* Set Discount Global Toggle */}
      <div className="space-y-4">
        {/* Toggle Row */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={globalDiscountEnabled}
              onChange={(e) => onGlobalDiscountToggle?.(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
          </label>
          <span className="font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Set Discount Global
          </span>
        </div>

        {/* Discount Type and Value Fields - shown when enabled */}
        {globalDiscountEnabled && (
          <div className="grid grid-cols-2 gap-4">
            {/* Discount Type */}
            <div>
              <label className="mb-2 block font-geist text-[14px] font-normal text-[#6A7282]">
                Discount Type
              </label>
              <div className="relative">
                <select
                  value={globalDiscountType}
                  onChange={(e) => onGlobalDiscountTypeChange?.(e.target.value as "percentage" | "fixed")}
                  className="w-full cursor-pointer appearance-none rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors hover:border-[#999] focus:border-black"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="#6A7282"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Discount Value */}
            <div>
              <label className="mb-2 block font-geist text-[14px] font-normal text-[#6A7282]">
                Discount Value
              </label>
              <input
                type="number"
                value={globalDiscountValue || ""}
                onChange={(e) => onGlobalDiscountValueChange?.(Number(e.target.value) || 0)}
                placeholder="e.g. 10"
                min="0"
                max={globalDiscountType === "percentage" ? 100 : undefined}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] hover:border-[#999] focus:border-black"
              />
            </div>
          </div>
        )}
      </div>

      {/* Variant Table */}
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB]">
                {/* Dynamic columns for each variant type */}
                {variantTypes.map((variantType) => (
                  <th
                    key={variantType.type}
                    className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left"
                  >
                    <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                      {variantType.type}
                    </span>
                  </th>
                ))}

                {/* Fixed columns */}
                <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                  <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                    Price
                  </span>
                </th>
                <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                  <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                    Inventory
                  </span>
                </th>
                <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                  <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                    Wholesale
                  </span>
                </th>
                <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                  <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                    Quantity
                  </span>
                </th>
                <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                  <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                    Discount
                  </span>
                </th>
                <th className="border-b border-r border-[#E5E7EB] px-4 py-3 text-left">
                  <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                    Min Stock Alert
                  </span>
                </th>
                <th className="border-b border-[#E5E7EB] px-4 py-3 text-left">
                  <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">
                    Weight (g)
                  </span>
                </th>
                {showDeleteButton && (
                  <th className="border-b border-l border-[#E5E7EB] px-4 py-3 text-center w-16">
                    <span className="font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#6A7282]">

                    </span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, index) => (
                <tr key={index} className="bg-white">
                  {/* Dynamic columns for variant option values */}
                  {variantTypes.map((variantType) => (
                    <td
                      key={variantType.type}
                      className="border-b border-r border-[#E5E7EB] px-4 py-4"
                    >
                      <span className="font-geist text-[14px] font-normal leading-[150%] tracking-[-0.14px] text-[#030712]">
                        {getOptionValue(variant, variantType.type)}
                      </span>
                    </td>
                  ))}

                  {/* Price */}
                  <td className="border-b border-r border-[#E5E7EB] px-4 py-4">
                    <input
                      type="number"
                      step="0.01"
                      value={
                        variant.prices && variant.prices.length > 0 && variant.prices[0].amount > 0
                          ? variant.prices[0].amount / 100
                          : ""
                      }
                      onChange={(e) => handlePriceChange(index, e.target.value)}
                      placeholder="0.00"
                      min="0"
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                    />
                  </td>

                  {/* Inventory Breakdown */}
                  <td className="border-b border-r border-[#E5E7EB] px-4 py-4">
                    <div className="flex flex-col text-sm text-[#6A7282]">
                      {variantInventory && variantInventory[index] ? (
                        <>
                          <span className="font-geist">Total: {variantInventory[index].stocked}</span>
                          <span className="font-geist">Reserved: {variantInventory[index].reserved}</span>
                          <span className="font-geist">Available: {variantInventory[index].available}</span>
                        </>
                      ) : (
                        <span className="font-geist text-[13px] text-[#9CA3AF]">No data</span>
                      )}
                    </div>
                  </td>

                  {/* Wholesale */}
                  <td className="border-b border-r border-[#E5E7EB] px-2 py-4">
                    <button
                      type="button"
                      onClick={() => openWholesaleModal(index)}
                      className="inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 transition-colors hover:bg-[#F9FAFB]"
                    >
                      {getWholesaleDisplay(variant)}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 14 14"
                        fill="none"
                        className="shrink-0"
                      >
                        <path
                          d="M2.91667 7.58333H6.41667V11.0833M11.0833 6.41667H7.58333V2.91667M6.41667 7.58333L2.33333 11.6667M7.58333 6.41667L11.6667 2.33333"
                          stroke="#6A7282"
                          strokeWidth="1.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>

                  {/* Quantity */}
                  <td className="border-b border-r border-[#E5E7EB] px-4 py-4">
                    <input
                      type="number"
                      value={variant.inventory_quantity || 0}
                      onChange={(e) =>
                        handleVariantChange(
                          index,
                          "inventory_quantity",
                          e.target.value
                        )
                      }
                      placeholder="0"
                      min="0"
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                    />
                  </td>

                  {/* Discount */}
                  <td className="border-b border-r border-[#E5E7EB] px-4 py-4">
                    {globalDiscountEnabled ? (
                      <div className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                        <span className="font-geist text-[14px] font-normal text-[#6A7282]">
                          {globalDiscountType === "percentage"
                            ? `${globalDiscountValue || 0}%`
                            : `$ ${globalDiscountValue || 0}`}
                        </span>
                        <span className="font-geist text-[10px] text-[#9CA3AF]">
                          (global)
                        </span>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="number"
                          value={variant.discount || ""}
                          onChange={(e) =>
                            handleVariantChange(index, "discount", e.target.value)
                          }
                          placeholder="0"
                          min="0"
                          max="100"
                          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 pr-8 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-geist text-[12px] text-[#6A7282]">
                          %
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Min Stock Alert */}
                  <td className="border-b border-r border-[#E5E7EB] px-4 py-4">
                    <input
                      type="number"
                      value={variant.min_stock_alert || ""}
                      onChange={(e) =>
                        handleVariantChange(
                          index,
                          "min_stock_alert",
                          e.target.value
                        )
                      }
                      placeholder="0"
                      min="0"
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                    />
                  </td>

                  {/* Weight */}
                  <td className="border-b border-[#E5E7EB] px-4 py-4">
                    <input
                      type="number"
                      value={variant.weight || ""}
                      onChange={(e) =>
                        handleVariantChange(index, "weight", e.target.value)
                      }
                      placeholder="0"
                      min="0"
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                    />
                  </td>

                  {/* Delete Button */}
                  {showDeleteButton && (
                    <td className="border-b border-l border-[#E5E7EB] px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteVariant?.(index)}
                        className="inline-flex cursor-pointer items-center justify-center rounded p-1.5 text-[#6A7282] transition-colors hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                        title="Delete variant"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M13.4583 17.5H6.54167C5.675 17.5 4.95 16.825 4.88333 15.9583L4.1375 5.83333H15.8458L15.1125 15.95C15.0479 16.8229 14.3229 17.5 13.4583 17.5Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10 9.16667V14.1667"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M3.33333 5.83333H16.6667"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14.1667 5.83333L13.3808 3.60417C13.2433 3.20333 12.8658 2.9375 12.4408 2.9375H7.55917C7.13417 2.9375 6.75667 3.20333 6.61917 3.60417L5.83333 5.83333"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12.8583 9.16667L12.5 14.1667"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M7.14167 9.16667L7.5 14.1667"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wholesale Pricing Modal */}
      {selectedVariant && (
        <VariantWholesalePricing
          isOpen={wholesaleModalOpen}
          onClose={() => {
            setWholesaleModalOpen(false);
            setSelectedVariantIndex(null);
          }}
          variantTitle={selectedVariant.title}
          basePrice={getVariantBasePrice(selectedVariant)}
          enabled={selectedVariant.wholesaleEnabled || false}
          tiers={selectedVariant.wholesaleTiers || []}
          onSave={handleWholesaleSave}
        />
      )}
    </div>
  );
}
