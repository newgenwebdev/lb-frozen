import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import type { RevenueTimeseriesResponse } from "../../schemas";
import { withAdminAuth } from "../../../../../utils/admin-auth";

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
 */
function calculateOrderNetRevenue(order: any): number {
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

  // Calculate PWP discount
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

  // Calculate adjustment discount
  const adjustmentDiscount = items.reduce((sum: number, item: any) => {
    return sum + ((item.adjustments || []).reduce(
      (adjSum: number, adj: any) => adjSum + (Number(adj.amount) || 0), 0
    ));
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
  return Math.max(0, grossRevenue + effectiveShipping - totalDiscount);
}

/**
 * GET /admin/analytics/revenue/timeseries
 * Get revenue timeseries data for charting
 * Query params:
 * - period: "today" | "yesterday" | "7days" | "month" | "year" (default: "today")
 */
export const GET = withAdminAuth(async (req, res: MedusaResponse<RevenueTimeseriesResponse>) => {
  const orderModule = req.scope.resolve(Modules.ORDER);

  // Get period from query params, default to "today"
  const period = (req.query.period as string) || "today";

  const now = new Date();
  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;
  let intervalType: "hour" | "day" | "month";
  let intervalCount: number;

  switch (period) {
    case "yesterday":
      // Yesterday's data (hourly)
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      intervalType = "hour";
      intervalCount = 24;
      break;

    case "7days":
      // Last 7 days (daily)
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      intervalType = "day";
      intervalCount = 7;
      break;

    case "month":
      // Current month (daily)
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      intervalType = "day";
      // Get number of days in current month
      intervalCount = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      break;

    case "year":
      // Current year (monthly)
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear() + 1, 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear(), 0, 1);
      intervalType = "month";
      intervalCount = 12;
      break;

    case "today":
    default:
      // Today's data (hourly)
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 1);
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentStart);
      intervalType = "hour";
      intervalCount = 24;
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

  // Initialize data structure for timeseries
  const currentData = new Map<string, number>();
  const previousData = new Map<string, number>();
  let currency = "myr"; // Default to MYR

  // Helper function to get interval key based on date and interval type
  const getIntervalKey = (date: Date, type: typeof intervalType): string => {
    switch (type) {
      case "hour":
        return `${date.getHours()}`;
      case "day":
        return date.toISOString().split("T")[0]; // YYYY-MM-DD
      case "month":
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      default:
        return date.toISOString();
    }
  };

  // Helper function to format interval label for display
  const formatIntervalLabel = (key: string, type: typeof intervalType, date?: Date): string => {
    switch (type) {
      case "hour":
        const hour = parseInt(key);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${String(displayHour).padStart(2, "0")}:00 ${ampm}`;
      case "day":
        if (date) {
          const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          return days[date.getDay()];
        }
        return key;
      case "month":
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIndex = parseInt(key.split("-")[1]) - 1;
        return months[monthIndex];
      default:
        return key;
    }
  };

  // Process current period orders (using net revenue after discounts)
  // IMPORTANT: Excludes cancelled orders from timeseries data
  for (const order of currentOrders) {
    // Skip cancelled orders - they don't count towards revenue
    if (order.status === "canceled") {
      continue;
    }

    const orderTotal = calculateOrderNetRevenue(order);

    if (orderTotal > 0) {
      const orderDate = new Date(order.created_at);
      const intervalKey = getIntervalKey(orderDate, intervalType);
      currentData.set(intervalKey, (currentData.get(intervalKey) || 0) + orderTotal);

      if (currentData.size === 1 && order.currency_code) {
        currency = order.currency_code;
      }
    }
  }

  // Process previous period orders (using net revenue after discounts)
  // IMPORTANT: Excludes cancelled orders from timeseries data
  for (const order of previousOrders) {
    // Skip cancelled orders - they don't count towards revenue
    if (order.status === "canceled") {
      continue;
    }

    const orderTotal = calculateOrderNetRevenue(order);

    if (orderTotal > 0) {
      const orderDate = new Date(order.created_at);
      const intervalKey = getIntervalKey(orderDate, intervalType);
      previousData.set(intervalKey, (previousData.get(intervalKey) || 0) + orderTotal);
    }
  }

  // Build timeseries array with all intervals (even empty ones)
  const timeseriesData = [];

  if (intervalType === "hour") {
    // For hourly data, create 24 intervals
    for (let i = 0; i < 24; i++) {
      const key = String(i);
      timeseriesData.push({
        time: formatIntervalLabel(key, intervalType),
        sales: currentData.get(key) || 0,
        avg: previousData.get(key) || 0,
      });
    }
  } else if (intervalType === "day") {
    // For daily data, iterate through dates
    if (period === "7days") {
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentStart);
        date.setDate(date.getDate() + i);
        const key = date.toISOString().split("T")[0];
        timeseriesData.push({
          time: formatIntervalLabel(key, intervalType, date),
          sales: currentData.get(key) || 0,
          avg: previousData.get(key) || 0,
        });
      }
    } else {
      // Month view - show all days in the month
      for (let i = 1; i <= intervalCount; i++) {
        const date = new Date(currentStart.getFullYear(), currentStart.getMonth(), i);
        const key = date.toISOString().split("T")[0];
        timeseriesData.push({
          time: String(i),
          sales: currentData.get(key) || 0,
          avg: previousData.get(key) || 0,
        });
      }
    }
  } else if (intervalType === "month") {
    // For monthly data, create 12 intervals
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 12; i++) {
      const key = `${currentStart.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
      timeseriesData.push({
        time: months[i],
        sales: currentData.get(key) || 0,
        avg: previousData.get(key) || 0,
      });
    }
  }

  const response: RevenueTimeseriesResponse = {
    timeseries: {
      data: timeseriesData,
      currency: currency,
      period: period as "today" | "yesterday" | "7days" | "month" | "year",
    },
  };

  res.json(response);
});
