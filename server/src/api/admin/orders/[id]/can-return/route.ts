import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules, MedusaError } from "@medusajs/framework/utils";
import { ORDER_EXTENSION_MODULE } from "../../../../../modules/order-extension";
import { RETURN_MODULE } from "../../../../../modules/return";
import { withAdminAuth } from "../../../../../utils/admin-auth";

const RETURN_WINDOW_DAYS = 30;

/**
 * GET /admin/orders/:id/can-return
 * Check if an order is eligible for return
 */
export const GET = withAdminAuth(async (req, res) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;
  const returnService = req.scope.resolve(RETURN_MODULE) as any;

  const { id } = req.params;

  try {
    // Get the order with items and adjustments
    const orders = await orderModule.listOrders(
      { id },
      { relations: ["items", "items.adjustments"] }
    );

    if (!orders || orders.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order with id ${id} not found`
      );
    }

    const order = orders[0];

    // Check if order is cancelled
    if (order.status === "canceled") {
      res.json({
        can_return: false,
        reason: "Order is cancelled",
        order_id: id,
      });
      return;
    }

    // Get order extension
    const extension = await orderExtensionService.getByOrderId(id);

    if (!extension) {
      res.json({
        can_return: false,
        reason: "Order extension not found",
        order_id: id,
      });
      return;
    }

    // Check fulfillment status - must be delivered
    if (extension.fulfillment_status !== "delivered") {
      res.json({
        can_return: false,
        reason: `Order must be delivered to request a return. Current status: ${extension.fulfillment_status}`,
        order_id: id,
      });
      return;
    }

    // Check 30-day return window from delivered_at
    const deliveredAt = extension.delivered_at;
    if (!deliveredAt) {
      res.json({
        can_return: false,
        reason: "Delivery date not recorded",
        order_id: id,
      });
      return;
    }

    const deliveryDate = new Date(deliveredAt);
    const now = new Date();
    const daysSinceDelivery = Math.floor(
      (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      res.json({
        can_return: false,
        reason: `Return window has expired. Orders can only be returned within ${RETURN_WINDOW_DAYS} days of delivery.`,
        days_since_delivery: daysSinceDelivery,
        order_id: id,
      });
      return;
    }

    // Check for existing pending return
    const hasPendingReturn = await returnService.hasExistingPendingReturn(id);
    if (hasPendingReturn) {
      res.json({
        can_return: false,
        reason: "This order already has a pending return request",
        order_id: id,
      });
      return;
    }

    // Order can be returned
    const daysRemaining = RETURN_WINDOW_DAYS - daysSinceDelivery;

    // Get returnable items (items that haven't been returned yet)
    const existingReturns = await returnService.getReturnsByOrderId(id);
    const returnedItems = new Map<string, number>();

    // Calculate how many of each item have been returned
    for (const ret of existingReturns) {
      if (ret.status !== "rejected" && ret.status !== "cancelled") {
        const items = ret.items as Array<{ item_id: string; quantity: number }>;
        for (const item of items) {
          const current = returnedItems.get(item.item_id) || 0;
          returnedItems.set(item.item_id, current + item.quantity);
        }
      }
    }

    // Calculate discount information from order
    const orderItems = order.items || [];
    const orderMetadata = (order as any).metadata || {};

    // Calculate original order total (gross, before discounts)
    // Use original_price from metadata if available (for items with wholesale/variant discounts)
    // Otherwise use unit_price
    const originalOrderTotal = orderItems.reduce((sum: number, item: any) => {
      const originalPrice = Number(item.metadata?.original_price) || Number(item.unit_price) || 0;
      return sum + originalPrice * (Number(item.quantity) || 0);
    }, 0);

    // Also calculate the "current" total from unit_prices (after item-level discounts like wholesale)
    const currentOrderTotal = orderItems.reduce((sum: number, item: any) => {
      return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
    }, 0);

    // Calculate PWP discount (item-level)
    const pwpDiscount = orderItems.reduce((sum: number, item: any) => {
      if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
        return sum + Number(item.metadata.pwp_discount_amount) * (Number(item.quantity) || 1);
      }
      return sum;
    }, 0);

    // Calculate variant discount (Set Discount Global from admin)
    const variantDiscount = orderItems.reduce((sum: number, item: any) => {
      if (item.metadata?.variant_discount_amount) {
        return sum + Number(item.metadata.variant_discount_amount) * (Number(item.quantity) || 1);
      }
      return sum;
    }, 0);

    // Calculate wholesale tier discount (original price vs current price)
    const wholesaleDiscount = orderItems.reduce((sum: number, item: any) => {
      if (item.metadata?.is_wholesale_tier_discount && item.metadata?.original_price) {
        const originalPrice = Number(item.metadata.original_price) || 0;
        const currentPrice = Number(item.unit_price) || 0;
        if (originalPrice > currentPrice) {
          return sum + (originalPrice - currentPrice) * (Number(item.quantity) || 1);
        }
      }
      return sum;
    }, 0);

    // Calculate coupon discount from item adjustments
    const couponDiscountFromAdjustments = orderItems.reduce((sum: number, item: any) => {
      return sum + (item.adjustments || []).reduce(
        (adjSum: number, adj: any) => adjSum + (Number(adj.amount) || 0), 0
      );
    }, 0);

    // Get coupon and points info from order metadata
    const couponCode = orderMetadata.coupon_code || null;
    const couponDiscount = couponDiscountFromAdjustments > 0
      ? couponDiscountFromAdjustments
      : (Number(orderMetadata.applied_coupon_discount) || 0);
    const pointsRedeemed = Number(orderMetadata.points_to_redeem) || 0;
    const pointsDiscount = Number(orderMetadata.points_discount_amount) || 0;

    // Get tier/membership discount from order metadata
    const tierDiscount = Number(orderMetadata.tier_discount_amount) || 0;
    const tierName = orderMetadata.tier_name || null;

    // Get membership promo discount from order metadata
    const membershipPromoDiscount = Number(orderMetadata.applied_membership_promo_discount) || 0;

    // Total discounts - include ALL discount types
    const totalDiscounts = couponDiscount + pointsDiscount + pwpDiscount + tierDiscount + membershipPromoDiscount + variantDiscount + wholesaleDiscount;

    // Calculate what customer actually paid for items (excluding shipping)
    const actualPaidForItems = Math.max(0, originalOrderTotal - totalDiscounts);

    // Calculate returnable quantity for each item with discount-adjusted refund amount
    const returnableItems = order.items?.map((item: any) => {
      const returnedQty = returnedItems.get(item.id) || 0;
      const returnableQty = (item.quantity || 0) - returnedQty;

      // Calculate this item's proportion of the order
      const itemGrossValue = (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
      const itemProportion = originalOrderTotal > 0 ? itemGrossValue / originalOrderTotal : 0;

      // Calculate proportional discount for this item
      const itemProportionalDiscount = totalDiscounts * itemProportion;

      // Calculate actual paid total for this item (what customer paid after discounts)
      const actualPaidTotal = Math.round(itemGrossValue - itemProportionalDiscount);

      // Store the total refundable amount for this item line
      // This ensures no rounding errors when returning all items
      const refundTotal = actualPaidTotal;

      // Calculate per-unit refund (for partial returns)
      // Use floor for per-unit to avoid over-refunding on partial returns
      // The remainder will be handled when returning the last unit
      const actualPaidPerUnit = item.quantity > 0 ? Math.floor(actualPaidTotal / item.quantity) : 0;

      // Calculate remainder that would be lost due to rounding
      // This will be added to the last unit's refund
      const refundRemainder = actualPaidTotal - (actualPaidPerUnit * item.quantity);

      return {
        item_id: item.id,
        variant_id: item.variant_id,
        product_name: item.title,
        original_quantity: item.quantity,
        returned_quantity: returnedQty,
        returnable_quantity: returnableQty,
        unit_price: item.unit_price,
        // Add discount-adjusted refund amount per unit
        refund_per_unit: actualPaidPerUnit,
        // Total refund for all returnable units of this item (accounts for rounding)
        refund_total: refundTotal,
        // Remainder to add when returning all units (handles rounding errors)
        refund_remainder: refundRemainder,
        thumbnail: item.thumbnail || null,
      };
    }).filter((item: any) => item.returnable_quantity > 0);

    res.json({
      can_return: true,
      order_id: id,
      days_remaining: daysRemaining,
      delivered_at: deliveredAt,
      returnable_items: returnableItems,
      // Include discount information for display
      discount_info: {
        original_order_total: originalOrderTotal,
        coupon_code: couponCode,
        coupon_discount: couponDiscount,
        points_redeemed: pointsRedeemed,
        points_discount: pointsDiscount,
        pwp_discount: pwpDiscount,
        variant_discount: variantDiscount,
        wholesale_discount: wholesaleDiscount,
        tier_name: tierName,
        tier_discount: tierDiscount,
        membership_promo_discount: membershipPromoDiscount,
        total_discounts: totalDiscounts,
        actual_paid_for_items: actualPaidForItems,
      },
    });
  } catch (error: any) {
    if (error instanceof MedusaError) {
      throw error;
    }
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message);
  }
});
