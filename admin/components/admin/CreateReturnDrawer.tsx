"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CreateReturnRequest, ReturnType, ReturnReason, CanReturnResponse } from "@/lib/validators/return";

type CreateReturnDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  canReturnData: CanReturnResponse | null;
  orderId: string;
  onSubmit: (data: CreateReturnRequest) => void;
  isSubmitting?: boolean;
};

// Return reason options
const returnReasonOptions: { value: ReturnReason; label: string }[] = [
  { value: "defective", label: "Defective/Damaged" },
  { value: "wrong_item", label: "Wrong Item Received" },
  { value: "not_as_described", label: "Not As Described" },
  { value: "changed_mind", label: "Changed Mind" },
  { value: "other", label: "Other" },
];

// Return type options
const returnTypeOptions: { value: ReturnType; label: string; description: string }[] = [
  { value: "refund", label: "Refund", description: "Refund to original payment method" },
  { value: "replacement", label: "Replacement", description: "Send a replacement item" },
];

export function CreateReturnDrawer({
  isOpen,
  onClose,
  canReturnData,
  orderId,
  onSubmit,
  isSubmitting = false,
}: CreateReturnDrawerProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [returnType, setReturnType] = useState<ReturnType>("refund");
  const [reason, setReason] = useState<ReturnReason>("defective");
  const [reasonDetails, setReasonDetails] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setReturnType("refund");
      setReason("defective");
      setReasonDetails("");
      setAdminNotes("");
      // Initialize selected items with all returnable items
      if (canReturnData?.returnable_items) {
        const initial = new Map<string, number>();
        canReturnData.returnable_items.forEach((item) => {
          initial.set(item.item_id, item.returnable_quantity);
        });
        setSelectedItems(initial);
      }
    }
  }, [isOpen, canReturnData]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const formatCurrency = (amount: number): string => {
    return `$ ${(amount / 100).toFixed(2)}`;
  };

  const handleItemQuantityChange = (itemId: string, quantity: number, maxQuantity: number): void => {
    const newMap = new Map(selectedItems);
    if (quantity <= 0) {
      newMap.delete(itemId);
    } else {
      newMap.set(itemId, Math.min(quantity, maxQuantity));
    }
    setSelectedItems(newMap);
  };

  // Calculate total refund amount (using discount-adjusted values)
  // When returning all items, use refund_total for exact amount (no rounding errors)
  // For partial returns, use refund_per_unit * quantity + remainder if returning last units
  const calculateTotalRefund = (): number => {
    if (!canReturnData?.returnable_items) return 0;
    let total = 0;
    selectedItems.forEach((quantity, itemId) => {
      const item = canReturnData.returnable_items!.find((i) => i.item_id === itemId);
      if (item) {
        // If returning all returnable items, use refund_total for exact amount
        if (quantity === item.returnable_quantity && item.refund_total !== undefined) {
          total += item.refund_total;
        } else {
          // For partial returns, use per-unit amount
          const perUnitRefund = item.refund_per_unit ?? item.unit_price;
          total += perUnitRefund * quantity;
        }
      }
    });
    return total;
  };

  // Check if discounts were applied to the order
  const hasDiscounts = canReturnData?.discount_info && canReturnData.discount_info.total_discounts > 0;

  const handleSubmit = (): void => {
    if (!canReturnData?.returnable_items || selectedItems.size === 0) return;

    const items = Array.from(selectedItems.entries()).map(([itemId, quantity]) => {
      const item = canReturnData.returnable_items!.find((i) => i.item_id === itemId)!;
      return {
        item_id: itemId,
        variant_id: item.variant_id,
        product_name: item.product_name,
        quantity,
        unit_price: item.unit_price,
      };
    });

    const totalRefund = calculateTotalRefund();

    const data: CreateReturnRequest = {
      order_id: orderId,
      return_type: returnType,
      reason,
      reason_details: reasonDetails || undefined,
      items,
      refund_amount: totalRefund,
      shipping_refund: 0,
      admin_notes: adminNotes || undefined,
    };

    onSubmit(data);
  };

  if (!mounted) return null;

  const totalRefund = calculateTotalRefund();
  const hasSelectedItems = selectedItems.size > 0;

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-100 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-101 flex h-full w-full transform flex-col bg-white transition-transform duration-300 ease-in-out sm:w-[520px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white p-4 md:p-6">
          <h2 className="font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712]">
            Create Return Request
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#F5F5F5]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="#030712"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Return Window Info */}
          {canReturnData?.days_remaining !== undefined && (
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <p className="font-geist text-[14px] text-blue-700">
                <span className="font-medium">{canReturnData.days_remaining} days</span> remaining in return window
              </p>
            </div>
          )}

          {/* Return Type Selection */}
          <div className="mb-6">
            <label className="mb-3 block font-geist text-[14px] font-medium text-[#030712]">
              Return Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {returnTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setReturnType(option.value)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    returnType === option.value
                      ? "border-[#030712] bg-[#030712] text-white"
                      : "border-[#E5E7EB] bg-white text-[#030712] hover:border-[#D1D5DB]"
                  }`}
                >
                  <p className="font-geist text-[14px] font-medium">{option.label}</p>
                  <p className={`font-geist text-[12px] ${returnType === option.value ? "text-gray-300" : "text-[#6B7280]"}`}>
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Return Reason */}
          <div className="mb-6">
            <label className="mb-3 block font-geist text-[14px] font-medium text-[#030712]">
              Return Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReturnReason)}
              className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-[#E5E7EB] bg-white px-3 pr-8 font-geist text-[14px] text-[#030712] transition-colors hover:border-[#D1D5DB] focus:border-[#030712] focus:outline-none"
            >
              {returnReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason Details */}
          <div className="mb-6">
            <label className="mb-3 block font-geist text-[14px] font-medium text-[#030712]">
              Additional Details <span className="text-[#6B7280]">(Optional)</span>
            </label>
            <textarea
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder="Describe the issue in more detail..."
              className="h-20 w-full resize-none rounded-lg border border-[#E5E7EB] p-3 font-geist text-[14px] focus:border-[#030712] focus:outline-none"
            />
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-[#E5E7EB]"></div>

          {/* Discount Info Banner */}
          {hasDiscounts && canReturnData?.discount_info && (
            <div className="mb-6 rounded-lg bg-amber-50 p-4">
              <p className="mb-2 font-geist text-[14px] font-medium text-amber-800">
                Original Order Had Discounts Applied
              </p>
              <div className="space-y-1 font-geist text-[12px] text-amber-700">
                {canReturnData.discount_info.coupon_code && canReturnData.discount_info.coupon_discount > 0 && (
                  <p>Coupon ({canReturnData.discount_info.coupon_code}): -{formatCurrency(canReturnData.discount_info.coupon_discount)}</p>
                )}
                {canReturnData.discount_info.points_discount > 0 && (
                  <p>Points ({canReturnData.discount_info.points_redeemed.toLocaleString()} pts): -{formatCurrency(canReturnData.discount_info.points_discount)}</p>
                )}
                {canReturnData.discount_info.pwp_discount > 0 && (
                  <p>PWP Discount: -{formatCurrency(canReturnData.discount_info.pwp_discount)}</p>
                )}
              </div>
              <p className="mt-2 font-geist text-[11px] text-amber-600">
                Refund amounts reflect what the customer actually paid after discounts.
              </p>
            </div>
          )}

          {/* Select Items */}
          <div className="mb-6">
            <label className="mb-3 block font-geist text-[14px] font-medium text-[#030712]">
              Select Items to Return
            </label>
            <div className="space-y-3">
              {canReturnData?.returnable_items?.map((item) => {
                const selectedQty = selectedItems.get(item.item_id) || 0;
                const isSelected = selectedQty > 0;

                return (
                  <div
                    key={item.item_id}
                    className={`rounded-lg border p-4 transition-all ${
                      isSelected ? "border-[#030712] bg-[#FAFAFA]" : "border-[#E5E7EB] bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="pt-1">
                        <label className="flex cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleItemQuantityChange(item.item_id, item.returnable_quantity, item.returnable_quantity);
                              } else {
                                handleItemQuantityChange(item.item_id, 0, item.returnable_quantity);
                              }
                            }}
                            className="peer sr-only"
                          />
                          <div className="flex h-5 w-5 items-center justify-center rounded border border-[#E3E3E3] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100">
                            <svg className="h-3 w-3 text-white opacity-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </label>
                      </div>

                      {/* Item Info */}
                      <div className="flex-1">
                        <p className="font-geist text-[14px] font-medium text-[#030712]">{item.product_name}</p>
                        <p className="font-geist text-[12px] text-[#6B7280]">
                          {item.refund_per_unit && item.refund_per_unit !== item.unit_price ? (
                            <>
                              <span className="line-through">{formatCurrency(item.unit_price)}</span>
                              {" → "}
                              <span className="text-green-600">{formatCurrency(item.refund_per_unit)}</span>
                              {" each | Max: "}{item.returnable_quantity}
                            </>
                          ) : (
                            <>{formatCurrency(item.unit_price)} each | Max: {item.returnable_quantity}</>
                          )}
                        </p>
                      </div>

                      {/* Quantity Selector */}
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleItemQuantityChange(item.item_id, selectedQty - 1, item.returnable_quantity)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white transition-colors hover:bg-[#F5F5F5]"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-geist text-[14px] font-medium">{selectedQty}</span>
                          <button
                            onClick={() => handleItemQuantityChange(item.item_id, selectedQty + 1, item.returnable_quantity)}
                            disabled={selectedQty >= item.returnable_quantity}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white transition-colors hover:bg-[#F5F5F5] disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Item Total */}
                    {isSelected && (
                      <div className="mt-2 flex justify-end">
                        <p className="font-geist text-[14px] font-medium text-[#030712]">
                          {formatCurrency(
                            // Use refund_total when returning all items for exact amount
                            selectedQty === item.returnable_quantity && item.refund_total !== undefined
                              ? item.refund_total
                              : (item.refund_per_unit ?? item.unit_price) * selectedQty
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-[#E5E7EB]"></div>

          {/* Admin Notes */}
          <div className="mb-6">
            <label className="mb-3 block font-geist text-[14px] font-medium text-[#030712]">
              Admin Notes <span className="text-[#6B7280]">(Optional)</span>
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this return..."
              className="h-20 w-full resize-none rounded-lg border border-[#E5E7EB] p-3 font-geist text-[14px] focus:border-[#030712] focus:outline-none"
            />
          </div>

          {/* Refund Summary */}
          {hasSelectedItems && returnType === "refund" && (
            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-geist text-[14px] font-medium text-green-800">Total Refund Amount</span>
                <span className="font-geist text-[18px] font-bold text-green-800">
                  {formatCurrency(totalRefund)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        <div className="shrink-0 border-t border-[#E5E7EB] bg-white p-4 md:p-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!hasSelectedItems || isSubmitting}
              className="flex-1 rounded-lg bg-[#030712] px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937] disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Return"}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}
