import React from "react";
import type { Order, PaymentStatus, FulfillmentStatus } from "@/lib/validators/order";
import type { Return, ReturnStatus } from "@/lib/validators/return";
import { getAvatarColorClass } from "@/lib/utils/overview";
import { printOrderReceipt } from "@/lib/utils/print";

type OrderCardProps = {
  order: Order;
  index: number;
  isSelected?: boolean;
  returns?: Return[];
  onSelect?: (orderId: string, selected: boolean) => void;
  onCancel?: (orderId: string) => void;
  onViewDetails?: (order: Order) => void;
};

// Payment status badge configuration
const paymentStatusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  awaiting: {
    label: "Awaiting",
    className: "bg-yellow-100 text-yellow-800",
  },
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-800",
  },
  captured: {
    label: "Paid",
    className: "bg-green-100 text-green-800",
  },
  authorized: {
    label: "Authorized",
    className: "bg-blue-100 text-blue-800",
  },
  refunded: {
    label: "Refunded",
    className: "bg-red-100 text-red-800",
  },
  partially_refunded: {
    label: "Partial Refund",
    className: "bg-orange-100 text-orange-800",
  },
};

// Fulfillment status badge configuration
const fulfillmentStatusConfig: Record<FulfillmentStatus, { label: string; className: string }> = {
  unfulfilled: {
    label: "Unfulfilled",
    className: "bg-gray-100 text-gray-800",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800",
  },
  shipped: {
    label: "Shipped",
    className: "bg-indigo-100 text-indigo-800",
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-100 text-green-800",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800",
  },
};

// Return status badge configuration
const returnStatusConfig: Record<ReturnStatus, { label: string; className: string }> = {
  requested: {
    label: "Return Requested",
    className: "bg-orange-100 text-orange-800",
  },
  approved: {
    label: "Return Approved",
    className: "bg-blue-100 text-blue-800",
  },
  rejected: {
    label: "Return Rejected",
    className: "bg-red-100 text-red-800",
  },
  in_transit: {
    label: "Return In Transit",
    className: "bg-indigo-100 text-indigo-800",
  },
  received: {
    label: "Return Received",
    className: "bg-purple-100 text-purple-800",
  },
  inspecting: {
    label: "Return Inspecting",
    className: "bg-yellow-100 text-yellow-800",
  },
  completed: {
    label: "Return Completed",
    className: "bg-green-100 text-green-800",
  },
  cancelled: {
    label: "Return Cancelled",
    className: "bg-gray-100 text-gray-800",
  },
};

// Helper to get the most relevant return status for display
function getMostRelevantReturn(returns: Return[]): Return | null {
  if (!returns || returns.length === 0) return null;

  // Priority order: in-progress returns first, then completed
  const priorityOrder: ReturnStatus[] = [
    "requested",
    "approved",
    "in_transit",
    "received",
    "inspecting",
    "completed",
    "rejected",
    "cancelled",
  ];

  // Sort returns by status priority
  const sorted = [...returns].sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.status);
    const bIndex = priorityOrder.indexOf(b.status);
    return aIndex - bIndex;
  });

  return sorted[0];
}

// Order item type
type OrderItem = NonNullable<Order["items"]>[number];

// Helper to get original price before discount for an order item
function getItemOriginalPrice(item: OrderItem): number {
  // If original_unit_price exists in metadata, use it
  if (item.metadata?.original_unit_price) {
    return Number(item.metadata.original_unit_price);
  }

  // For variant discount items without original_unit_price, calculate from unit_price + discount
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    return item.unit_price + Number(item.metadata.variant_discount_amount);
  }

  return item.unit_price;
}

