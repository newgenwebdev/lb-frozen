"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Order } from "@/lib/validators/order";
import type { EasyParcelShippingInfo } from "@/lib/api/easyparcel";

type EasyParcelShippingDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  shippingInfo: EasyParcelShippingInfo | null;
  onSubmit: (data: {
    weight: number;
    content: string;
    pickup_date: string;
    pickup_time: string;
  }) => Promise<void>;
  isSubmitting: boolean;
};

// Generate pickup time options (9 AM to 5 PM, hourly)
const PICKUP_TIME_OPTIONS = [
  { value: "09:00-10:00", label: "9:00 AM - 10:00 AM" },
  { value: "10:00-11:00", label: "10:00 AM - 11:00 AM" },
  { value: "11:00-12:00", label: "11:00 AM - 12:00 PM" },
  { value: "12:00-13:00", label: "12:00 PM - 1:00 PM" },
  { value: "13:00-14:00", label: "1:00 PM - 2:00 PM" },
  { value: "14:00-15:00", label: "2:00 PM - 3:00 PM" },
  { value: "15:00-16:00", label: "3:00 PM - 4:00 PM" },
  { value: "16:00-17:00", label: "4:00 PM - 5:00 PM" },
];

// Get next available business day (skip weekends)
function getNextBusinessDay(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1); // Start from tomorrow

  // Skip weekends
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split("T")[0];
}

