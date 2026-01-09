"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import type { Order } from "@/lib/validators/order";
import { getAvatarColorClass } from "@/lib/utils/overview";
import { useEasyParcelRates } from "@/lib/api/queries";
import { api } from "@/lib/api/client";
import { useToast } from "@/contexts/ToastContext";
import type { EasyParcelRate } from "@/lib/types/shipping-settings";

type BulkShippingDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: Order[];
  onComplete?: () => void;
};

export type BulkShippingData = {
  courier: string;
  pickupDate: string;
  pickupTime: string;
  orderIds: string[];
};

type Step = "rates" | "pickup" | "confirm" | "processing" | "complete";

type SubmissionResult = {
  order_id: string;
  success: boolean;
  order_no?: string;
  awb?: string;
  message?: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PICKUP_TIME_OPTIONS = [
  { value: "09:00", label: "09:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "17:00", label: "05:00 PM" },
];

/** Estimated weight per item in kg */
const ESTIMATED_WEIGHT_PER_ITEM_KG = 0.5;

export function BulkShippingDrawer({
  isOpen,
  onClose,
  selectedOrders,
  onComplete,
}: BulkShippingDrawerProps): React.JSX.Element {
  const { showToast } = useToast();

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>("rates");

  // Single courier selection for all orders
  const [selectedRate, setSelectedRate] = useState<EasyParcelRate | null>(null);

  // Pickup configuration
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[]>([]);
  const [processingStep, setProcessingStep] = useState<"submitting" | "paying" | "done">("submitting");

  // Dropdown states
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Refs
  const dateRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  // Fetch EasyParcel rates
  const { data: ratesData, isLoading: isLoadingRates, refetch: refetchRates } = useEasyParcelRates();

  // Reset state when drawer opens
  useEffect(() => {
    if (isOpen && selectedOrders.length > 0) {
      setSelectedRate(null);
      setCurrentStep("rates");
      setSubmissionResults([]);
      setPickupDate("");
      setPickupTime("");
    }
  }, [isOpen, selectedOrders]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) {
        setIsTimeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper functions
  const getCustomerInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatCurrency = (amount: number): string => {
    return `$ ${(amount / 100).toFixed(2)}`;
  };

  const getOrderWeight = (order: Order): number => {
    return order.items_count * ESTIMATED_WEIGHT_PER_ITEM_KG;
  };

  const totalWeight = useMemo(() => {
    return selectedOrders.reduce((sum, order) => sum + getOrderWeight(order), 0);
  }, [selectedOrders]);

  const totalShippingCost = useMemo(() => {
    // All orders use the same rate
    return selectedRate ? selectedRate.price * selectedOrders.length : 0;
  }, [selectedRate, selectedOrders.length]);

  // Date picker helpers
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return "";
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateToISO = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isPastDate = (day: number): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return checkDate < today;
  };

  const isSelected = (day: number): boolean => {
    if (!pickupDate) return false;
    const parts = pickupDate.split("-");
    if (parts.length !== 3) return false;
    return (
      parseInt(parts[2], 10) === day &&
      parseInt(parts[1], 10) - 1 === currentMonth.getMonth() &&
      parseInt(parts[0], 10) === currentMonth.getFullYear()
    );
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  // Submit orders to EasyParcel
  const handleSubmit = async (): Promise<void> => {
    if (!selectedRate) return;

    setIsSubmitting(true);
    setCurrentStep("processing");
    setProcessingStep("submitting");

    try {
      // Prepare order data - all orders use the same selected rate
      const ordersToSubmit = selectedOrders.map((order) => {
        const shippingAddress = order.shipping_address;

        return {
          order_id: order.id,
          service_id: selectedRate.service_id,
          service_name: selectedRate.service_name,
          courier_id: selectedRate.courier_id,
          courier_name: selectedRate.courier_name,
          weight: getOrderWeight(order),
          rate: Math.round(selectedRate.price * 100), // Convert to cents
          receiver_name: shippingAddress?.first_name
            ? `${shippingAddress.first_name} ${shippingAddress.last_name || ""}`.trim()
            : order.customer_name,
          receiver_phone: shippingAddress?.phone || "",
          receiver_address: shippingAddress?.address_1 || "",
          receiver_postcode: shippingAddress?.postal_code || "",
          receiver_country: shippingAddress?.country_code?.toUpperCase() || "SG",
          content: `Order ${order.display_id} - ${order.items_count} items`,
          pickup_date: pickupDate,
          pickup_time: pickupTime,
        };
      });

      // Submit orders
      const submitResponse = await api.post("/admin/easyparcel/orders", {
        orders: ordersToSubmit,
      });

      const submitData = submitResponse.data;

      if (!submitData.success) {
        throw new Error(submitData.message || "Failed to submit orders");
      }

      // Get order numbers for payment
      const orderNos = submitData.results
        .filter((r: SubmissionResult) => r.success && r.order_no)
        .map((r: SubmissionResult) => r.order_no);

      if (orderNos.length === 0) {
        setSubmissionResults(submitData.results);
        setProcessingStep("done");
        setCurrentStep("complete");
        return;
      }

      // Pay for orders
      setProcessingStep("paying");
      const payResponse = await api.post("/admin/easyparcel/pay", {
        order_nos: orderNos,
      });

      const payData = payResponse.data;

      // Merge results
      const finalResults: SubmissionResult[] = submitData.results.map((submitResult: SubmissionResult) => {
        if (submitResult.success && submitResult.order_no) {
          const payResult = payData.results?.find(
            (p: { order_no: string }) => p.order_no === submitResult.order_no
          );
          if (payResult?.success) {
            return {
              ...submitResult,
              awb: payResult.awb,
            };
          }
        }
        return submitResult;
      });

      setSubmissionResults(finalResults);
      setProcessingStep("done");
      setCurrentStep("complete");

      const successCount = finalResults.filter((r: SubmissionResult) => r.awb).length;
      if (successCount > 0) {
        showToast(`Successfully shipped ${successCount} orders`, "success");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showToast(`Shipping failed: ${errorMessage}`, "error");
      setCurrentStep("confirm");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step content
  const renderStepContent = (): React.JSX.Element => {
    switch (currentStep) {
      case "rates":
        return renderRatesStep();
      case "pickup":
        return renderPickupStep();
      case "confirm":
        return renderConfirmStep();
      case "processing":
        return renderProcessingStep();
      case "complete":
        return renderCompleteStep();
      default:
        return renderRatesStep();
    }
  };

  // Step 1: Rate Selection - Single courier for all orders
  const renderRatesStep = (): React.JSX.Element => (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Orders summary */}
      <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
        <p className="mb-2 font-geist text-[14px] font-medium text-[#030712]">
          Selected Orders ({selectedOrders.length})
        </p>
        <div className="space-y-2">
          {selectedOrders.map((order, index) => (
            <div key={order.id} className="flex items-center gap-2">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${getAvatarColorClass(index)}`}>
                <span className="font-geist text-[10px] font-medium text-white">
                  {getCustomerInitials(order.customer_name)}
                </span>
              </div>
              <span className="font-public text-[13px] text-[#030712]">
                #{order.display_id} - {order.customer_name}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[#E5E7EB] pt-3">
          <span className="font-public text-[12px] text-[#6A7282]">Total Weight</span>
          <span className="font-geist text-[13px] font-medium text-[#030712]">{totalWeight.toFixed(1)} kg</span>
        </div>
      </div>

      <p className="mb-3 font-geist text-[14px] font-medium text-[#030712]">
        Select Courier
      </p>

      {isLoadingRates ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
        </div>
      ) : !ratesData?.rates?.length ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="font-public text-[14px] text-red-700">
            No courier rates available. Please check your EasyParcel configuration.
          </p>
          <button
            onClick={() => refetchRates()}
            className="mt-3 cursor-pointer rounded-lg bg-red-600 px-4 py-2 font-public text-[14px] text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ratesData.rates.map((rate) => (
            <button
              key={rate.service_id}
              onClick={() => setSelectedRate(rate)}
              className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-colors ${
                selectedRate?.service_id === rate.service_id
                  ? "border-[#030712] bg-[#F9FAFB]"
                  : "border-[#E5E7EB] hover:border-[#D1D5DB]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {rate.courier_logo && (
                    <img
                      src={rate.courier_logo}
                      alt={rate.courier_name}
                      className="h-10 w-10 object-contain"
                    />
                  )}
                  <div>
                    <p className="font-geist text-[15px] font-medium text-[#030712]">
                      {rate.courier_name}
                    </p>
                    <p className="font-public text-[12px] text-[#6A7282]">
                      {rate.service_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-geist text-[16px] font-semibold text-[#030712]">
                    {rate.price_display}
                  </p>
                  <p className="font-public text-[12px] text-[#6A7282]">
                    {rate.delivery_eta || "1-3 days"}
                  </p>
                </div>
              </div>
              {/* Show total for all orders when selected */}
              {selectedRate?.service_id === rate.service_id && selectedOrders.length > 1 && (
                <div className="mt-3 border-t border-[#E5E7EB] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-public text-[12px] text-[#6A7282]">
                      {selectedOrders.length} orders × {rate.price_display}
                    </span>
                    <span className="font-geist text-[14px] font-semibold text-[#030712]">
                      Total: ${(rate.price * selectedOrders.length).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Step 2: Pickup Configuration
  const renderPickupStep = (): React.JSX.Element => (
    <div className="flex-1 overflow-y-auto p-6">
      <p className="mb-6 font-public text-[14px] text-[#6A7282]">
        Configure pickup details for {selectedOrders.length} orders
      </p>

      <div className="space-y-4">
        {/* Pickup Date */}
        <div ref={dateRef}>
          <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
            Pickup Date
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateOpen(!isDateOpen)}
              className={`flex w-full cursor-pointer items-center rounded-lg border bg-white py-3 pl-12 pr-4 text-left font-public text-[14px] font-medium outline-none transition-colors ${
                !pickupDate ? "text-[#99A1AF]" : "text-[#030712]"
              } ${isDateOpen ? "border-[#030712]" : "border-[#E5E5E5] hover:border-[#D1D5DB]"}`}
            >
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12.6667 2.66667H3.33333C2.59667 2.66667 2 3.26333 2 4V13.3333C2 14.07 2.59667 14.6667 3.33333 14.6667H12.6667C13.4033 14.6667 14 14.07 14 13.3333V4C14 3.26333 13.4033 2.66667 12.6667 2.66667Z" stroke="#6A7282" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.6667 1.33333V4M5.33333 1.33333V4M2 6.66667H14" stroke="#6A7282" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{pickupDate ? formatDateForDisplay(pickupDate) : "Select date"}</span>
            </button>

            {isDateOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-[#F3F4F6]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M10 12L6 8L10 4" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="font-geist text-[14px] font-medium text-[#030712]">
                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-[#F3F4F6]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4L10 8L6 12" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1">
                  {DAYS.map((day) => (
                    <div key={day} className="flex h-8 w-8 items-center justify-center font-public text-[11px] font-medium text-[#6A7282]">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8 w-8" />
                  ))}
                  {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                    const day = i + 1;
                    const past = isPastDate(day);
                    const selected = isSelected(day);
                    const today = isToday(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (!past) {
                            setPickupDate(formatDateToISO(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                            setIsDateOpen(false);
                          }
                        }}
                        disabled={past}
                        className={`flex h-8 w-8 items-center justify-center rounded-full font-public text-[13px] transition-colors ${
                          past ? "cursor-not-allowed text-[#D1D5DB]"
                            : selected ? "cursor-pointer bg-[#030712] font-medium text-white"
                            : today ? "cursor-pointer bg-[#F3F4F6] font-medium text-[#030712] hover:bg-[#E5E7EB]"
                            : "cursor-pointer text-[#030712] hover:bg-[#F3F4F6]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pickup Time */}
        <div ref={timeRef}>
          <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
            Pickup Time
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTimeOpen(!isTimeOpen)}
              className={`flex w-full cursor-pointer items-center rounded-lg border bg-white py-3 pl-12 pr-4 text-left font-public text-[14px] font-medium outline-none transition-colors ${
                !pickupTime ? "text-[#99A1AF]" : "text-[#030712]"
              } ${isTimeOpen ? "border-[#030712]" : "border-[#E5E5E5] hover:border-[#D1D5DB]"}`}
            >
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="#6A7282" strokeWidth="1.25" />
                  <path d="M8 4.5V8L10.5 10.5" stroke="#6A7282" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>{PICKUP_TIME_OPTIONS.find((o) => o.value === pickupTime)?.label || "Select time"}</span>
            </button>

            {isTimeOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                {PICKUP_TIME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setPickupTime(option.value);
                      setIsTimeOpen(false);
                    }}
                    className={`w-full cursor-pointer px-4 py-3 text-left font-public text-[14px] transition-colors ${
                      pickupTime === option.value
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
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
        <h4 className="mb-3 font-geist text-[14px] font-medium text-[#030712]">Summary</h4>
        <div className="space-y-2">
          <div className="flex justify-between font-public text-[13px]">
            <span className="text-[#6A7282]">Orders</span>
            <span className="text-[#030712]">{selectedOrders.length}</span>
          </div>
          <div className="flex justify-between font-public text-[13px]">
            <span className="text-[#6A7282]">Total Weight</span>
            <span className="text-[#030712]">{totalWeight.toFixed(1)} kg</span>
          </div>
          <div className="flex justify-between font-public text-[13px]">
            <span className="text-[#6A7282]">Shipping Cost</span>
            <span className="font-medium text-[#030712]">${totalShippingCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 3: Confirmation
  const renderConfirmStep = (): React.JSX.Element => (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="font-geist text-[14px] font-medium text-amber-700">
          Review and confirm your shipment
        </p>
        <p className="mt-1 font-public text-[12px] text-amber-600">
          This will submit orders to EasyParcel and charge your account.
        </p>
      </div>

      {/* Selected courier for all orders */}
      {selectedRate && (
        <div className="mb-4 rounded-lg border border-[#030712] bg-[#F9FAFB] p-4">
          <p className="mb-2 font-geist text-[12px] font-medium text-[#6A7282]">Selected Courier</p>
          <div className="flex items-center gap-3">
            {selectedRate.courier_logo && (
              <img src={selectedRate.courier_logo} alt={selectedRate.courier_name} className="h-8 w-8 object-contain" />
            )}
            <div>
              <p className="font-geist text-[15px] font-medium text-[#030712]">{selectedRate.courier_name}</p>
              <p className="font-public text-[12px] text-[#6A7282]">{selectedRate.service_name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Orders list */}
      <p className="mb-3 font-geist text-[13px] font-medium text-[#6A7282]">Orders ({selectedOrders.length})</p>
      <div className="space-y-2">
        {selectedOrders.map((order, index) => (
          <div key={order.id} className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] p-3">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${getAvatarColorClass(index)}`}>
              <span className="font-geist text-[10px] font-medium text-white">
                {getCustomerInitials(order.customer_name)}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-geist text-[13px] font-medium text-[#030712]">
                #{order.display_id} - {order.customer_name}
              </p>
              <p className="font-public text-[11px] text-[#6A7282]">
                {order.shipping_address?.postal_code || "No postcode"}
              </p>
            </div>
            <span className="font-geist text-[13px] font-medium text-[#030712]">
              {selectedRate?.price_display}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-[#030712] bg-[#030712] p-4">
        <div className="flex justify-between font-public text-[14px]">
          <span className="text-white/70">Total Shipping Cost</span>
          <span className="font-semibold text-white">${totalShippingCost.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between font-public text-[12px]">
          <span className="text-white/50">Pickup: {formatDateForDisplay(pickupDate)}</span>
          <span className="text-white/50">{PICKUP_TIME_OPTIONS.find((o) => o.value === pickupTime)?.label}</span>
        </div>
      </div>
    </div>
  );

  // Step 4: Processing
  const renderProcessingStep = (): React.JSX.Element => (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="mb-6 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
      <p className="font-geist text-[16px] font-medium text-[#030712]">
        {processingStep === "submitting" ? "Submitting orders..." : "Processing payment..."}
      </p>
      <p className="mt-2 font-public text-[14px] text-[#6A7282]">
        Please wait, this may take a moment.
      </p>
    </div>
  );

  // Step 5: Complete
  const renderCompleteStep = (): React.JSX.Element => {
    const successCount = submissionResults.filter((r) => r.awb).length;
    const failCount = submissionResults.length - successCount;

    return (
      <div className="flex-1 overflow-y-auto p-6">
        {/* Status header */}
        <div className={`mb-6 rounded-lg p-4 ${successCount > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <div className="flex items-center gap-3">
            {successCount > 0 ? (
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <div>
              <p className={`font-geist text-[16px] font-medium ${successCount > 0 ? "text-green-700" : "text-red-700"}`}>
                {successCount > 0
                  ? `${successCount} orders shipped successfully`
                  : "Shipping failed"}
              </p>
              {failCount > 0 && successCount > 0 && (
                <p className="font-public text-[12px] text-amber-600">
                  {failCount} orders failed
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Results list */}
        <div className="space-y-3">
          {submissionResults.map((result, index) => {
            const order = selectedOrders.find((o) => o.id === result.order_id);
            return (
              <div
                key={result.order_id}
                className={`rounded-lg border p-4 ${result.awb ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getAvatarColorClass(index)}`}>
                      <span className="font-geist text-[12px] font-medium text-white">
                        {order ? getCustomerInitials(order.customer_name) : "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-geist text-[14px] font-medium text-[#030712]">
                        #{order?.display_id || "Unknown"}
                      </p>
                      {result.awb ? (
                        <p className="font-public text-[12px] text-green-600">
                          AWB: {result.awb}
                        </p>
                      ) : (
                        <p className="font-public text-[12px] text-red-600">
                          {result.message || "Failed"}
                        </p>
                      )}
                    </div>
                  </div>
                  {result.awb && (
                    <button
                      onClick={() => navigator.clipboard.writeText(result.awb!)}
                      className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 font-public text-[12px] text-[#030712] hover:bg-[#F9FAFB]"
                    >
                      Copy AWB
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Footer buttons based on step
  const renderFooter = (): React.JSX.Element | null => {
    switch (currentStep) {
      case "rates":
        return (
          <div className="border-t border-[#E5E7EB] p-6">
            <button
              onClick={() => setCurrentStep("pickup")}
              disabled={!selectedRate}
              className={`w-full cursor-pointer rounded-lg px-4 py-3 font-public text-[14px] font-medium text-white transition-colors ${
                selectedRate ? "bg-[#030712] hover:bg-[#1F2937]" : "cursor-not-allowed bg-[#D1D5DB]"
              }`}
            >
              Continue to Pickup
            </button>
          </div>
        );

      case "pickup":
        return (
          <div className="border-t border-[#E5E7EB] p-6 space-y-3">
            <button
              onClick={() => setCurrentStep("confirm")}
              disabled={!pickupDate || !pickupTime}
              className={`w-full cursor-pointer rounded-lg px-4 py-3 font-public text-[14px] font-medium text-white transition-colors ${
                pickupDate && pickupTime ? "bg-[#030712] hover:bg-[#1F2937]" : "cursor-not-allowed bg-[#D1D5DB]"
              }`}
            >
              Review Order
            </button>
            <button
              onClick={() => setCurrentStep("rates")}
              className="w-full cursor-pointer rounded-lg border border-[#E5E7EB] px-4 py-3 font-public text-[14px] font-medium text-[#030712] hover:bg-[#F9FAFB]"
            >
              Back
            </button>
          </div>
        );

      case "confirm":
        return (
          <div className="border-t border-[#E5E7EB] p-6 space-y-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-lg bg-[#030712] px-4 py-3 font-public text-[14px] font-medium text-white hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Confirm & Ship"}
            </button>
            <button
              onClick={() => setCurrentStep("pickup")}
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-lg border border-[#E5E7EB] px-4 py-3 font-public text-[14px] font-medium text-[#030712] hover:bg-[#F9FAFB] disabled:opacity-50"
            >
              Back
            </button>
          </div>
        );

      case "complete":
        return (
          <div className="border-t border-[#E5E7EB] p-6">
            <button
              onClick={() => {
                onComplete?.();
                onClose();
              }}
              className="w-full cursor-pointer rounded-lg bg-[#030712] px-4 py-3 font-public text-[14px] font-medium text-white hover:bg-[#1F2937]"
            >
              Done
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Step indicator
  const getStepNumber = (): number => {
    switch (currentStep) {
      case "rates": return 1;
      case "pickup": return 2;
      case "confirm": return 3;
      case "processing": return 4;
      case "complete": return 4;
      default: return 1;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`flex flex-col bg-white transition-all duration-300 z-30 shrink-0 overflow-hidden
          lg:sticky lg:top-0 lg:h-screen
          ${isOpen ? "lg:w-[400px]" : "lg:w-0"}
          max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:h-full max-lg:w-[320px]
          ${isOpen ? "max-lg:translate-x-0" : "max-lg:translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] p-6 pt-12">
          <div>
            <h2 className="font-geist text-[20px] font-semibold text-[#030712]">Bulk Shipping</h2>
            {currentStep !== "processing" && currentStep !== "complete" && (
              <p className="mt-1 font-public text-[12px] text-[#6A7282]">
                Step {getStepNumber()} of 4
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-[#6A7282] transition-colors hover:bg-[#F3F4F6] hover:text-[#030712]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {renderStepContent()}

        {/* Footer */}
        {renderFooter()}
      </aside>
    </>
  );
}
