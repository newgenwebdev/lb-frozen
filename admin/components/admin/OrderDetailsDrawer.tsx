"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { Order, OrderItem, PaymentStatus, FulfillmentStatus } from "@/lib/validators/order";
import type { Return } from "@/lib/validators/return";
import type { EasyParcelRate } from "@/lib/types/shipping-settings";
import { getEasyParcelRates } from "@/lib/api/shipping-settings";
import { printOrderReceipt } from "@/lib/utils/print";

// EasyParcel shipping info from order metadata
type EasyParcelShippingInfo = {
  service_id: string;
  service_name: string;
  courier_id: string;
  courier_name: string;
  courier_logo: string;
  price: number;
  price_display: string;
  pickup_date: string;
  delivery_eta: string;
  has_cod: boolean;
  has_insurance: boolean;
};

type OrderDetailsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  returns?: Return[];
  onMarkAsShipped?: (orderId: string) => Promise<void>;
  onMarkAsDelivered?: (orderId: string) => Promise<void>;
  onCancelOrder?: (orderId: string) => Promise<void>;
  onRequestReturn?: (orderId: string) => void;
  onViewReturn?: (returnId: string) => void;
  onShipWithEasyParcel?: (orderId: string, shippingInfo: EasyParcelShippingInfo) => Promise<void>;
  onUpdateOrderShipping?: (orderId: string, shippingInfo: EasyParcelShippingInfo) => Promise<void>;
};

// Payment status badge configuration
const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  awaiting: { label: "Awaiting Payment", className: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Paid", className: "bg-green-100 text-green-800" },
  captured: { label: "Paid", className: "bg-green-100 text-green-800" },
  authorized: { label: "Authorized", className: "bg-blue-100 text-blue-800" },
  refunded: { label: "Refunded", className: "bg-red-100 text-red-800" },
  partially_refunded: { label: "Partial Refund", className: "bg-orange-100 text-orange-800" },
};