// Format date for display
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function EasyParcelShippingDrawer({
  isOpen,
  onClose,
  order,
  shippingInfo,
  onSubmit,
  isSubmitting,
}: EasyParcelShippingDrawerProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [weight, setWeight] = useState("1");
  const [content, setContent] = useState("");
  const [pickupDate, setPickupDate] = useState(getNextBusinessDay());
  const [pickupTime, setPickupTime] = useState("10:00-11:00");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when drawer opens with new order
  useEffect(() => {
    if (isOpen && order) {
      // Generate content description from order items
      const itemsDescription = order.items
        ?.map((item) => `${item.product_name} x${item.quantity}`)
        .join(", ") || "Products";
      setContent(itemsDescription.slice(0, 100)); // Limit to 100 chars
      setWeight("1");
      setPickupDate(getNextBusinessDay());
      setPickupTime("10:00-11:00");
      setErrors({});
    }
  }, [isOpen, order]);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    const weightNum = parseFloat(weight);

    if (isNaN(weightNum) || weightNum <= 0) {
      newErrors.weight = "Please enter a valid weight";
    } else if (weightNum > 30) {
      newErrors.weight = "Weight cannot exceed 30 kg";
    }

    if (!content.trim()) {
      newErrors.content = "Please describe the package contents";
    }

    if (!pickupDate) {
      newErrors.pickupDate = "Please select a pickup date";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      weight: weightNum,
      content: content.trim(),
      pickup_date: pickupDate,
      pickup_time: pickupTime,
    });
  };

  if (!order || !shippingInfo || !mounted) return null;

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-100 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-101 flex h-full w-full transform flex-col bg-white transition-transform duration-300 ease-in-out sm:w-[480px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white p-4 md:p-6">
          <div>
            <h2 className="font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712]">
              Ship with EasyParcel
            </h2>
            <p className="mt-1 font-public text-[14px] text-[#6A7282]">
              Order #{order.display_id}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-6 p-4 md:p-6">
            {/* Selected Courier Info */}
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-center gap-3">
                {shippingInfo.courier_logo && (
                  <img
                    src={shippingInfo.courier_logo}
                    alt={shippingInfo.courier_name}
                    className="h-10 w-10 rounded bg-white object-contain p-1"
                  />
                )}
                <div className="flex-1">
                  <p className="font-geist text-[14px] font-medium text-[#030712]">
                    {shippingInfo.courier_name}
                  </p>
                  <p className="font-geist text-[12px] text-[#6B7280]">
                    {shippingInfo.service_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-geist text-[14px] font-medium text-indigo-600">
                    {shippingInfo.price_display}
                  </p>
                  <p className="font-geist text-[11px] text-[#6B7280]">
                    ETA: {shippingInfo.delivery_eta}
                  </p>
                </div>
              </div>
            </div>

            {/* Receiver Info */}
            <div>
              <h3 className="mb-3 font-geist text-[16px] font-medium text-[#030712]">
                Delivery Address
              </h3>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="font-geist text-[14px] font-medium text-[#030712]">
                  {order.shipping_address?.first_name} {order.shipping_address?.last_name}
                </p>
                <p className="mt-1 font-geist text-[13px] text-[#6B7280]">
                  {order.shipping_address?.phone}
                </p>
                <p className="mt-2 font-geist text-[13px] text-[#6B7280]">
                  {[
                    order.shipping_address?.address_1,
                    order.shipping_address?.address_2,
                    order.shipping_address?.postal_code,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>

            {/* Package Details */}
            <div>
              <h3 className="mb-3 font-geist text-[16px] font-medium text-[#030712]">
                Package Details
              </h3>

              {/* Weight */}
              <div className="mb-4">
                <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="30"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    setErrors((prev) => ({ ...prev, weight: "" }));
                  }}
                  disabled={isSubmitting}
                  className={`w-full rounded-lg border px-4 py-2.5 font-public text-[14px] outline-none transition-colors ${
                    errors.weight
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#E5E7EB] focus:border-[#030712]"
                  } disabled:cursor-not-allowed disabled:bg-gray-100`}
                />
                {errors.weight && (
                  <p className="mt-1 font-public text-[12px] text-red-500">{errors.weight}</p>
                )}
              </div>

              {/* Content Description */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
                  Package Contents <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setErrors((prev) => ({ ...prev, content: "" }));
                  }}
                  disabled={isSubmitting}
                  rows={2}
                  maxLength={100}
                  placeholder="Brief description of items..."
                  className={`w-full resize-none rounded-lg border px-4 py-2.5 font-public text-[14px] outline-none transition-colors ${
                    errors.content
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#E5E7EB] focus:border-[#030712]"
                  } disabled:cursor-not-allowed disabled:bg-gray-100`}
                />
                <div className="mt-1 flex justify-between">
                  {errors.content ? (
                    <p className="font-public text-[12px] text-red-500">{errors.content}</p>
                  ) : (
                    <span />
                  )}
                  <p className="font-public text-[12px] text-[#9CA3AF]">{content.length}/100</p>
                </div>
              </div>
            </div>

            {/* Pickup Schedule */}
            <div>
              <h3 className="mb-3 font-geist text-[16px] font-medium text-[#030712]">
                Pickup Schedule
              </h3>

              {/* Pickup Date */}
              <div className="mb-4">
                <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
                  Pickup Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => {
                    setPickupDate(e.target.value);
                    setErrors((prev) => ({ ...prev, pickupDate: "" }));
                  }}
                  min={getNextBusinessDay()}
                  disabled={isSubmitting}
                  className={`w-full rounded-lg border px-4 py-2.5 font-public text-[14px] outline-none transition-colors ${
                    errors.pickupDate
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#E5E7EB] focus:border-[#030712]"
                  } disabled:cursor-not-allowed disabled:bg-gray-100`}
                />
                {errors.pickupDate && (
                  <p className="mt-1 font-public text-[12px] text-red-500">{errors.pickupDate}</p>
                )}
                <p className="mt-1 font-public text-[12px] text-[#9CA3AF]">
                  {formatDateForDisplay(pickupDate)}
                </p>
              </div>

              {/* Pickup Time */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
                  Pickup Time <span className="text-red-500">*</span>
                </label>
                <select
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full cursor-pointer rounded-lg border border-[#E5E7EB] px-4 py-2.5 font-public text-[14px] outline-none transition-colors focus:border-[#030712] disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  {PICKUP_TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-2">
                <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-geist text-[13px] font-medium text-amber-800">
                    Payment will be deducted
                  </p>
                  <p className="mt-0.5 font-public text-[12px] text-amber-700">
                    {shippingInfo.price_display} will be charged to your EasyParcel account balance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#E5E7EB] bg-white p-4 md:p-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    Arrange Pickup
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}
