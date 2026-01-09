import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import type { RevenueResponse } from "../schemas";
import { withAdminAuth } from "../../../../utils/admin-auth";

/**
 * Get original price before any variant discounts
 * For variant discount items, calculates original from unit_price + variant_discount_amount
 */
function getItemOriginalPrice(item: { unit_price?: unknown; metadata?: Record<string, unknown> | null }): number {
  const unitPrice = Number(item.unit_price) || 0;

  // Check for original_unit_price in metadata first
  if (item.metadata?.original_unit_price) {
    return Number(item.metadata.original_unit_price) || 0;
  }

  // For variant discount items, calculate original price from unit_price + discount
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    return unitPrice + (Number(item.metadata.variant_discount_amount) || 0);
  }

  return unitPrice;
}

/**
 * Calculate net revenue for an order (after all discounts, including shipping)
 * Includes: PWP discount, variant discount, wholesale/bulk discount, coupon discount, points discount, membership promo, tier discount
 * Also includes shipping cost (effective shipping after free shipping discount)
 */
function calculateOrderNetRevenue(order: any): { gross: number; net: number; discount: number; shipping: number } {
  const items = order.items || [];

  // Calculate gross revenue using original prices (before variant discounts)
  const grossRevenue = items.reduce((sum: number, item: any) => {
    const originalPrice = getItemOriginalPrice(item);
    return sum + originalPrice * (Number(item.quantity) || 0);
  }, 0);

  // Calculate shipping - prefer EasyParcel metadata over shipping_methods
  // because shipping_methods may contain a placeholder Medusa shipping option
  const freeShippingApplied = order.metadata?.free_shipping_applied === true;
  const shippingMethods = order.shipping_methods || [];
  const easyParcelShipping = order.metadata?.easyparcel_shipping;
  let rawShippingTotal: number;

  if (easyParcelShipping && typeof easyParcelShipping.price === 'number') {
    // Use EasyParcel price from metadata (the actual selected shipping rate)
    rawShippingTotal = easyParcelShipping.price;
  } else {
    // Fall back to shipping methods amount
    rawShippingTotal = shippingMethods.reduce((sum: number, method: any) => {
      return sum + (Number(method.amount) || 0);
    }, 0);
  }
  const effectiveShipping = freeShippingApplied ? 0 : rawShippingTotal;

  // Calculate PWP discount from item metadata
  const pwpDiscount = items.reduce((sum: number, item: any) => {
    if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
      return sum + (Number(item.metadata.pwp_discount_amount) || 0) * (Number(item.quantity) || 1);
    }
    return sum;
  }, 0);

  // Calculate variant discount from item metadata (Set Discount Global from admin)
  const variantDiscount = items.reduce((sum: number, item: any) => {
    if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
      return sum + (Number(item.metadata.variant_discount_amount) || 0) * (Number(item.quantity) || 1);
    }
    return sum;
  }, 0);

  // Calculate wholesale/bulk discount from item metadata
  const wholesaleDiscount = items.reduce((sum: number, item: any) => {
    if (item.metadata?.is_bulk_price) {
      const originalPrice = getItemOriginalPrice(item);
      const currentPrice = Number(item.unit_price) || 0;
      return sum + (originalPrice - currentPrice) * (Number(item.quantity) || 1);
    }
    return sum;
  }, 0);

  // Calculate adjustment discount (coupons applied as line item adjustments)
  const adjustmentDiscount = items.reduce((sum: number, item: any) => {
    const itemDiscount = (item.adjustments || []).reduce(
      (adjSum: number, adj: any) => adjSum + (Number(adj.amount) || 0),
      0
    );
    return sum + itemDiscount;
  }, 0);

  // Get coupon discount from order metadata (fallback, only if not already in adjustments)
  const couponDiscount = adjustmentDiscount === 0 ? (Number(order.metadata?.applied_coupon_discount) || 0) : 0;

  // Get points discount from order metadata
  const pointsDiscount = Number(order.metadata?.points_discount_amount) || 0;

  // Get membership promo discount from order metadata
  const membershipPromoDiscount = Number(order.metadata?.applied_membership_promo_discount) || 0;

  // Get tier discount from order metadata (automatically applied based on membership tier)
  const tierDiscount = Number(order.metadata?.tier_discount_amount) || 0;

  // Total discount = PWP + variant + wholesale + adjustments + coupon + points + membership promo + tier
  const totalDiscount = pwpDiscount + variantDiscount + wholesaleDiscount + adjustmentDiscount + couponDiscount + pointsDiscount + membershipPromoDiscount + tierDiscount;

  // Net revenue = gross + shipping - all discounts
  const netRevenue = Math.max(0, grossRevenue + effectiveShipping - totalDiscount);

  return { gross: grossRevenue, net: netRevenue, discount: totalDiscount, shipping: effectiveShipping };
}