// Helper to calculate correct order total including all discounts
function calculateOrderTotal(order: Order): number {
  // Calculate original subtotal using original prices (before any discounts)
  const originalSubtotal = order.items?.reduce((sum, item) => {
    const originalPrice = getItemOriginalPrice(item);
    return sum + originalPrice * item.quantity;
  }, 0) || order.subtotal || 0;

  // Calculate PWP discount from item metadata
  const pwpDiscount = order.items?.reduce((sum, item) => {
    if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
      return sum + (Number(item.metadata.pwp_discount_amount) || 0) * item.quantity;
    }
    return sum;
  }, 0) || 0;

  // Calculate variant discount from item metadata (Set Discount Global from admin)
  const variantDiscount = order.items?.reduce((sum, item) => {
    if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
      return sum + (Number(item.metadata.variant_discount_amount) || 0) * item.quantity;
    }
    return sum;
  }, 0) || 0;

  // Calculate wholesale/bulk discount from item metadata
  const wholesaleDiscount = order.items?.reduce((sum, item) => {
    if (item.metadata?.is_bulk_price) {
      const originalPrice = getItemOriginalPrice(item);
      const currentPrice = item.unit_price;
      return sum + (originalPrice - currentPrice) * item.quantity;
    }
    return sum;
  }, 0) || 0;

  // Extract points discount from order metadata
  const pointsDiscount = Number(order.metadata?.points_discount_amount) || 0;

  // Extract membership promo discount from order metadata
  const membershipPromoDiscount = Number(order.metadata?.applied_membership_promo_discount) || 0;

  // Extract tier discount from order metadata (auto-applied based on membership tier)
  const tierDiscount = Number(order.metadata?.tier_discount_amount) || 0;

  // Extract free shipping info
  const freeShippingApplied = order.metadata?.free_shipping_applied === true;
  const effectiveShippingCost = freeShippingApplied ? 0 : (order.shipping_total || 0);

  // Coupon discount calculation (avoid double-counting PWP and points)
  const totalDiscount = order.discount_total || 0;
  const hasCoupon = Boolean(order.coupon_code || order.metadata?.coupon_code);
  const couponDiscount = hasCoupon ? Math.max(0, totalDiscount - pwpDiscount - pointsDiscount) : 0;

  // Calculate correct total
  const subtotalAfterDiscounts = originalSubtotal - pwpDiscount - variantDiscount - wholesaleDiscount;
  const tax = order.tax_total || 0;
  return Math.max(0, subtotalAfterDiscounts - couponDiscount - pointsDiscount - membershipPromoDiscount - tierDiscount + effectiveShippingCost + tax);
}

