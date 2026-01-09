"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Return, ReturnStatus, ReturnType, ReturnReason } from "@/lib/validators/return";
import {
  getReturnShippingRates,
  submitReturnShipping,
  payReturnShipping,
  getReturnShippingStatus,
  type ShippingRate,
  type ReturnShippingStatus,
} from "@/lib/api/returns";

type ReturnDetailsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  returnItem: Return | null;
  onApprove?: (returnId: string) => Promise<void>;
  onReject?: (returnId: string, reason: string) => Promise<void>;
  onMarkInTransit?: (returnId: string, courier: string, trackingNumber: string) => Promise<void>;
  onMarkReceived?: (returnId: string) => Promise<void>;
  onComplete?: (returnId: string) => Promise<void>;
  onProcessRefund?: (returnId: string) => Promise<void>;
  onCreateReplacement?: (returnId: string) => Promise<void>;
};

// Return status badge configuration
const returnStatusConfig: Record<ReturnStatus, { label: string; className: string }> = {
  requested: { label: "Pending Review", className: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
  in_transit: { label: "In Transit", className: "bg-indigo-100 text-indigo-800" },
  received: { label: "Received", className: "bg-purple-100 text-purple-800" },
  inspecting: { label: "Inspecting", className: "bg-orange-100 text-orange-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800" },
};

// Return type badge configuration
const returnTypeConfig: Record<ReturnType, { label: string; className: string }> = {
  refund: { label: "Refund", className: "bg-emerald-100 text-emerald-800" },
  replacement: { label: "Replacement", className: "bg-cyan-100 text-cyan-800" },
};

// Return reason labels
const returnReasonLabels: Record<ReturnReason, string> = {
  defective: "Defective/Damaged",
  wrong_item: "Wrong Item Received",
  not_as_described: "Not As Described",
  changed_mind: "Changed Mind",
  other: "Other",
};

export function ReturnDetailsDrawer({
  isOpen,
  onClose,
  returnItem,
  onApprove,
  onReject,
  onMarkInTransit,
  onMarkReceived,
  onComplete,
  onProcessRefund,
  onCreateReplacement,
}: ReturnDetailsDrawerProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // EasyParcel shipping states
  const [showEasyParcelModal, setShowEasyParcelModal] = useState(false);
  const [easyParcelStep, setEasyParcelStep] = useState<"rates" | "confirm" | "pay">("rates");
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [shippingWeight, setShippingWeight] = useState(1);
  const [pickupDate, setPickupDate] = useState("");
  const [easyParcelOrderNo, setEasyParcelOrderNo] = useState<string | null>(null);
  const [easyParcelStatus, setEasyParcelStatus] = useState<ReturnShippingStatus | null>(null);
  const [easyParcelError, setEasyParcelError] = useState<string | null>(null);

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
      if (e.key === "Escape") {
        if (showRejectModal) {
          setShowRejectModal(false);
        } else if (showEasyParcelModal) {
          setShowEasyParcelModal(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, showRejectModal, showEasyParcelModal]);

  // Fetch EasyParcel status when drawer opens for an approved return
  useEffect(() => {
    if (isOpen && returnItem && returnItem.status === "approved") {
      getReturnShippingStatus(returnItem.id)
        .then(setEasyParcelStatus)
        .catch(() => setEasyParcelStatus(null));
    }
  }, [isOpen, returnItem]);

  const formatCurrency = (amount: number, currency: string = "sgd"): string => {
    const currencySymbol = "$";
    return `${currencySymbol} ${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return "-";
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleReject = async (): Promise<void> => {
    if (returnItem && rejectReason.trim() && onReject) {
      setIsLoading(true);
      setLoadingAction("reject");
      try {
        await onReject(returnItem.id, rejectReason);
        setShowRejectModal(false);
        setRejectReason("");
      } finally {
        setIsLoading(false);
        setLoadingAction(null);
      }
    }
  };

  const handleAction = async (action: string, handler: () => Promise<void>): Promise<void> => {
    setIsLoading(true);
    setLoadingAction(action);
    try {
      await handler();
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  // EasyParcel handlers
  const handleOpenEasyParcel = async (): Promise<void> => {
    if (!returnItem) return;
    setShowEasyParcelModal(true);
    setEasyParcelStep("rates");
    setEasyParcelError(null);
    setSelectedRate(null);

    // Set default pickup date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPickupDate(tomorrow.toISOString().split("T")[0]);

    // Fetch rates - don't pass weight, let the backend calculate from items
    setIsLoading(true);
    setLoadingAction("fetch_rates");
    try {
      const response = await getReturnShippingRates(returnItem.id);
      setShippingRates(response.rates);
      // Set the weight from the API response (calculated from items)
      setShippingWeight(response.weight);
    } catch (err) {
      setEasyParcelError(err instanceof Error ? err.message : "Failed to fetch rates");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleRefetchRates = async (): Promise<void> => {
    if (!returnItem) return;
    setIsLoading(true);
    setLoadingAction("fetch_rates");
    setEasyParcelError(null);
    try {
      // Pass the manually adjusted weight if user changed it
      const response = await getReturnShippingRates(returnItem.id, shippingWeight);
      setShippingRates(response.rates);
      setShippingWeight(response.weight);
    } catch (err) {
      setEasyParcelError(err instanceof Error ? err.message : "Failed to fetch rates");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleSubmitEasyParcel = async (): Promise<void> => {
    if (!returnItem || !selectedRate || !pickupDate) return;
    setIsLoading(true);
    setLoadingAction("submit_easyparcel");
    setEasyParcelError(null);
    try {
      const response = await submitReturnShipping(returnItem.id, {
        service_id: selectedRate.service_id,
        service_name: selectedRate.service_name,
        courier_id: selectedRate.courier_id,
        courier_name: selectedRate.courier_name,
        weight: shippingWeight,
        rate: Math.round(selectedRate.price * 100), // Convert to cents
        pickup_date: pickupDate,
        content: "Return Items",
      });
      setEasyParcelOrderNo(response.order_no);
      setEasyParcelStep("pay");
    } catch (err) {
      setEasyParcelError(err instanceof Error ? err.message : "Failed to submit shipping");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handlePayEasyParcel = async (): Promise<void> => {
    if (!returnItem) return;
    setIsLoading(true);
    setLoadingAction("pay_easyparcel");
    setEasyParcelError(null);
    try {
      const response = await payReturnShipping(returnItem.id);
      // Close modal and refresh the return data
      setShowEasyParcelModal(false);
      // The pay endpoint also marks the return as in_transit
      // Trigger a page refresh by calling the markInTransit callback with the new values
      if (onMarkInTransit && response.awb) {
        // The backend already updated the return, just need to refresh UI
        window.location.reload();
      }
    } catch (err) {
      setEasyParcelError(err instanceof Error ? err.message : "Failed to pay for shipping");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const resetEasyParcelModal = (): void => {
    setShowEasyParcelModal(false);
    setEasyParcelStep("rates");
    setShippingRates([]);
    setSelectedRate(null);
    setEasyParcelOrderNo(null);
    setEasyParcelError(null);
  };

  if (!returnItem || !mounted) return null;

  // Get status configurations
  const statusConfig = returnStatusConfig[returnItem.status] || returnStatusConfig.requested;
  const typeConfig = returnTypeConfig[returnItem.return_type] || returnTypeConfig.refund;
  const reasonLabel = returnReasonLabels[returnItem.reason] || returnItem.reason;

  // Determine available actions based on current status
  const canApprove = returnItem.status === "requested";
  const canReject = returnItem.status === "requested";
  const canMarkInTransit = returnItem.status === "approved";
  const canMarkReceived = returnItem.status === "in_transit";
  const canComplete = returnItem.status === "received" || returnItem.status === "inspecting";
  // Can process refund: completed return, refund type, and refund not yet processed
  // Also check for stripe_refund_id to ensure refund wasn't already processed
  const canProcessRefund = returnItem.status === "completed" &&
    returnItem.return_type === "refund" &&
    returnItem.refund_status !== "completed" &&
    !returnItem.stripe_refund_id;

  // Can create replacement order: completed return, replacement type, and no replacement order yet
  const canCreateReplacement = returnItem.status === "completed" &&
    returnItem.return_type === "replacement" &&
    !returnItem.replacement_order_id;

  // Timeline steps - different for Refund vs Replacement
  const isRefund = returnItem.return_type === "refund";

  const refundTimelineSteps = [
    {
      label: "Return Requested",
      date: formatDate(returnItem.requested_at),
      completed: true,
    },
    {
      label: "Approved",
      date: returnItem.approved_at ? formatDate(returnItem.approved_at) : null,
      completed: returnItem.status !== "requested" && returnItem.status !== "rejected",
      rejected: returnItem.status === "rejected",
      rejectedDate: returnItem.rejected_at ? formatDate(returnItem.rejected_at) : null,
    },
    {
      label: "In Transit",
      date: returnItem.status === "in_transit" || returnItem.status === "received" || returnItem.status === "completed"
        ? formatDate(returnItem.approved_at) // Use approved_at as fallback
        : null,
      completed: returnItem.status === "in_transit" || returnItem.status === "received" ||
        returnItem.status === "inspecting" || returnItem.status === "completed",
    },
    {
      label: "Received",
      date: returnItem.received_at ? formatDate(returnItem.received_at) : null,
      completed: returnItem.status === "received" || returnItem.status === "inspecting" || returnItem.status === "completed",
    },
    {
      label: "Refund Processed",
      date: returnItem.completed_at ? formatDate(returnItem.completed_at) : null,
      completed: returnItem.status === "completed",
    },
  ];

  const replacementTimelineSteps = [
    {
      label: "Return Requested",
      date: formatDate(returnItem.requested_at),
      completed: true,
    },
    {
      label: "Approved",
      date: returnItem.approved_at ? formatDate(returnItem.approved_at) : null,
      completed: returnItem.status !== "requested" && returnItem.status !== "rejected",
      rejected: returnItem.status === "rejected",
      rejectedDate: returnItem.rejected_at ? formatDate(returnItem.rejected_at) : null,
    },
    {
      label: "Item In Transit",
      date: returnItem.status === "in_transit" || returnItem.status === "received" ||
        returnItem.status === "inspecting" || returnItem.status === "completed"
        ? formatDate(returnItem.approved_at) // Use approved_at as fallback
        : null,
      completed: returnItem.status === "in_transit" || returnItem.status === "received" ||
        returnItem.status === "inspecting" || returnItem.status === "completed",
    },
    {
      label: "Item Received",
      date: returnItem.received_at ? formatDate(returnItem.received_at) : null,
      completed: returnItem.status === "received" || returnItem.status === "inspecting" || returnItem.status === "completed",
    },
    {
      label: "Replacement Shipped",
      date: returnItem.completed_at ? formatDate(returnItem.completed_at) : null,
      completed: returnItem.status === "completed",
    },
  ];

  const timelineSteps = isRefund ? refundTimelineSteps : replacementTimelineSteps;

  // Filter out rejected step if not rejected
  const filteredSteps = returnItem.status === "rejected"
    ? timelineSteps.slice(0, 2)
    : timelineSteps.filter(s => !s.rejected);

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
        className={`fixed right-0 top-0 z-101 flex h-full w-full transform flex-col bg-white transition-transform duration-300 ease-in-out sm:w-[480px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white p-4 md:p-6">
          <h2 className="font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712]">
            Return Details
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
          {/* Status Badges */}
          <div className="mb-6 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${typeConfig.className}`}>
              {typeConfig.label}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
            {returnItem.refund_status && (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                returnItem.refund_status === "completed" ? "bg-green-100 text-green-800" :
                returnItem.refund_status === "failed" ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                Refund: {returnItem.refund_status}
              </span>
            )}
          </div>

          {/* Return Timeline */}
          <div className="mb-6">
            <h3 className="mb-4 font-geist text-[16px] font-medium text-[#030712]">Return Timeline</h3>
            <div className="relative">
              {filteredSteps.map((step, index) => (
                <div key={index} className="relative flex items-start pb-4 last:pb-0">
                  {/* Line */}
                  {index < filteredSteps.length - 1 && (
                    <div
                      className={`absolute left-[9px] top-5 h-full w-0.5 ${
                        step.completed ? "bg-green-500" : step.rejected ? "bg-red-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                  {/* Dot */}
                  <div
                    className={`relative z-10 mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      step.completed ? "bg-green-500" : step.rejected ? "bg-red-500" : "bg-gray-200"
                    }`}
                  >
                    {step.completed && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {step.rejected && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1">
                    <p className={`font-geist text-[14px] font-medium ${
                      step.completed ? "text-[#030712]" : step.rejected ? "text-red-600" : "text-[#9CA3AF]"
                    }`}>
                      {step.rejected ? "Rejected" : step.label}
                    </p>
                    <p className="font-geist text-[12px] text-[#6B7280]">
                      {step.rejected ? step.rejectedDate : step.date || "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-[#E5E7EB]"></div>

          {/* Return Info Section */}
          <div className="mb-6 space-y-4">
            <h3 className="font-geist text-[16px] font-medium text-[#030712]">Return Details</h3>

            {/* Order ID */}
            <div className="flex items-center justify-between">
              <span className="font-geist text-[14px] font-medium text-[#858585]">Order</span>
              <span className="font-geist text-[14px] font-medium text-[#007AFF]">
                #{returnItem.order_display_id}
              </span>
            </div>

            {/* Customer */}
            <div className="flex items-center justify-between">
              <span className="font-geist text-[14px] font-medium text-[#858585]">Customer</span>
              <span className="font-geist text-[14px] font-medium text-[#030712]">
                {returnItem.customer_name || "Guest"}
              </span>
            </div>

            {/* Email */}
            {returnItem.customer_email && (
              <div className="flex items-center justify-between">
                <span className="font-geist text-[14px] font-medium text-[#858585]">Email</span>
                <span className="font-geist text-[14px] font-medium text-[#030712]">
                  {returnItem.customer_email}
                </span>
              </div>
            )}

            {/* Reason */}
            <div className="flex items-center justify-between">
              <span className="font-geist text-[14px] font-medium text-[#858585]">Reason</span>
              <span className="font-geist text-[14px] font-medium text-[#030712]">{reasonLabel}</span>
            </div>

            {/* Reason Details */}
            {returnItem.reason_details && (
              <div>
                <span className="block font-geist text-[14px] font-medium text-[#858585]">Details</span>
                <p className="mt-1 font-geist text-[14px] text-[#030712]">{returnItem.reason_details}</p>
              </div>
            )}

            {/* Rejection Reason */}
            {returnItem.status === "rejected" && returnItem.rejection_reason && (
              <div className="rounded-lg bg-red-50 p-3">
                <span className="block font-geist text-[14px] font-medium text-red-800">Rejection Reason</span>
                <p className="mt-1 font-geist text-[14px] text-red-700">{returnItem.rejection_reason}</p>
              </div>
            )}

            {/* Tracking Info */}
            {(returnItem.return_courier || returnItem.return_tracking_number) && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] font-medium text-[#858585]">Courier</span>
                  <span className="font-geist text-[14px] font-medium text-[#030712]">
                    {returnItem.return_courier || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] font-medium text-[#858585]">Tracking</span>
                  <span className="font-geist text-[14px] font-medium text-[#007AFF]">
                    {returnItem.return_tracking_number || "-"}
                  </span>
                </div>
              </>
            )}

            {/* Admin Notes */}
            {returnItem.admin_notes && (
              <div className="rounded-lg bg-gray-50 p-3">
                <span className="block font-geist text-[14px] font-medium text-[#858585]">Admin Notes</span>
                <p className="mt-1 font-geist text-[14px] text-[#030712]">{returnItem.admin_notes}</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-[#E5E7EB]"></div>

          {/* Products Section */}
          <div className="mb-6">
            <h3 className="mb-4 font-geist text-[16px] font-medium text-[#030712]">Return Items</h3>
            <div className="space-y-3">
              {returnItem.items && returnItem.items.length > 0 ? (
                returnItem.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5]">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.product_name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[16px]">📦</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-geist text-[14px] font-medium text-[#030712]">{item.product_name}</p>
                      <p className="font-geist text-[12px] text-[#858585]">x{item.quantity}</p>
                    </div>
                    <p className="font-geist text-[14px] font-medium text-[#030712]">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="font-geist text-[14px] text-[#858585]">No items</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-[#E5E7EB]"></div>

          {/* Original Order Discounts Section */}
          {(returnItem.coupon_code || (returnItem.coupon_discount && returnItem.coupon_discount > 0) ||
            (returnItem.points_discount && returnItem.points_discount > 0) ||
            (returnItem.pwp_discount && returnItem.pwp_discount > 0)) && (
            <div className="mb-6">
              <h3 className="mb-4 font-geist text-[16px] font-medium text-[#030712]">Original Order Discounts</h3>
              <div className="space-y-3 rounded-lg bg-amber-50 p-4">
                {/* Original Order Total */}
                {returnItem.original_order_total && returnItem.original_order_total > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-geist text-[14px] text-[#858585]">Gross Total</span>
                    <span className="font-geist text-[14px] text-[#030712]">
                      {formatCurrency(returnItem.original_order_total)}
                    </span>
                  </div>
                )}

                {/* Coupon Discount */}
                {returnItem.coupon_code && (
                  <div className="flex items-center justify-between">
                    <span className="font-geist text-[14px] text-[#858585]">
                      Coupon ({returnItem.coupon_code})
                    </span>
                    <span className="font-geist text-[14px] text-red-600">
                      -{formatCurrency(returnItem.coupon_discount || 0)}
                    </span>
                  </div>
                )}

                {/* Points Discount */}
                {returnItem.points_discount && returnItem.points_discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-geist text-[14px] text-[#858585]">
                      Points Redeemed ({returnItem.points_redeemed || 0} pts)
                    </span>
                    <span className="font-geist text-[14px] text-red-600">
                      -{formatCurrency(returnItem.points_discount)}
                    </span>
                  </div>
                )}

                {/* PWP Discount */}
                {returnItem.pwp_discount && returnItem.pwp_discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-geist text-[14px] text-[#858585]">PWP Discount</span>
                    <span className="font-geist text-[14px] text-red-600">
                      -{formatCurrency(returnItem.pwp_discount)}
                    </span>
                  </div>
                )}

                <div className="border-t border-amber-200 pt-2">
                  <p className="font-geist text-[12px] text-amber-700">
                    Note: Discounts applied to the original order are shown for reference.
                    The refund amount reflects the actual amount paid.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="mb-6 border-t border-[#E5E7EB]"></div>

          {/* Refund Details Section */}
          <div>
            <h3 className="mb-4 font-geist text-[16px] font-medium text-[#030712]">Refund Details</h3>
            <div className="space-y-3">
              {/* Item Refund */}
              <div className="flex items-center justify-between">
                <span className="font-geist text-[14px] text-[#858585]">Items Refund</span>
                <span className="font-geist text-[14px] text-[#030712]">
                  {formatCurrency(returnItem.refund_amount)}
                </span>
              </div>

              {/* Shipping Refund */}
              <div className="flex items-center justify-between">
                <span className="font-geist text-[14px] text-[#858585]">Shipping Refund</span>
                <span className="font-geist text-[14px] text-[#030712]">
                  {formatCurrency(returnItem.shipping_refund)}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-[#E5E7EB]"></div>

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="font-geist text-[16px] font-bold text-[#030712]">TOTAL REFUND</span>
                <span className="font-geist text-[16px] font-bold text-[#030712]">
                  {formatCurrency(returnItem.total_refund)}
                </span>
              </div>

              {/* Refund Status */}
              {returnItem.refund_status && returnItem.stripe_refund_id && (
                <div className="mt-2 rounded-lg bg-green-50 p-3">
                  <p className="font-geist text-[12px] text-green-700">
                    Stripe Refund ID: {returnItem.stripe_refund_id}
                  </p>
                  {returnItem.refunded_at && (
                    <p className="font-geist text-[12px] text-green-700">
                      Refunded on: {formatDate(returnItem.refunded_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Replacement Order Section - Only for replacement type with created order */}
          {returnItem.return_type === "replacement" && returnItem.replacement_order_id && (
            <>
              {/* Divider */}
              <div className="my-6 border-t border-[#E5E7EB]"></div>

              <div>
                <h3 className="mb-4 font-geist text-[16px] font-medium text-[#030712]">Replacement Order</h3>
                <div className="rounded-lg bg-cyan-50 p-4">
                  <div className="space-y-3">
                    {/* Order ID */}
                    <div className="flex items-center justify-between">
                      <span className="font-geist text-[14px] text-[#858585]">Order ID</span>
                      <span className="font-geist text-[14px] font-medium text-[#007AFF]">
                        #{returnItem.replacement_order?.display_id || "N/A"}
                      </span>
                    </div>

                    {/* Status */}
                    {returnItem.replacement_order?.status && (
                      <div className="flex items-center justify-between">
                        <span className="font-geist text-[14px] text-[#858585]">Status</span>
                        <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-0.5 font-geist text-[12px] font-medium text-cyan-800">
                          {returnItem.replacement_order.status}
                        </span>
                      </div>
                    )}

                    {/* Created At */}
                    {returnItem.replacement_created_at && (
                      <div className="flex items-center justify-between">
                        <span className="font-geist text-[14px] text-[#858585]">Created</span>
                        <span className="font-geist text-[14px] text-[#030712]">
                          {formatDate(returnItem.replacement_created_at)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 border-t border-cyan-200 pt-3">
                    <p className="font-geist text-[12px] text-cyan-700">
                      A replacement order has been created for the customer. Process and ship this order to complete the replacement.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer - Action Buttons */}
        <div className="shrink-0 border-t border-[#E5E7EB] bg-white p-4 md:p-6">
          <div className="flex flex-wrap gap-2">
            {/* Approve - Only for requested */}
            {canApprove && onApprove && (
              <button
                onClick={() => handleAction("approve", () => onApprove(returnItem.id))}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "approve" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Approving...
                  </span>
                ) : (
                  "Approve"
                )}
              </button>
            )}

            {/* Reject - Only for requested */}
            {canReject && onReject && (
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isLoading}
                className="flex-1 rounded-lg border border-red-200 bg-white px-4 py-2.5 font-geist text-[14px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject
              </button>
            )}

            {/* Mark In Transit - Only for approved - Use EasyParcel */}
            {canMarkInTransit && onMarkInTransit && (
              <button
                onClick={handleOpenEasyParcel}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark In Transit
              </button>
            )}

            {/* Mark Received - Only for in_transit */}
            {canMarkReceived && onMarkReceived && (
              <button
                onClick={() => handleAction("received", () => onMarkReceived(returnItem.id))}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "received" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Marking...
                  </span>
                ) : (
                  "Mark Received"
                )}
              </button>
            )}

            {/* Complete - Only for received/inspecting */}
            {canComplete && onComplete && (
              <button
                onClick={() => handleAction("complete", () => onComplete(returnItem.id))}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-[#030712] px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "complete" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Completing...
                  </span>
                ) : (
                  "Complete Return"
                )}
              </button>
            )}

            {/* Process Refund - Only for completed refund type with pending refund */}
            {canProcessRefund && onProcessRefund && (
              <button
                onClick={() => handleAction("refund", () => onProcessRefund(returnItem.id))}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "refund" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Process Refund"
                )}
              </button>
            )}

            {/* Create Replacement Order - Only for completed replacement type without replacement order */}
            {canCreateReplacement && onCreateReplacement && (
              <button
                onClick={() => handleAction("replacement", () => onCreateReplacement(returnItem.id))}
                disabled={isLoading}
                className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "replacement" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  "Create Replacement Order"
                )}
              </button>
            )}

            {/* Close button when no actions available */}
            {!canApprove && !canReject && !canMarkInTransit && !canMarkReceived && !canComplete && !canProcessRefund && !canCreateReplacement && (
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowRejectModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
              Reject Return Request
            </h3>
            <p className="mb-4 font-geist text-[14px] text-[#6B7280]">
              Please provide a reason for rejecting this return request.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="mb-4 h-24 w-full resize-none rounded-lg border border-[#E5E7EB] p-3 font-geist text-[14px] focus:border-[#030712] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={isLoading}
                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || isLoading}
                className="rounded-lg bg-red-600 px-4 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAction === "reject" ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Rejecting...
                  </span>
                ) : (
                  "Reject"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EasyParcel Shipping Modal */}
      {showEasyParcelModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={resetEasyParcelModal}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
              {easyParcelStep === "rates" && "Select Shipping Rate"}
              {easyParcelStep === "confirm" && "Confirm Shipping Details"}
              {easyParcelStep === "pay" && "Pay for Shipping"}
            </h3>

            {/* Error Message */}
            {easyParcelError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3">
                <p className="font-geist text-[14px] text-red-700">{easyParcelError}</p>
              </div>
            )}

            {/* Step 1: Select Rate */}
            {easyParcelStep === "rates" && (
              <>
                {/* Weight Display - calculated from items */}
                <div className="mb-4">
                  <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
                    Package Weight
                  </label>
                  <div className="rounded-lg bg-[#F9FAFB] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-geist text-[14px] text-[#6B7280]">
                        Calculated from items
                      </span>
                      <span className="font-geist text-[16px] font-bold text-[#030712]">
                        {shippingWeight.toFixed(2)} kg
                      </span>
                    </div>
                    <p className="mt-1 font-geist text-[12px] text-[#9CA3AF]">
                      Weight is calculated based on the products being returned
                    </p>
                  </div>
                </div>

                {/* Pickup Date */}
                <div className="mb-4">
                  <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
                    Pickup Date
                  </label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-lg border border-[#E5E7EB] p-2 font-geist text-[14px] focus:border-[#030712] focus:outline-none"
                  />
                </div>

                {/* Shipping Rates List */}
                <div className="mb-4">
                  <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
                    Available Couriers
                  </label>
                  {loadingAction === "fetch_rates" ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="h-8 w-8 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : shippingRates.length === 0 ? (
                    <p className="py-4 text-center font-geist text-[14px] text-[#6B7280]">
                      No shipping rates available
                    </p>
                  ) : (
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {shippingRates.map((rate) => (
                        <button
                          key={`${rate.courier_id}-${rate.service_id}`}
                          onClick={() => setSelectedRate(rate)}
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            selectedRate?.service_id === rate.service_id && selectedRate?.courier_id === rate.courier_id
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-[#E5E7EB] hover:border-[#9CA3AF]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {rate.courier_logo && (
                              <img
                                src={rate.courier_logo}
                                alt={rate.courier_name}
                                className="h-8 w-8 object-contain"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-geist text-[14px] font-medium text-[#030712]">
                                {rate.courier_name}
                              </p>
                              <p className="font-geist text-[12px] text-[#6B7280]">
                                {rate.service_name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-geist text-[14px] font-bold text-[#030712]">
                                {rate.price_display || `$${rate.price.toFixed(2)}`}
                              </p>
                              {rate.delivery_eta && (
                                <p className="font-geist text-[12px] text-[#6B7280]">
                                  {rate.delivery_eta}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={resetEasyParcelModal}
                    disabled={isLoading}
                    className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setEasyParcelStep("confirm")}
                    disabled={!selectedRate || !pickupDate || isLoading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Confirm Details */}
            {easyParcelStep === "confirm" && selectedRate && (
              <>
                <div className="mb-4 space-y-3 rounded-lg bg-[#F9FAFB] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-geist text-[14px] text-[#6B7280]">Courier</span>
                    <span className="font-geist text-[14px] font-medium text-[#030712]">
                      {selectedRate.courier_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-geist text-[14px] text-[#6B7280]">Service</span>
                    <span className="font-geist text-[14px] font-medium text-[#030712]">
                      {selectedRate.service_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-geist text-[14px] text-[#6B7280]">Weight</span>
                    <span className="font-geist text-[14px] font-medium text-[#030712]">
                      {shippingWeight} kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-geist text-[14px] text-[#6B7280]">Pickup Date</span>
                    <span className="font-geist text-[14px] font-medium text-[#030712]">
                      {pickupDate}
                    </span>
                  </div>
                  <div className="border-t border-[#E5E7EB] pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-geist text-[14px] font-bold text-[#030712]">Total</span>
                      <span className="font-geist text-[16px] font-bold text-[#030712]">
                        {selectedRate.price_display || `$${selectedRate.price.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shipping Direction Info */}
                <div className="mb-4 rounded-lg bg-blue-50 p-3">
                  <p className="font-geist text-[12px] text-blue-700">
                    The shipping label will be generated for the customer to send the return items back to the warehouse.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEasyParcelStep("rates")}
                    disabled={isLoading}
                    className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitEasyParcel}
                    disabled={isLoading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingAction === "submit_easyparcel" ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      "Submit to EasyParcel"
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Pay */}
            {easyParcelStep === "pay" && (
              <>
                <div className="mb-4 rounded-lg bg-green-50 p-4">
                  <p className="mb-2 font-geist text-[14px] font-medium text-green-800">
                    Order submitted successfully!
                  </p>
                  {easyParcelOrderNo && (
                    <p className="font-geist text-[12px] text-green-700">
                      Order No: {easyParcelOrderNo}
                    </p>
                  )}
                </div>

                <p className="mb-4 font-geist text-[14px] text-[#6B7280]">
                  Click the button below to pay for the shipping and generate the AWB/tracking number.
                </p>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={resetEasyParcelModal}
                    disabled={isLoading}
                    className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayEasyParcel}
                    disabled={isLoading}
                    className="rounded-lg bg-green-600 px-4 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingAction === "pay_easyparcel" ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing Payment...
                      </span>
                    ) : (
                      "Pay & Get AWB"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </>
  );

  return createPortal(drawerContent, document.body);
}
