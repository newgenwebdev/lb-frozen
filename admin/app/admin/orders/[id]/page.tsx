"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getOrderById, cancelOrder, restoreOrder } from "@/lib/api/orders";
import { useToast } from "@/contexts/ToastContext";
import { printOrderReceipt } from "@/lib/utils/print";
import Link from "next/link";
import type { Order, OrderItem } from "@/lib/validators/order";

// Helper to check if an order item is a PWP item
const isPWPItem = (item: OrderItem): boolean => {
  return item.metadata?.is_pwp_item === true;
};

// Helper to check if an order item has variant discount (Set Discount Global)
const hasVariantDiscount = (item: OrderItem): boolean => {
  return item.metadata?.is_variant_discount === true;
};

// Helper to check if an order item has wholesale tier discount
const hasWholesaleTierDiscount = (item: OrderItem): boolean => {
  return item.metadata?.is_bulk_price === true;
};

// Helper to get original price before discount
const getOriginalPrice = (item: OrderItem): number => {
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
};

// Helper to get discounted price for an order item
// This calculates the correct price after discount, regardless of what's stored in unit_price
const getDiscountedPrice = (item: OrderItem): number => {
  // For variant discount items, calculate from original - discount
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    const originalPrice = getOriginalPrice(item);
    const discountAmount = Number(item.metadata.variant_discount_amount) || 0;
    return Math.max(0, originalPrice - discountAmount);
  }

  // For wholesale tier items or regular items, unit_price is the current price
  return item.unit_price;
};