export function OrderCard({ order, index, isSelected = false, returns = [], onSelect, onCancel, onViewDetails }: OrderCardProps): React.JSX.Element {
  const formatCurrency = (amount: number, currency: string): string => {
    const currencySymbol = "$";
    return `${currencySymbol} ${(amount / 100).toFixed(2)}`;
  };

  const getCustomerInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Can cancel: only if not yet shipped, delivered, or already cancelled
  // Once an order is shipped, it cannot be cancelled (would need refund/return flow instead)
  const canCancel = order.fulfillment_status !== "shipped" &&
    order.fulfillment_status !== "delivered" &&
    order.fulfillment_status !== "cancelled" &&
    order.status !== "cancelled";

  // Get status configurations with fallbacks
  const paymentConfig = paymentStatusConfig[order.payment_status] || paymentStatusConfig.awaiting;
  const fulfillmentConfig = fulfillmentStatusConfig[order.fulfillment_status] || fulfillmentStatusConfig.unfulfilled;

  // Get return status if any returns exist
  const mostRelevantReturn = getMostRelevantReturn(returns);
  const returnConfig = mostRelevantReturn ? returnStatusConfig[mostRelevantReturn.status] : null;
  const hasActiveReturn = mostRelevantReturn && !["completed", "rejected", "cancelled"].includes(mostRelevantReturn.status);

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 transition-shadow hover:shadow-sm md:p-6">
      <div className="flex gap-4">
        {/* Left: Checkbox */}
        <div className="shrink-0">
          <label className="flex cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect?.(order.id, e.target.checked)}
              className="peer sr-only"
            />
            <div className="flex h-5 w-5 items-center justify-center rounded border border-[#E3E3E3] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100 peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-2">
              <svg className="h-3 w-3 text-white opacity-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </label>
        </div>

        {/* Right: Content */}
        <div className="flex-1">
          {/* Top: Customer Info + Status Badges */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getAvatarColorClass(index)}`}>
                <span className="font-geist text-[12px] font-medium text-white">
                  {getCustomerInitials(order.customer_name)}
                </span>
              </div>
              <p className="overflow-hidden text-ellipsis font-geist text-[14px] font-normal leading-normal tracking-[-0.14px] text-[#030712]">
                {order.customer_name}
              </p>
            </div>
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${paymentConfig.className}`}>
                {paymentConfig.label}
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${fulfillmentConfig.className}`}>
                {fulfillmentConfig.label}
              </span>
              {/* Return Status Badge - show if there are any returns */}
              {returnConfig && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${returnConfig.className}`}>
                  {hasActiveReturn && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  )}
                  {returnConfig.label}
                  {returns.length > 1 && ` (${returns.length})`}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mb-4 border-t border-[#E5E7EB]"></div>

          {/* Bottom: Order Info */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            {/* Product Info */}
            <div className="flex w-[200px] shrink-0 items-start gap-3">
              {order.items && order.items.length > 0 ? (
                <>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F5F5F5]">
                    {order.items[0].thumbnail ? (
                      <img
                        src={order.items[0].thumbnail}
                        alt={order.items[0].product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[20px]">📦</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-geist text-[16px] font-medium leading-normal tracking-[-0.16px] text-[#030712]" title={order.items[0].product_name}>
                      {order.items[0].product_name}
                    </p>
                    <p className="overflow-hidden text-ellipsis font-geist text-[14px] font-normal leading-normal tracking-[-0.14px] text-[#6A7282]">
                      x{order.items[0].quantity}
                    </p>
                    {order.items.length > 1 && (
                      <p className="mt-2 font-geist text-[16px] font-medium leading-normal tracking-[-0.16px] text-[#030712]">
                        + {order.items.length - 1} other product{order.items.length - 1 > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F5]">
                    <span className="text-[20px]">📦</span>
                  </div>
                  <div>
                    <p className="font-geist text-[14px] font-normal text-[#6A7282]">{order.items_count} item(s)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Total */}
            <div className="w-[120px] shrink-0">
              <p className="mb-1 font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#858585]">Order Total</p>
              <p className="truncate font-geist text-[16px] font-bold leading-normal tracking-[-0.16px] text-[#2F2F2F]" title={formatCurrency(calculateOrderTotal(order), order.currency)}>
                {formatCurrency(calculateOrderTotal(order), order.currency)}
              </p>
              <p className="truncate font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#858585]" title={order.payment_method || "Credit Card"}>
                {order.payment_method || "Credit Card"}
              </p>
            </div>

            {/* Shipping Info */}
            <div className="w-[130px] shrink-0">
              <p className="mb-1 font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#858585]">Shipping</p>
              {order.tracking_number ? (
                <>
                  <p className="truncate font-geist text-[16px] font-bold leading-normal tracking-[-0.16px] text-[#2F2F2F]" title={order.courier || "Courier"}>
                    {order.courier || "Courier"}
                  </p>
                  <p className="truncate font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#007AFF]" title={order.tracking_number}>
                    {order.tracking_number}
                  </p>
                </>
              ) : (
                <>
                  {/* Show customer's selected courier or fulfillment status */}
                  <p className="truncate font-geist text-[16px] font-bold leading-normal tracking-[-0.16px] text-[#2F2F2F]" title={(order.metadata?.easyparcel_shipping as { courier_name?: string })?.courier_name || fulfillmentConfig.label}>
                    {(order.metadata?.easyparcel_shipping as { courier_name?: string })?.courier_name || fulfillmentConfig.label}
                  </p>
                  {/* Show free shipping badge or "No tracking yet" */}
                  {order.metadata?.free_shipping_applied ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-geist text-[12px] font-medium text-green-700">
                      FREE
                    </span>
                  ) : (
                    <p className="truncate font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#858585]">
                      No tracking yet
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Order ID & Date */}
            <div className="w-[130px] shrink-0">
              <p className="mb-1 font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#858585]">Order</p>
              <p className="truncate font-geist text-[16px] font-bold leading-normal tracking-[-0.16px] text-[#2F2F2F]">
                #{order.display_id}
              </p>
              <p className="truncate font-geist text-[14px] font-medium leading-normal tracking-[-0.14px] text-[#858585]">
                {new Date(order.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex w-[100px] shrink-0 flex-col gap-1">
              <button
                onClick={() => onViewDetails?.(order)}
                className="cursor-pointer text-left font-geist text-[14px] font-normal leading-normal tracking-[-0.14px] text-[#007AFF] transition-colors hover:underline"
              >
                Check Details
              </button>
              <button
                onClick={() => printOrderReceipt(order)}
                className="cursor-pointer text-left font-geist text-[14px] font-normal leading-normal tracking-[-0.14px] text-[#007AFF] transition-colors hover:underline"
              >
                Print Receipt
              </button>
              {canCancel && onCancel && (
                <button
                  onClick={() => onCancel(order.id)}
                  className="cursor-pointer text-left font-geist text-[14px] font-normal leading-normal tracking-[-0.14px] text-[#FF3B30] transition-colors hover:underline"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