// Fulfillment status badge configuration
const fulfillmentStatusConfig: Record<FulfillmentStatus, { label: string; className: string }> = {
  unfulfilled: { label: "Unfulfilled", className: "bg-gray-100 text-gray-800" },
  processing: { label: "Processing", className: "bg-blue-100 text-blue-800" },
  shipped: { label: "Shipped", className: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
};

// Return status badge configuration
const returnStatusConfig: Record<Return["status"], { label: string; className: string }> = {
  requested: { label: "Requested", className: "bg-orange-100 text-orange-800" },
  approved: { label: "Approved", className: "bg-blue-100 text-blue-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
  in_transit: { label: "In Transit", className: "bg-indigo-100 text-indigo-800" },
  received: { label: "Received", className: "bg-purple-100 text-purple-800" },
  inspecting: { label: "Inspecting", className: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800" },
};

// Helper to check if an item is a PWP item
function isPWPItem(item: OrderItem): boolean {
  return item.metadata?.is_pwp_item === true;
}

// Helper to check if an order item has variant discount (Set Discount Global)
function hasVariantDiscount(item: OrderItem): boolean {
  return item.metadata?.is_variant_discount === true;
}

// Helper to check if an order item has wholesale tier discount
function hasWholesaleTierDiscount(item: OrderItem): boolean {
  return item.metadata?.is_bulk_price === true;
}

// Helper to get original price before discount
function getOriginalPrice(item: OrderItem): number {
  // If original_unit_price exists in metadata, use it
  if (item.metadata?.original_unit_price) {
    return Number(item.metadata.original_unit_price);
  }

  // For variant discount items without original_unit_price, calculate from unit_price + discount
  // This handles cases where the order was created before original_unit_price was stored
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    return item.unit_price + Number(item.metadata.variant_discount_amount);
  }

  return item.unit_price;
}

// Helper to get the discounted price for variant discount items
// This calculates the correct price after discount, regardless of what's stored in unit_price
function getDiscountedPrice(item: OrderItem): number {
  // For variant discount items, calculate from original - discount
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    const originalPrice = getOriginalPrice(item);
    const discountAmount = Number(item.metadata.variant_discount_amount) || 0;
    return Math.max(0, originalPrice - discountAmount);
  }

  // For wholesale tier items, unit_price is already the discounted price
  if (item.metadata?.is_bulk_price) {
    return item.unit_price;
  }

  return item.unit_price;
}

// Helper to get PWP discount amount for an item
function getPWPDiscountAmount(item: OrderItem): number {
  if (isPWPItem(item) && item.metadata?.pwp_discount_amount) {
    return Number(item.metadata.pwp_discount_amount) || 0;
  }
  return 0;
}

// Helper to get effective price for an item (after PWP discount)
function getEffectivePrice(item: OrderItem): number {
  if (item.effective_price !== undefined) {
    return item.effective_price;
  }
  const discountAmount = getPWPDiscountAmount(item);
  return item.unit_price - discountAmount;
}

export function OrderDetailsDrawer({
  isOpen,
  onClose,
  order,
  returns = [],
  onMarkAsShipped,
  onMarkAsDelivered,
  onCancelOrder,
  onRequestReturn,
  onViewReturn,
  onShipWithEasyParcel,
  onUpdateOrderShipping,
}: OrderDetailsDrawerProps): React.JSX.Element | null {
  // Explicitly type returns to avoid unknown type inference issues
  const typedReturns: Return[] = returns;
  const [mounted, setMounted] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isShippingWithEasyParcel, setIsShippingWithEasyParcel] = useState(false);

  // State for shipping method selection (free shipping orders)
  const [availableRates, setAvailableRates] = useState<EasyParcelRate[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [selectedRate, setSelectedRate] = useState<EasyParcelRate | null>(null);
  const [isSavingShipping, setIsSavingShipping] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const ratesFetchedRef = useRef<string | null>(null); // Track which order we fetched rates for

  // Reset loading states when drawer closes or order changes
  useEffect(() => {
    if (!isOpen) {
      setIsShipping(false);
      setIsDelivering(false);
      setIsCancelling(false);
      setIsShippingWithEasyParcel(false);
      // Reset shipping selection states
      setAvailableRates([]);
      setSelectedRate(null);
      setRatesError(null);
      ratesFetchedRef.current = null;
    }
  }, [isOpen]);

  // Handlers with loading state
  const handleMarkAsShipped = async (): Promise<void> => {
    if (!order || isShipping || !onMarkAsShipped) return;
    setIsShipping(true);
    try {
      await onMarkAsShipped(order.id);
    } finally {
      setIsShipping(false);
    }
  };

  const handleMarkAsDelivered = async (): Promise<void> => {
    if (!order || isDelivering || !onMarkAsDelivered) return;
    setIsDelivering(true);
    try {
      await onMarkAsDelivered(order.id);
    } finally {
      setIsDelivering(false);
    }
  };

  const handleCancelOrder = async (): Promise<void> => {
    if (!order || isCancelling || !onCancelOrder) return;
    setIsCancelling(true);
    try {
      await onCancelOrder(order.id);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleShipWithEasyParcel = async (): Promise<void> => {
    if (!order || isShippingWithEasyParcel || !onShipWithEasyParcel) return;
    const easyParcelShipping = order.metadata?.easyparcel_shipping as EasyParcelShippingInfo | undefined;
    if (!easyParcelShipping) return;

    setIsShippingWithEasyParcel(true);
    try {
      await onShipWithEasyParcel(order.id, easyParcelShipping);
    } finally {
      setIsShippingWithEasyParcel(false);
    }
  };

  // Save selected shipping method to order
  const handleSaveShippingMethod = async (): Promise<void> => {
    if (!order || !selectedRate || isSavingShipping || !onUpdateOrderShipping) return;

    setIsSavingShipping(true);
    try {
      const shippingInfo: EasyParcelShippingInfo = {
        service_id: selectedRate.service_id,
        service_name: selectedRate.service_name,
        courier_id: selectedRate.courier_id,
        courier_name: selectedRate.courier_name,
        courier_logo: selectedRate.courier_logo,
        price: selectedRate.price,
        price_display: selectedRate.price_display,
        pickup_date: selectedRate.pickup_date,
        delivery_eta: selectedRate.delivery_eta,
        has_cod: selectedRate.has_cod,
        has_insurance: selectedRate.has_insurance,
      };

      await onUpdateOrderShipping(order.id, shippingInfo);
      // Reset state after successful save
      setSelectedRate(null);
      setAvailableRates([]);
      ratesFetchedRef.current = null;
    } catch (error) {
      console.error("Failed to save shipping method:", error);
      setRatesError("Failed to save shipping method. Please try again.");
    } finally {
      setIsSavingShipping(false);
    }
  };

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

  // Auto-fetch EasyParcel rates when drawer opens for free shipping orders
  useEffect(() => {
    if (!isOpen || !order) return;

    // Check if this is a free shipping order that needs shipping method selection
    const freeShippingApplied = order.metadata?.free_shipping_applied === true;
    const easyParcelShipping = order.metadata?.easyparcel_shipping;
    const needsShipping = freeShippingApplied &&
      !easyParcelShipping &&
      (order.metadata?.shipping_pending_admin_selection === true || order.metadata?.free_shipping_no_method_selected === true);

    // Check if order can be shipped (paid + unfulfilled/processing)
    const isPaid = order.payment_status === "paid" || order.payment_status === "captured";
    const canShip = isPaid && (order.fulfillment_status === "unfulfilled" || order.fulfillment_status === "processing");

    // Only fetch if this order needs shipping selection and we haven't fetched for this order yet
    if (needsShipping && canShip && ratesFetchedRef.current !== order.id) {
      ratesFetchedRef.current = order.id;
      setIsLoadingRates(true);
      setRatesError(null);

      const fetchRates = async (): Promise<void> => {
        try {
          // Use the order's shipping address postal code
          const receiverPostcode = order.shipping_address?.postal_code || "059897";
          // Estimate weight: 0.5kg per item
          const estimatedWeight = Math.max(0.5, (order.items_count || 1) * 0.5);

          const response = await getEasyParcelRates({
            receiver_postcode: receiverPostcode,
            weight: estimatedWeight,
          });

          if (response.success && response.rates.length > 0) {
            setAvailableRates(response.rates);
          } else {
            setRatesError(response.message || "No shipping rates available");
          }
        } catch (error) {
          console.error("Failed to fetch shipping rates:", error);
          setRatesError("Failed to fetch shipping rates. Please try again.");
        } finally {
          setIsLoadingRates(false);
        }
      };

      fetchRates();
    }
  }, [isOpen, order]);

  const formatCurrency = (amount: number, currency: string): string => {
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

  if (!order || !mounted) return null;

  // Get status configurations
  const paymentConfig = paymentStatusConfig[order.payment_status] || paymentStatusConfig.awaiting;
  const fulfillmentConfig = fulfillmentStatusConfig[order.fulfillment_status] || fulfillmentStatusConfig.unfulfilled;

  // Calculate subtotal from items (original prices before any discount)
  const originalSubtotal = order.items?.reduce((sum, item) => {
    const originalPrice = getOriginalPrice(item);
    return sum + originalPrice * item.quantity;
  }, 0) || order.subtotal || 0;

  // Calculate PWP discount from item metadata
  const pwpDiscount = order.items?.reduce((sum, item) => {
    const discountAmount = getPWPDiscountAmount(item);
    return sum + (discountAmount * item.quantity);
  }, 0) || 0;

  // Calculate variant discount from item metadata (Set Discount Global from admin)
  const variantDiscount = order.items?.reduce((sum, item) => {
    if (hasVariantDiscount(item) && item.metadata?.variant_discount_amount) {
      return sum + (Number(item.metadata.variant_discount_amount) || 0) * item.quantity;
    }
    return sum;
  }, 0) || 0;

  // Calculate wholesale tier discount from item metadata
  const wholesaleDiscount = order.items?.reduce((sum, item) => {
    if (hasWholesaleTierDiscount(item)) {
      const originalPrice = getOriginalPrice(item);
      const currentPrice = item.unit_price;
      return sum + (originalPrice - currentPrice) * item.quantity;
    }
    return sum;
  }, 0) || 0;

  // Subtotal after all item-level discounts
  const subtotalAfterItemDiscounts = originalSubtotal - pwpDiscount - variantDiscount - wholesaleDiscount;

  // Extract points discount from order metadata
  const pointsDiscount = Number(order.metadata?.points_discount_amount) || 0;
  const pointsRedeemed = Number(order.metadata?.points_to_redeem) || 0;

  // Extract membership promo discount from order metadata
  const membershipPromoDiscount = Number(order.metadata?.applied_membership_promo_discount) || 0;
  const membershipPromoName = order.metadata?.applied_membership_promo_name as string | undefined;

  // Extract tier discount from order metadata (auto-applied based on membership tier)
  const tierDiscount = Number(order.metadata?.tier_discount_amount) || 0;
  const tierDiscountPercentage = Number(order.metadata?.tier_discount_percentage) || 0;
  const tierName = order.metadata?.tier_name as string | undefined;

  // Extract free shipping discount from order metadata
  const freeShippingApplied = order.metadata?.free_shipping_applied === true;
  const originalShippingCost = Number(order.metadata?.original_shipping_cost) || 0;
  const effectiveShippingCost = freeShippingApplied ? 0 : (order.shipping_total || 0);

  // EasyParcel shipping info from order metadata
  const easyParcelShipping = order.metadata?.easyparcel_shipping as EasyParcelShippingInfo | undefined;

  // Check if this is a free shipping order that needs shipping method selection
  const needsShippingSelection = freeShippingApplied &&
    !easyParcelShipping &&
    (order.metadata?.shipping_pending_admin_selection === true || order.metadata?.free_shipping_no_method_selected === true);

  // Coupon discount calculation:
  // Medusa's discount_total may include various adjustments (coupons, promotions, points)
  // We need to subtract PWP discount and points discount to get the actual coupon discount
  // Only show coupon discount if there's actually a coupon code applied
  const totalDiscount = order.discount_total || 0;
  const hasCoupon = Boolean(order.coupon_code || order.metadata?.coupon_code);
  // Calculate coupon discount: total discount minus PWP minus points (to avoid double-counting)
  const couponDiscount = hasCoupon ? Math.max(0, totalDiscount - pwpDiscount - pointsDiscount) : 0;

  const tax = order.tax_total || 0;
  // Calculate correct total with all discounts (including free shipping)
  const calculatedTotal = Math.max(0, subtotalAfterItemDiscounts - couponDiscount - pointsDiscount - membershipPromoDiscount - tierDiscount + effectiveShippingCost + tax);
  const total = calculatedTotal;

  // Determine available actions based on current status
  // Can ship: paid/captured orders that are unfulfilled or processing (not yet shipped)
  const isPaid = order.payment_status === "paid" || order.payment_status === "captured";
  const canShip = isPaid &&
    (order.fulfillment_status === "unfulfilled" || order.fulfillment_status === "processing");
  // Can deliver: only shipped orders
  const canDeliver = order.fulfillment_status === "shipped";
  // Can cancel: only if not yet shipped, delivered, or already cancelled
  // Once an order is shipped, it cannot be cancelled (would need refund/return flow instead)
  const canCancel = order.fulfillment_status !== "shipped" &&
    order.fulfillment_status !== "delivered" &&
    order.fulfillment_status !== "cancelled" &&
    order.status !== "cancelled";
  // Can request return: only for delivered orders that have been paid
  // Also check if there's no active return in progress
  const hasActiveReturn = typedReturns.some((r: Return) =>
    !["completed", "rejected", "cancelled"].includes(r.status)
  );
  const canRequestReturn = order.fulfillment_status === "delivered" &&
    isPaid &&
    order.status !== "cancelled" &&
    !hasActiveReturn;

  // Timeline steps
  const timelineSteps = [
    {
      label: "Order Placed",
      date: formatDate(order.created_at),
      completed: true,
    },
    {
      label: "Payment Received",
      date: order.paid_at ? formatDate(order.paid_at) : isPaid ? formatDate(order.created_at) : null,
      completed: isPaid || order.payment_status === "refunded",
    },
    {
      label: "Shipped",
      date: order.shipped_at ? formatDate(order.shipped_at) : null,
      completed: order.fulfillment_status === "shipped" || order.fulfillment_status === "delivered",
    },
    {
      label: "Delivered",
      date: order.delivered_at ? formatDate(order.delivered_at) : null,
      completed: order.fulfillment_status === "delivered",
    },
  ];

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
            Order #{order.display_id}
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
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${paymentConfig.className}`}>
              {paymentConfig.label}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${fulfillmentConfig.className}`}>
              {fulfillmentConfig.label}
            </span>
            {freeShippingApplied && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Free Shipping
              </span>
            )}
          </div>

          {/* Order Timeline */}
          <div className="mb-6">
            <h3 className="mb-4 font-geist text-[16px] font-medium text-[#030712]">Order Timeline</h3>
            <div className="relative">
              {timelineSteps.map((step, index) => (
                <div key={index} className="relative flex items-start pb-4 last:pb-0">
                  {/* Line */}
                  {index < timelineSteps.length - 1 && (
                    <div
                      className={`absolute left-[9px] top-5 h-full w-0.5 ${
                        step.completed ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                  {/* Dot */}
                  <div
                    className={`relative z-10 mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      step.completed ? "bg-green-500" : "bg-gray-200"
                    }`}
                  >
                    {step.completed && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1">
                    <p className={`font-geist text-[14px] font-medium ${step.completed ? "text-[#030712]" : "text-[#9CA3AF]"}`}>
                      {step.label}
                    </p>
                    <p className="font-geist text-[12px] text-[#6B7280]">
                      {step.date || "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Requests Section - Show if there are any returns */}
          {typedReturns.length > 0 && (
            <React.Fragment>
              <div className="mb-6 border-t border-[#E5E7EB]" />
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-2">
                  <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <h3 className="font-geist text-[16px] font-medium text-[#030712]">
                    Return Requests ({typedReturns.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {typedReturns.map((ret: Return): React.JSX.Element => {
                    const statusConfig = returnStatusConfig[ret.status];
                    const isActive = !["completed", "rejected", "cancelled"].includes(ret.status);
                    return (
                      <div
                        key={ret.id}
                        className={`rounded-lg border p-3 ${isActive ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-gray-50"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}>
                                {statusConfig.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {ret.return_type === "refund" ? "Refund" : "Replacement"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700">
                              {ret.items.length} item{ret.items.length > 1 ? "s" : ""} - {formatCurrency(ret.total_refund, order.currency)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              Requested: {formatDate(ret.requested_at)}
                            </p>
                          </div>
                          {onViewReturn && (
                            <button
                              onClick={() => onViewReturn(ret.id)}
                              className="cursor-pointer text-sm font-medium text-[#007AFF] hover:underline"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasActiveReturn && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>This order has an active return in progress</span>
                  </div>
                )}
              </div>
            </React.Fragment>
          )}

          <div className="mb-6 border-t border-[#E5E7EB]" />

          <div className="mb-6 space-y-4">
            <h3 className="font-geist text-[16px] font-medium text-[#030712]">Order Details</h3>

            {/* Customer Account */}
            <div className="flex items-center justify-between">
              <span className="font-geist text-[14px] font-medium text-[#858585]">Account Holder</span>
              <span className="font-geist text-[14px] font-medium text-[#030712]">{order.customer_name}</span>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between">
              <span className="font-geist text-[14px] font-medium text-[#858585]">Email</span>
              <span className="font-geist text-[14px] font-medium text-[#030712]">{order.customer_email}</span>
            </div>

            {/* Payment Method */}
            <div className="flex items-center justify-between">
              <span className="font-geist text-[14px] font-medium text-[#858585]">Payment Method</span>
              <span className="font-geist text-[14px] font-medium text-[#030712]">
                {order.payment_method || "Credit Card"}
              </span>
            </div>

            {/* Order Date */}
            <div className="flex items-center justify-between">
              <span className="font-geist text-[14px] font-medium text-[#858585]">Order Date</span>
              <span className="font-geist text-[14px] font-medium text-[#030712]">{formatDate(order.created_at)}</span>
            </div>

            {/* Shipping Info */}
            {(order.courier || order.tracking_number) && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] font-medium text-[#858585]">Courier</span>
                  <span className="font-geist text-[14px] font-medium text-[#030712]">{order.courier || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] font-medium text-[#858585]">Tracking Number</span>
                  <span className="font-geist text-[14px] font-medium text-[#007AFF]">{order.tracking_number || "-"}</span>
                </div>
              </>
            )}
          </div>

          {/* Shipping Address Section */}
          {order.shipping_address && (
            <>
              <div className="mb-6 border-t border-[#E5E7EB]"></div>
              <div className="mb-6 space-y-4">
                <h3 className="font-geist text-[16px] font-medium text-[#030712]">Shipping Address</h3>

                {/* Recipient Name */}
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] font-medium text-[#858585]">Recipient</span>
                  <span className="font-geist text-[14px] font-medium text-[#030712]">
                    {[order.shipping_address.first_name, order.shipping_address.last_name].filter(Boolean).join(" ") || "-"}
                  </span>
                </div>

                {/* Address */}
                <div className="flex items-start justify-between">
                  <span className="font-geist text-[14px] font-medium text-[#858585]">Address</span>
                  <span className="font-geist text-[14px] font-medium text-[#030712] text-right max-w-[60%]">
                    {[
                      order.shipping_address.address_1,
                      order.shipping_address.address_2,
                      order.shipping_address.city,
                      order.shipping_address.province,
                      order.shipping_address.postal_code,
                      order.shipping_address.country_code?.toUpperCase(),
                    ].filter(Boolean).join(", ") || "-"}
                  </span>
                </div>

                {/* Phone */}
                {order.shipping_address.phone && (
                  <div className="flex items-center justify-between">
                    <span className="font-geist text-[14px] font-medium text-[#858585]">Phone</span>
                    <span className="font-geist text-[14px] font-medium text-[#030712]">{order.shipping_address.phone}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* EasyParcel Shipping Method Section */}
          {easyParcelShipping && (
            <>
              <div className="mb-6 border-t border-[#E5E7EB]"></div>
              <div className="mb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  <h3 className="font-geist text-[16px] font-medium text-[#030712]">Shipping Method</h3>
                </div>

                {/* Courier Info */}
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                  <div className="flex items-center gap-3">
                    {easyParcelShipping.courier_logo && (
                      <img
                        src={easyParcelShipping.courier_logo}
                        alt={easyParcelShipping.courier_name}
                        className="h-10 w-10 rounded object-contain bg-white p-1"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-geist text-[14px] font-medium text-[#030712]">
                        {easyParcelShipping.courier_name}
                      </p>
                      <p className="font-geist text-[12px] text-[#6B7280]">
                        {easyParcelShipping.service_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-geist text-[14px] font-medium text-indigo-600">
                        {easyParcelShipping.price_display}
                      </p>
                      <p className="font-geist text-[11px] text-[#6B7280]">
                        ETA: {easyParcelShipping.delivery_eta}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#858585]">Service ID:</span>
                    <span className="font-mono text-[#030712]">
                      {easyParcelShipping.service_id}
                    </span>
                  </div>
                  {easyParcelShipping.has_cod && (
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[#030712]">COD Available</span>
                    </div>
                  )}
                  {easyParcelShipping.has_insurance && (
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[#030712]">Insurance Available</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Shipping Method Selection Section - For free shipping orders without selected method */}
          {needsShippingSelection && canShip && (
            <>
              <div className="mb-6 border-t border-[#E5E7EB]"></div>
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    <h3 className="font-geist text-[16px] font-medium text-[#030712]">Shipping Method</h3>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 font-geist text-[11px] font-medium text-green-700">
                    Free Shipping
                  </span>
                </div>

                {/* Error message */}
                {ratesError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="font-geist text-[13px] text-red-700">{ratesError}</p>
                  </div>
                )}

                {/* Loading state */}
                {isLoadingRates && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="font-geist text-[13px] text-[#6B7280]">Loading shipping options...</span>
                    </div>
                  </div>
                )}

                {/* Available rates list */}
                {!isLoadingRates && availableRates.length > 0 && (
                  <>
                    <p className="font-geist text-[13px] text-[#6B7280]">
                      Select a courier for this order:
                    </p>
                    <div className="max-h-[280px] space-y-2 overflow-y-auto">
                      {availableRates.map((rate) => (
                        <button
                          key={rate.service_id}
                          onClick={() => setSelectedRate(rate)}
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            selectedRate?.service_id === rate.service_id
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {rate.courier_logo && (
                              <img
                                src={rate.courier_logo}
                                alt={rate.courier_name}
                                className="h-8 w-8 rounded object-contain bg-white"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-geist text-[13px] font-medium text-[#030712] truncate">
                                {rate.courier_name}
                              </p>
                              <p className="font-geist text-[11px] text-[#6B7280] truncate">
                                {rate.service_name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-geist text-[13px] font-medium text-indigo-600">
                                {rate.price_display}
                              </p>
                              <p className="font-geist text-[10px] text-[#6B7280]">
                                ETA: {rate.delivery_eta}
                              </p>
                            </div>
                            {selectedRate?.service_id === rate.service_id && (
                              <svg className="h-5 w-5 shrink-0 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Save button */}
                    {selectedRate && (
                      <button
                        onClick={handleSaveShippingMethod}
                        disabled={isSavingShipping}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingShipping ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Saving...
                          </span>
                        ) : (
                          `Select ${selectedRate.courier_name}`
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Divider */}
          <div className="mb-6 border-t border-[#E5E7EB]"></div>

          {/* Products Section */}
          <div className="mb-6">
            <h3 className="mb-4 font-geist text-[16px] font-medium text-[#030712]">Products</h3>
            <div className="space-y-3">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => {
                  const isPwp = isPWPItem(item);
                  const effectivePrice = getEffectivePrice(item);
                  const hasVariantDiscountFlag = hasVariantDiscount(item);
                  const hasWholesaleDiscount = hasWholesaleTierDiscount(item);
                  const originalPrice = getOriginalPrice(item);
                  const discountedPrice = getDiscountedPrice(item);
                  const hasNonPWPDiscount = !isPwp && (hasVariantDiscountFlag || hasWholesaleDiscount);
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5]">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.product_name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[16px]">📦</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-geist text-[14px] font-medium text-[#030712]">{item.product_name}</p>
                          {isPwp && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                              PWP
                            </span>
                          )}
                          {!isPwp && hasWholesaleDiscount && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                              Bulk
                            </span>
                          )}
                          {!isPwp && !hasWholesaleDiscount && hasVariantDiscountFlag && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                              Sale
                            </span>
                          )}
                        </div>
                        <p className="font-geist text-[12px] text-[#858585]">x{item.quantity}</p>
                      </div>
                      <div className="text-right">
                        {isPwp ? (
                          <>
                            <p className="font-geist text-[14px] font-medium text-amber-600">
                              {formatCurrency(effectivePrice * item.quantity, order.currency)}
                            </p>
                            <p className="font-geist text-[11px] text-[#9CA3AF] line-through">
                              {formatCurrency(item.unit_price * item.quantity, order.currency)}
                            </p>
                          </>
                        ) : hasNonPWPDiscount ? (
                          <>
                            <p className="font-geist text-[14px] font-medium text-green-600">
                              {formatCurrency(discountedPrice * item.quantity, order.currency)}
                            </p>
                            <p className="font-geist text-[11px] text-[#9CA3AF] line-through">
                              {formatCurrency(originalPrice * item.quantity, order.currency)}
                            </p>
                          </>
                        ) : (
                          <p className="font-geist text-[14px] font-medium text-[#030712]">
                            {formatCurrency(item.unit_price * item.quantity, order.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="font-geist text-[14px] text-[#858585]">{order.items_count} item(s)</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-[#E5E7EB]"></div>

          {/* Payment Details Section */}
          <div>
            <h3 className="mb-4 font-geist text-[16px] font-medium text-[#030712]">Payment Details</h3>
            <div className="space-y-3">
              {/* Sub Totals */}
              <div className="flex items-center justify-between">
                <span className="font-geist text-[14px] text-[#858585]">Sub Totals</span>
                <span className="font-geist text-[14px] text-[#030712]">{formatCurrency(originalSubtotal, order.currency)}</span>
              </div>

              {/* PWP Discount - only show if there's a PWP discount */}
              {pwpDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] text-amber-600">PWP Discount</span>
                  <span className="font-geist text-[14px] text-amber-600">
                    -{formatCurrency(pwpDiscount, order.currency)}
                  </span>
                </div>
              )}

              {/* Variant Discount - only show if there's a variant discount */}
              {variantDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] text-green-600">Product Discount</span>
                  <span className="font-geist text-[14px] text-green-600">
                    -{formatCurrency(variantDiscount, order.currency)}
                  </span>
                </div>
              )}

              {/* Wholesale Discount - only show if there's a wholesale discount */}
              {wholesaleDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] text-green-600">Bulk Discount</span>
                  <span className="font-geist text-[14px] text-green-600">
                    -{formatCurrency(wholesaleDiscount, order.currency)}
                  </span>
                </div>
              )}

              {/* Coupon Discount - only show if there's a coupon discount */}
              {couponDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] text-[#858585]">
                    Coupon Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}
                  </span>
                  <span className="font-geist text-[14px] text-[#030712]">
                    -{formatCurrency(couponDiscount, order.currency)}
                  </span>
                </div>
              )}

              {/* Points Discount - only show if there's a points discount */}
              {pointsDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] text-amber-600">
                    Points{pointsRedeemed > 0 ? ` (${pointsRedeemed.toLocaleString()} pts)` : ""}
                  </span>
                  <span className="font-geist text-[14px] text-amber-600">
                    -{formatCurrency(pointsDiscount, order.currency)}
                  </span>
                </div>
              )}

              {/* Membership Promo Discount - only show if there's a membership promo discount */}
              {membershipPromoDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] text-purple-600">
                    Member Discount{membershipPromoName ? ` (${membershipPromoName})` : ""}
                  </span>
                  <span className="font-geist text-[14px] text-purple-600">
                    -{formatCurrency(membershipPromoDiscount, order.currency)}
                  </span>
                </div>
              )}

              {/* Tier Discount - only show if there's a tier discount */}
              {tierDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] text-blue-600">
                    {tierName || "Member"}{tierDiscountPercentage > 0 ? ` (${tierDiscountPercentage}% off)` : ""}
                  </span>
                  <span className="font-geist text-[14px] text-blue-600">
                    -{formatCurrency(tierDiscount, order.currency)}
                  </span>
                </div>
              )}

              {/* Show generic Discount row if no discounts at all */}
              {pwpDiscount === 0 && variantDiscount === 0 && wholesaleDiscount === 0 && couponDiscount === 0 && pointsDiscount === 0 && membershipPromoDiscount === 0 && tierDiscount === 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-geist text-[14px] text-[#858585]">Discount</span>
                  <span className="font-geist text-[14px] text-[#030712]">{formatCurrency(0, order.currency)}</span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex items-center justify-between">
                <span className="font-geist text-[14px] text-[#858585]">Shipping</span>
                {freeShippingApplied ? (
                  <div className="flex items-center gap-2">
                    <span className="font-geist text-[12px] text-[#9CA3AF] line-through">
                      {formatCurrency(originalShippingCost, order.currency)}
                    </span>
                    <span className="font-geist text-[14px] font-medium text-green-600">FREE</span>
                  </div>
                ) : (
                  <span className="font-geist text-[14px] text-[#030712]">
                    {formatCurrency(order.shipping_total || 0, order.currency)}
                  </span>
                )}
              </div>

              {/* PPN/Tax */}
              <div className="flex items-center justify-between">
                <span className="font-geist text-[14px] text-[#858585]">PPN/Tax</span>
                <span className="font-geist text-[14px] text-[#030712]">{formatCurrency(tax, order.currency)}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-[#E5E7EB]"></div>

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="font-geist text-[16px] font-bold text-[#030712]">TOTAL</span>
                <span className="font-geist text-[16px] font-bold text-[#030712]">
                  {formatCurrency(total, order.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="shrink-0 border-t border-[#E5E7EB] bg-white p-4 md:p-6">
          <div className="flex flex-wrap gap-2">
            {/* Print Receipt - Always available */}
            <button
              onClick={() => printOrderReceipt(order)}
              className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
            >
              Print Receipt
            </button>

            {/* Ship with EasyParcel - For orders with EasyParcel shipping info */}
            {canShip && easyParcelShipping && onShipWithEasyParcel && (
              <button
                onClick={handleShipWithEasyParcel}
                disabled={isShippingWithEasyParcel}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isShippingWithEasyParcel ? (
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
                    Ship with EasyParcel
                  </span>
                )}
              </button>
            )}

            {/* Mark as Shipped - Fallback for orders without EasyParcel shipping info */}
            {canShip && !easyParcelShipping && onMarkAsShipped && (
              <button
                onClick={handleMarkAsShipped}
                disabled={isShipping}
                className="flex-1 rounded-lg bg-[#030712] px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isShipping ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Shipping...
                  </span>
                ) : (
                  "Mark as Shipped"
                )}
              </button>
            )}

            {/* Mark as Delivered - Only for shipped */}
            {canDeliver && onMarkAsDelivered && (
              <button
                onClick={handleMarkAsDelivered}
                disabled={isDelivering}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-geist text-[14px] font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDelivering ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Delivering...
                  </span>
                ) : (
                  "Mark as Delivered"
                )}
              </button>
            )}

            {/* Cancel Order - If not yet delivered or cancelled */}
            {canCancel && onCancelOrder && (
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="rounded-lg border border-red-200 px-4 py-2.5 font-geist text-[14px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCancelling ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-red-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Cancelling...
                  </span>
                ) : (
                  "Cancel"
                )}
              </button>
            )}

            {/* Request Return - Only for delivered orders */}
            {canRequestReturn && onRequestReturn && (
              <button
                onClick={() => onRequestReturn(order.id)}
                className="flex-1 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 font-geist text-[14px] font-medium text-orange-600 transition-colors hover:bg-orange-100"
              >
                Request Return
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}
