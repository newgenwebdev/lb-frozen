import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { withAdminAuth } from "../../../../../utils/admin-auth";

/**
 * Calculate effective price for an item (after item-level discounts: PWP and variant discount)
 * Note: Order-level discounts (coupon, points, membership promo, tier) are NOT applied here
 * because they are spread across all items in the order, not specific to a product
 */
function getEffectiveItemPrice(item: any): number {
  const unitPrice = Number(item.unit_price) || 0;

  // Check for PWP discount
  if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
    const pwpDiscount = Number(item.metadata.pwp_discount_amount) || 0;
    return unitPrice - pwpDiscount;
  }

  // Variant discount is already reflected in unit_price (it's the discounted price)
  // No need to subtract again

  return unitPrice;
}

/**
 * GET /admin/analytics/products/top-selling
 * Get top selling products with sales statistics
 * Query params:
 * - period: "today" | "yesterday" | "7days" | "month" | "year" (default: "7days")
 * - limit: number of products to return (default: 5)
 * - sort_by: "revenue" | "quantity" (default: "revenue")
 */
export const GET = withAdminAuth(async (req, res) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const productModule = req.scope.resolve(Modules.PRODUCT);

  // Get period, limit, and sort_by from query params
  const period = (req.query.period as string) || "7days";
  const limit = parseInt(req.query.limit as string) || 5;
  const sortBy = (req.query.sort_by as string) || "revenue";

  const now = new Date();
  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case "yesterday":
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      break;

    case "7days":
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      break;

    case "month":
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case "year":
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear() + 1, 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear(), 0, 1);
      break;

    case "today":
    default:
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 1);
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentStart);
      break;
  }

  // Query orders for current and previous periods with database-level date filtering
  const [currentOrders, previousOrders] = await Promise.all([
    orderModule.listOrders(
      {
        created_at: {
          $gte: currentStart.toISOString(),
          $lt: currentEnd.toISOString(),
        } as any,
      },
      { relations: ["items"] }
    ),
    orderModule.listOrders(
      {
        created_at: {
          $gte: previousStart.toISOString(),
          $lt: previousEnd.toISOString(),
        } as any,
      },
      { relations: ["items"] }
    ),
  ]);

  // Aggregate product sales data
  const productSales = new Map<string, {
    quantity: number;
    revenue: number;
    previousQuantity: number;
    previousRevenue: number;
  }>();

  // Process current period orders
  // Uses effective price (after PWP discount) for accurate revenue
  // IMPORTANT: Excludes cancelled orders from product sales
  for (const order of currentOrders) {
    // Skip cancelled orders - they don't count towards product sales
    if (order.status === "canceled") {
      continue;
    }

    if (order.items) {
      for (const item of order.items) {
        if (!item.variant_id) continue;

        const quantity = Number(item.quantity) || 0;
        const effectivePrice = getEffectiveItemPrice(item);
        const itemTotal = effectivePrice * quantity;

        if (!productSales.has(item.variant_id)) {
          productSales.set(item.variant_id, {
            quantity: 0,
            revenue: 0,
            previousQuantity: 0,
            previousRevenue: 0
          });
        }

        const sales = productSales.get(item.variant_id)!;
        sales.quantity += quantity;
        sales.revenue += itemTotal;
      }
    }
  }

  // Process previous period orders
  // IMPORTANT: Excludes cancelled orders from product sales
  for (const order of previousOrders) {
    // Skip cancelled orders - they don't count towards product sales
    if (order.status === "canceled") {
      continue;
    }

    if (order.items) {
      for (const item of order.items) {
        if (!item.variant_id) continue;

        const quantity = Number(item.quantity) || 0;
        const effectivePrice = getEffectiveItemPrice(item);
        const itemTotal = effectivePrice * quantity;

        if (!productSales.has(item.variant_id)) {
          productSales.set(item.variant_id, {
            quantity: 0,
            revenue: 0,
            previousQuantity: 0,
            previousRevenue: 0
          });
        }

        const sales = productSales.get(item.variant_id)!;
        sales.previousQuantity += quantity;
        sales.previousRevenue += itemTotal;
      }
    }
  }

  // Convert to array and sort by revenue or quantity
  const sortedProducts = Array.from(productSales.entries())
    .map(([variantId, sales]) => ({
      variant_id: variantId,
      ...sales
    }))
    .sort((a, b) => sortBy === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue)
    .slice(0, limit);

  // Get variant IDs to fetch product details
  const variantIds = sortedProducts.map(p => p.variant_id);

  // Fetch product variants with product details
  const variants = await productModule.listProductVariants(
    { id: variantIds },
    { relations: ["product"] }
  );

  // Create variant map for quick lookup
  const variantMap = new Map(variants.map(v => [v.id, v]));

  // Format the response
  const topSellingProducts = sortedProducts.map(productSale => {
    const variant = variantMap.get(productSale.variant_id);
    const product = variant?.product;

    // Calculate change percentage
    let changePercent = 0;
    let changeDirection: "up" | "down" | "neutral" = "neutral";

    if (productSale.previousRevenue > 0) {
      changePercent = ((productSale.revenue - productSale.previousRevenue) / productSale.previousRevenue) * 100;
      if (changePercent > 0) {
        changeDirection = "up";
      } else if (changePercent < 0) {
        changeDirection = "down";
        changePercent = Math.abs(changePercent);
      }
    } else if (productSale.revenue > 0) {
      changePercent = 100;
      changeDirection = "up";
    }

    return {
      product_id: product?.id || "",
      variant_id: productSale.variant_id,
      name: product?.title || "Unknown Product",
      quantity_sold: productSale.quantity,
      revenue: productSale.revenue,
      previous_quantity: productSale.previousQuantity,
      previous_revenue: productSale.previousRevenue,
      change_percent: changePercent,
      change_direction: changeDirection,
      image_url: product?.thumbnail || null
    };
  });

  res.json({
    products: topSellingProducts
  });
});