/**
 * GET /admin/analytics/revenue
 * Get revenue statistics from all orders
 * Query params:
 * - period: "today" | "yesterday" | "7days" | "month" | "year" (default: "today")
 */
export const GET = withAdminAuth(async (req, res: MedusaResponse<RevenueResponse>) => {
  const orderModule = req.scope.resolve(Modules.ORDER);

  // Get period from query params, default to "today"
  const period = (req.query.period as string) || "today";

  const now = new Date();
  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case "yesterday":
      // Yesterday's data
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Day before yesterday for comparison
      previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      break;

    case "7days":
      // Last 7 days
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      // Previous 7 days for comparison
      previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      break;

    case "month":
      // Current month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      // Previous month for comparison
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case "year":
      // Current year
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear() + 1, 0, 1);
      // Previous year for comparison
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear(), 0, 1);
      break;

    case "today":
    default:
      // Today's data
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 1);
      // Yesterday for comparison
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentStart);
      break;
  }

  // Query orders for current and previous periods with database-level date filtering
  // Include items.adjustments for discount calculation and shipping_methods for shipping
  const [currentOrders, previousOrders] = await Promise.all([
    orderModule.listOrders(
      {
        created_at: {
          $gte: currentStart.toISOString(),
          $lt: currentEnd.toISOString(),
        } as any,
      },
      { relations: ["items", "items.adjustments", "shipping_methods"] }
    ),
    orderModule.listOrders(
      {
        created_at: {
          $gte: previousStart.toISOString(),
          $lt: previousEnd.toISOString(),
        } as any,
      },
      { relations: ["items", "items.adjustments", "shipping_methods"] }
    ),
  ]);

  // Calculate revenue statistics for current period
  // Uses NET revenue (after all discounts) for accurate profit tracking
  // IMPORTANT: Excludes cancelled orders from revenue calculations
  let totalRevenue = 0;      // Net revenue (what we actually earned)
  let totalGrossRevenue = 0; // Gross revenue (before discounts)
  let totalDiscount = 0;     // Total discounts applied
  let ordersCount = 0;
  let totalItems = 0;
  let currency = "myr"; // Default to MYR

  for (const order of currentOrders) {
    // Skip cancelled orders - they don't count towards revenue
    if (order.status === "canceled") {
      continue;
    }

    const { gross, net, discount, shipping } = calculateOrderNetRevenue(order);

    // Debug logging for each order
    console.log(`[Revenue Debug] Order #${order.display_id}:`, {
      gross: gross / 100,
      shipping: shipping / 100,
      discount: discount / 100,
      net: net / 100,
      tier_discount: Number((order as any).metadata?.tier_discount_amount || 0) / 100,
      free_shipping: (order as any).metadata?.free_shipping_applied || false,
    });

    if (gross > 0) {
      totalGrossRevenue += gross;
      totalRevenue += net;
      totalDiscount += discount;
      ordersCount += 1;
      totalItems += order.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
      if (ordersCount === 1 && order.currency_code) {
        currency = order.currency_code;
      }
    }
  }

  console.log(`[Revenue Debug] Total: gross=${totalGrossRevenue/100}, net=${totalRevenue/100}, discount=${totalDiscount/100}, orders=${ordersCount}`);

  // Calculate revenue statistics for previous period
  // IMPORTANT: Excludes cancelled orders from revenue calculations
  let previousRevenue = 0;      // Net revenue
  let previousGrossRevenue = 0; // Gross revenue
  let previousDiscount = 0;     // Total discounts
  let previousOrdersCount = 0;
  let previousTotalItems = 0;

  for (const order of previousOrders) {
    // Skip cancelled orders - they don't count towards revenue
    if (order.status === "canceled") {
      continue;
    }

    const { gross, net, discount } = calculateOrderNetRevenue(order);

    if (gross > 0) {
      previousGrossRevenue += gross;
      previousRevenue += net;
      previousDiscount += discount;
      previousOrdersCount += 1;
      previousTotalItems += order.items?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
    }
  }

  // Calculate average order values
  const averageOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;
  const previousAov = previousOrdersCount > 0 ? previousRevenue / previousOrdersCount : 0;

  // Calculate percentage change for revenue
  let changePercent = 0;
  let changeDirection: "up" | "down" | "neutral" = "neutral";

  if (previousRevenue > 0) {
    changePercent = ((totalRevenue - previousRevenue) / previousRevenue) * 100;
    if (changePercent > 0) {
      changeDirection = "up";
    } else if (changePercent < 0) {
      changeDirection = "down";
      changePercent = Math.abs(changePercent); // Make positive for display
    }
  } else if (totalRevenue > 0) {
    // If there was no revenue in previous period but there is in current period
    changePercent = 100;
    changeDirection = "up";
  }

  // Calculate percentage change for orders count
  let ordersChangePercent = 0;
  let ordersChangeDirection: "up" | "down" | "neutral" = "neutral";

  if (previousOrdersCount > 0) {
    ordersChangePercent = ((ordersCount - previousOrdersCount) / previousOrdersCount) * 100;
    if (ordersChangePercent > 0) {
      ordersChangeDirection = "up";
    } else if (ordersChangePercent < 0) {
      ordersChangeDirection = "down";
      ordersChangePercent = Math.abs(ordersChangePercent);
    }
  } else if (ordersCount > 0) {
    ordersChangePercent = 100;
    ordersChangeDirection = "up";
  }

  // Calculate percentage change for AOV
  let aovChangePercent = 0;
  let aovChangeDirection: "up" | "down" | "neutral" = "neutral";

  if (previousAov > 0) {
    aovChangePercent = ((averageOrderValue - previousAov) / previousAov) * 100;
    if (aovChangePercent > 0) {
      aovChangeDirection = "up";
    } else if (aovChangePercent < 0) {
      aovChangeDirection = "down";
      aovChangePercent = Math.abs(aovChangePercent);
    }
  } else if (averageOrderValue > 0) {
    aovChangePercent = 100;
    aovChangeDirection = "up";
  }

  // Calculate items per order
  const itemsPerOrder = ordersCount > 0 ? totalItems / ordersCount : 0;
  const previousItemsPerOrder = previousOrdersCount > 0 ? previousTotalItems / previousOrdersCount : 0;

  // Calculate percentage change for items per order
  let itemsPerOrderChangePercent = 0;
  let itemsPerOrderChangeDirection: "up" | "down" | "neutral" = "neutral";

  if (previousItemsPerOrder > 0) {
    itemsPerOrderChangePercent = ((itemsPerOrder - previousItemsPerOrder) / previousItemsPerOrder) * 100;
    if (itemsPerOrderChangePercent > 0) {
      itemsPerOrderChangeDirection = "up";
    } else if (itemsPerOrderChangePercent < 0) {
      itemsPerOrderChangeDirection = "down";
      itemsPerOrderChangePercent = Math.abs(itemsPerOrderChangePercent);
    }
  } else if (itemsPerOrder > 0) {
    itemsPerOrderChangePercent = 100;
    itemsPerOrderChangeDirection = "up";
  }

  const response: RevenueResponse = {
    revenue: {
      total: totalRevenue,                    // Net revenue (after all discounts)
      gross_total: totalGrossRevenue,         // Gross revenue (before discounts)
      total_discount: totalDiscount,          // Total discounts (PWP + coupons + points)
      currency: currency,
      orders_count: ordersCount,
      orders_count_previous: previousOrdersCount,
      orders_change_percent: ordersChangePercent,
      orders_change_direction: ordersChangeDirection,
      average_order_value: averageOrderValue,
      aov_previous: previousAov,
      aov_change_percent: aovChangePercent,
      aov_change_direction: aovChangeDirection,
      items_per_order: itemsPerOrder,
      items_per_order_previous: previousItemsPerOrder,
      items_per_order_change_percent: itemsPerOrderChangePercent,
      items_per_order_change_direction: itemsPerOrderChangeDirection,
      yesterday_total: previousRevenue,
      change_percent: changePercent,
      change_direction: changeDirection,
    },
  };

  res.json(response);
});