// Helper to get effective price for an order item (for PWP items)
const getEffectivePrice = (item: OrderItem): number => {
  // Use effective_price if available (calculated by server)
  if (item.effective_price !== undefined) {
    return item.effective_price;
  }
  // Fallback: calculate from metadata
  if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
    const discountAmount = Number(item.metadata.pwp_discount_amount) || 0;
    return item.unit_price - discountAmount;
  }
  return item.unit_price;
};

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function OrderDetailPage({ params }: OrderDetailPageProps): React.JSX.Element {
  const router = useRouter();
  const { showToast, showUndoToast, confirm } = useToast();
  const resolvedParams = React.use(params);

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["order", resolvedParams.id],
    queryFn: () => getOrderById(resolvedParams.id),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center px-4 md:px-8">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#030712] border-t-transparent mx-auto"></div>
          <p className="font-public text-[14px] text-[#6A7282]">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[600px] items-center justify-center px-4 md:px-8">
        <div className="text-center">
          <div className="mb-4 text-[48px]">📦</div>
          <h3 className="mb-2 font-geist text-[18px] font-medium text-[#030712]">Order not found</h3>
          <p className="mb-6 font-public text-[14px] text-[#6A7282]">
            The order you&apos;re looking for doesn&apos;t exist
          </p>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 rounded-lg bg-[#030712] px-4 py-2 font-public text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937]"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const handleStatusUpdate = (newStatus: string): void => {
    showToast(`Status updated to: ${newStatus}`, "success");
  };

  const handleCancelOrder = async (): Promise<void> => {
    const confirmed = await confirm({
      title: "Cancel Order",
      message: "Are you sure you want to cancel this order?",
      confirmText: "Reject",
      cancelText: "Cancel",
      orderDetails: {
        orderId: `ORD-${order.display_id}`,
        paymentMethod: order.payment_method || "N/A",
        paymentTime: new Date(order.created_at).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      const result = await cancelOrder(order.id);

      // Build message with points info if applicable
      let cancelMessage = "The transaction was deleted.";
      if (result.points) {
        const pointsParts: string[] = [];
        if (result.points.points_deducted > 0) {
          pointsParts.push(`${result.points.points_deducted} points deducted`);
        }
        if (result.points.points_restored > 0) {
          pointsParts.push(`${result.points.points_restored} points restored`);
        }
        if (pointsParts.length > 0) {
          cancelMessage += ` (${pointsParts.join(", ")})`;
        }
      }

      // Show undo toast with restore functionality
      showUndoToast(cancelMessage, async () => {
        try {
          await restoreOrder(order.id);
          showToast(`Order #${order.display_id} has been restored.`, "success");
        } catch (restoreError) {
          // Log detailed error only in development
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to restore order:", restoreError);
          }
          showToast("Failed to restore order. Please try again.", "error");
        }
      });

      router.push("/admin/orders");
    } catch (error) {
      // Log detailed error only in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to cancel order:", error);
      }
      showToast("Failed to cancel order. Please try again.", "error");
    }
  };

  const handlePrintReceipt = (): void => {
    printOrderReceipt(order);
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return `$ ${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "bg-[#DEF7EC] text-[#03543F]";
      case "pending":
        return "bg-[#FEF3C7] text-[#92400E]";
      case "processing":
        return "bg-[#DBEAFE] text-[#1E40AF]";
      case "cancelled":
        return "bg-[#FEE2E2] text-[#991B1B]";
      case "refunded":
        return "bg-[#F3E8FF] text-[#6B21A8]";
      default:
        return "bg-[#F3F4F6] text-[#374151]";
    }
  };

  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case "paid":
      case "captured":
        return "bg-[#DEF7EC] text-[#03543F]";
      case "authorized":
        return "bg-[#DBEAFE] text-[#1E40AF]";
      case "awaiting":
        return "bg-[#FEF3C7] text-[#92400E]";
      case "refunded":
      case "partially_refunded":
        return "bg-[#F3E8FF] text-[#6B21A8]";
      case "failed":
        return "bg-[#FEE2E2] text-[#991B1B]";
      default:
        return "bg-[#F3F4F6] text-[#374151]";
    }
  };

  return (
    <div className="px-4 pb-8 md:px-8">
      {/* Back Button */}
      <Link
        href="/admin/orders"
        className="mb-6 inline-flex items-center gap-2 font-public text-[14px] text-[#6A7282] transition-colors hover:text-[#030712]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Orders
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
            Order #{order.display_id}
          </h1>
          <p className="font-public text-[14px] text-[#6A7282]">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrintReceipt}
            className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-public text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
          >
            Print Receipt
          </button>
          {(order.status === "pending" || order.status === "processing") && (
            <button
              onClick={handleCancelOrder}
              className="rounded-lg border border-[#DC2626] bg-white px-4 py-2 font-public text-[14px] font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Status */}
          <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
            <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">Order Status</h2>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="font-public text-[14px] text-[#6A7282]">Order Status:</span>
                <span
                  className={`rounded-full px-3 py-1 font-public text-[12px] font-medium ${getStatusColor(order.status)}`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-public text-[14px] text-[#6A7282]">Payment:</span>
                <span
                  className={`rounded-full px-3 py-1 font-public text-[12px] font-medium ${getPaymentStatusColor(order.payment_status)}`}
                >
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </span>
              </div>
              {order.fulfillment_status && (
                <div className="flex items-center gap-2">
                  <span className="font-public text-[14px] text-[#6A7282]">Fulfillment:</span>
                  <span className="rounded-full bg-[#F3F4F6] px-3 py-1 font-public text-[12px] font-medium text-[#374151]">
                    {order.fulfillment_status.replace(/_/g, " ").charAt(0).toUpperCase() +
                      order.fulfillment_status.replace(/_/g, " ").slice(1)}
                  </span>
                </div>
              )}
              {order.metadata?.free_shipping_applied === true && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 font-public text-[12px] font-medium text-green-800">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Free Shipping
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
            <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">Order Items</h2>
            <div className="space-y-4">
              {order.items?.map((item) => {
                const effectivePrice = getEffectivePrice(item);
                const isPWP = isPWPItem(item);
                const hasPWPDiscount = isPWP && effectivePrice < item.unit_price;
                const hasVariantDiscountFlag = hasVariantDiscount(item);
                const hasWholesaleDiscount = hasWholesaleTierDiscount(item);
                const originalPrice = getOriginalPrice(item);
                const discountedPrice = getDiscountedPrice(item);
                const hasNonPWPDiscount = !isPWP && (hasVariantDiscountFlag || hasWholesaleDiscount);

                return (
                  <div key={item.id} className="flex gap-4 border-b border-[#E8E8E9] pb-4 last:border-0 last:pb-0">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6]">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.product_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[24px]">📦</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-geist text-[14px] font-medium text-[#030712]">{item.product_name}</h3>
                          {isPWP && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-public text-[10px] font-semibold text-amber-700">
                              PWP
                            </span>
                          )}
                          {!isPWP && hasWholesaleDiscount && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-public text-[10px] font-semibold text-green-700">
                              Bulk
                            </span>
                          )}
                          {!isPWP && !hasWholesaleDiscount && hasVariantDiscountFlag && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-public text-[10px] font-semibold text-green-700">
                              Sale
                            </span>
                          )}
                        </div>
                        {item.variant_title && (
                          <p className="font-public text-[12px] text-[#6A7282]">{item.variant_title}</p>
                        )}
                        {item.sku && <p className="font-public text-[12px] text-[#6A7282]">SKU: {item.sku}</p>}
                      </div>
                      <p className="font-public text-[12px] text-[#6A7282]">
                        Qty: {item.quantity} × {hasPWPDiscount ? (
                          <>
                            <span className="text-amber-600">{formatCurrency(effectivePrice, order.currency)}</span>
                            <span className="ml-1 line-through">{formatCurrency(item.unit_price, order.currency)}</span>
                          </>
                        ) : hasNonPWPDiscount ? (
                          <>
                            <span className="text-green-600">{formatCurrency(discountedPrice, order.currency)}</span>
                            <span className="ml-1 line-through">{formatCurrency(originalPrice, order.currency)}</span>
                          </>
                        ) : (
                          formatCurrency(item.unit_price, order.currency)
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <p className={`font-geist text-[14px] font-medium ${hasPWPDiscount ? "text-amber-600" : hasNonPWPDiscount ? "text-green-600" : "text-[#030712]"}`}>
                        {hasPWPDiscount ? formatCurrency(effectivePrice * item.quantity, order.currency) : hasNonPWPDiscount ? formatCurrency(discountedPrice * item.quantity, order.currency) : formatCurrency(item.unit_price * item.quantity, order.currency)}
                      </p>
                      {hasPWPDiscount && (
                        <p className="font-public text-[11px] text-[#6A7282] line-through">
                          {formatCurrency(item.unit_price * item.quantity, order.currency)}
                        </p>
                      )}
                      {hasNonPWPDiscount && (
                        <p className="font-public text-[11px] text-[#6A7282] line-through">
                          {formatCurrency(originalPrice * item.quantity, order.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            {(() => {
              // Calculate original subtotal using original_unit_price for variant discounts
              const originalSubtotal = order.items?.reduce((sum, item) => {
                const originalPrice = getOriginalPrice(item);
                return sum + originalPrice * item.quantity;
              }, 0) || 0;
              const pwpDiscountAmount = order.items?.reduce((sum, item) => {
                if (isPWPItem(item) && item.metadata?.pwp_discount_amount) {
                  return sum + (Number(item.metadata.pwp_discount_amount) || 0) * item.quantity;
                }
                return sum;
              }, 0) || 0;
              // Calculate variant discount from item metadata (Set Discount Global from admin)
              const variantDiscountAmount = order.items?.reduce((sum, item) => {
                if (hasVariantDiscount(item) && item.metadata?.variant_discount_amount) {
                  return sum + (Number(item.metadata.variant_discount_amount) || 0) * item.quantity;
                }
                return sum;
              }, 0) || 0;
              // Calculate wholesale tier discount from item metadata
              const wholesaleDiscountAmount = order.items?.reduce((sum, item) => {
                if (hasWholesaleTierDiscount(item)) {
                  const originalPrice = getOriginalPrice(item);
                  const currentPrice = item.unit_price;
                  return sum + (originalPrice - currentPrice) * item.quantity;
                }
                return sum;
              }, 0) || 0;
              const subtotalAfterDiscounts = originalSubtotal - pwpDiscountAmount - variantDiscountAmount - wholesaleDiscountAmount;
              // Coupon discount = total discount minus PWP discount (to avoid double-counting)
              const couponDiscountAmount = Math.max(0, order.discount_total - pwpDiscountAmount);
              // Extract points discount from order metadata
              const pointsDiscountAmount = Number(order.metadata?.points_discount_amount) || 0;
              const pointsRedeemed = Number(order.metadata?.points_to_redeem) || 0;
              // Extract membership promo discount from order metadata
              const membershipPromoDiscountAmount = Number(order.metadata?.applied_membership_promo_discount) || 0;
              const membershipPromoName = order.metadata?.applied_membership_promo_name as string | undefined;
              // Extract free shipping discount from order metadata
              const freeShippingApplied = order.metadata?.free_shipping_applied === true;
              const originalShippingCost = Number(order.metadata?.original_shipping_cost) || 0;
              const effectiveShippingCost = freeShippingApplied ? 0 : order.shipping_total;
              const calculatedTotal = Math.max(0, subtotalAfterDiscounts + effectiveShippingCost - couponDiscountAmount - pointsDiscountAmount - membershipPromoDiscountAmount);

              return (
                <div className="mt-6 space-y-2 border-t border-[#E8E8E9] pt-4">
                  <div className="flex justify-between font-public text-[14px]">
                    <span className="text-[#6A7282]">Subtotal</span>
                    <span className="text-[#030712]">{formatCurrency(originalSubtotal, order.currency)}</span>
                  </div>
                  {pwpDiscountAmount > 0 && (
                    <div className="flex justify-between font-public text-[14px]">
                      <span className="text-[#6A7282]">PWP Discount</span>
                      <span className="text-amber-600">-{formatCurrency(pwpDiscountAmount, order.currency)}</span>
                    </div>
                  )}
                  {variantDiscountAmount > 0 && (
                    <div className="flex justify-between font-public text-[14px]">
                      <span className="text-[#6A7282]">Product Discount</span>
                      <span className="text-green-600">-{formatCurrency(variantDiscountAmount, order.currency)}</span>
                    </div>
                  )}
                  {wholesaleDiscountAmount > 0 && (
                    <div className="flex justify-between font-public text-[14px]">
                      <span className="text-[#6A7282]">Bulk Discount</span>
                      <span className="text-green-600">-{formatCurrency(wholesaleDiscountAmount, order.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-public text-[14px]">
                    <span className="text-[#6A7282]">Shipping</span>
                    {freeShippingApplied ? (
                      <span className="flex items-center gap-2">
                        <span className="text-[12px] text-[#9CA3AF] line-through">{formatCurrency(originalShippingCost, order.currency)}</span>
                        <span className="font-medium text-green-600">FREE</span>
                      </span>
                    ) : (
                      <span className="text-[#030712]">{formatCurrency(order.shipping_total, order.currency)}</span>
                    )}
                  </div>
                  {order.tax_total > 0 && (
                    <div className="flex justify-between font-public text-[14px]">
                      <span className="text-[#6A7282]">Tax</span>
                      <span className="text-[#030712]">{formatCurrency(order.tax_total, order.currency)}</span>
                    </div>
                  )}
                  {couponDiscountAmount > 0 && (
                    <div className="flex justify-between font-public text-[14px]">
                      <span className="text-[#6A7282]">Coupon Discount</span>
                      <span className="text-[#DC2626]">-{formatCurrency(couponDiscountAmount, order.currency)}</span>
                    </div>
                  )}
                  {pointsDiscountAmount > 0 && (
                    <div className="flex justify-between font-public text-[14px]">
                      <span className="text-[#6A7282]">Points{pointsRedeemed > 0 ? ` (${pointsRedeemed.toLocaleString()} pts)` : ""}</span>
                      <span className="text-amber-600">-{formatCurrency(pointsDiscountAmount, order.currency)}</span>
                    </div>
                  )}
                  {membershipPromoDiscountAmount > 0 && (
                    <div className="flex justify-between font-public text-[14px]">
                      <span className="text-[#6A7282]">Member Discount{membershipPromoName ? ` (${membershipPromoName})` : ""}</span>
                      <span className="text-purple-600">-{formatCurrency(membershipPromoDiscountAmount, order.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[#E8E8E9] pt-2 font-geist text-[16px] font-medium">
                    <span className="text-[#030712]">Total</span>
                    <span className="text-[#030712]">{formatCurrency(calculatedTotal, order.currency)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          {/* Customer Information */}
          <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
            <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">Customer</h2>
            <div className="space-y-3">
              <div>
                <p className="font-geist text-[14px] font-medium text-[#030712]">{order.customer_name}</p>
              </div>
              <div>
                <p className="mb-1 font-public text-[12px] text-[#6A7282]">Email</p>
                <p className="font-public text-[14px] text-[#030712]">{order.customer_email}</p>
              </div>
              {order.customer_phone && (
                <div>
                  <p className="mb-1 font-public text-[12px] text-[#6A7282]">Phone</p>
                  <p className="font-public text-[14px] text-[#030712]">{order.customer_phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
            <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">Payment</h2>
            <div className="space-y-3">
              <div>
                <p className="mb-1 font-public text-[12px] text-[#6A7282]">Payment Method</p>
                <p className="font-public text-[14px] text-[#030712]">{order.payment_method}</p>
              </div>
              <div>
                <p className="mb-1 font-public text-[12px] text-[#6A7282]">Payment Status</p>
                <span
                  className={`inline-block rounded-full px-3 py-1 font-public text-[12px] font-medium ${getPaymentStatusColor(order.payment_status)}`}
                >
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
            <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">Shipping</h2>
            <div className="space-y-3">
              <div>
                <p className="mb-1 font-public text-[12px] text-[#6A7282]">Shipping Method</p>
                <p className="font-public text-[14px] text-[#030712]">{order.shipping_method}</p>
                {order.metadata?.free_shipping_applied === true && (
                  <p className="mt-1 font-public text-[13px] font-medium text-green-600">Free shipping applied</p>
                )}
              </div>
              {order.shipping_channel && (
                <div>
                  <p className="mb-1 font-public text-[12px] text-[#6A7282]">Shipping Channel</p>
                  <p className="font-public text-[14px] text-[#030712]">{order.shipping_channel}</p>
                </div>
              )}
              {order.tracking_number && (
                <div>
                  <p className="mb-1 font-public text-[12px] text-[#6A7282]">Tracking Number</p>
                  <p className="font-mono text-[14px] text-[#030712]">{order.tracking_number}</p>
                </div>
              )}
              {order.fulfillment_status && (
                <div>
                  <p className="mb-1 font-public text-[12px] text-[#6A7282]">Fulfillment Status</p>
                  <span className="inline-block rounded-full bg-[#F3F4F6] px-3 py-1 font-public text-[12px] font-medium text-[#374151]">
                    {order.fulfillment_status.replace(/_/g, " ").charAt(0).toUpperCase() +
                      order.fulfillment_status.replace(/_/g, " ").slice(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
            <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">Timeline</h2>
            <div className="space-y-4">
              {/* Delivered */}
              {order.delivered_at && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-[#10B981]"></div>
                    <div className="h-full w-px bg-[#E8E8E9]"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="mb-1 font-public text-[14px] font-medium text-[#030712]">Delivered</p>
                    <p className="font-public text-[12px] text-[#6A7282]">{formatDate(order.delivered_at)}</p>
                  </div>
                </div>
              )}
              {/* Shipped */}
              {order.shipped_at && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-[#3B82F6]"></div>
                    <div className="h-full w-px bg-[#E8E8E9]"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="mb-1 font-public text-[14px] font-medium text-[#030712]">Shipped</p>
                    <p className="font-public text-[12px] text-[#6A7282]">{formatDate(order.shipped_at)}</p>
                  </div>
                </div>
              )}
              {/* Payment Received */}
              {(order.payment_status === "captured" || order.payment_status === "paid" || order.paid_at) && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-[#10B981]"></div>
                    <div className="h-full w-px bg-[#E8E8E9]"></div>
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="mb-1 font-public text-[14px] font-medium text-[#030712]">Payment Received</p>
                    <p className="font-public text-[12px] text-[#6A7282]">{order.paid_at ? formatDate(order.paid_at) : formatDate(order.created_at)}</p>
                  </div>
                </div>
              )}
              {/* Order Placed */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-[#6A7282]"></div>
                </div>
                <div className="flex-1">
                  <p className="mb-1 font-public text-[14px] font-medium text-[#030712]">Order Placed</p>
                  <p className="font-public text-[12px] text-[#6A7282]">{formatDate(order.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
