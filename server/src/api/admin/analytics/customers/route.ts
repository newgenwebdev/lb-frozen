import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import type { CustomerResponse } from "../schemas";
import { withAdminAuth } from "../../../../utils/admin-auth";

/**
 * GET /admin/analytics/customers
 * Get customer statistics - new customers (first-time buyers)
 * Query params:
 * - period: "today" | "yesterday" | "7days" | "month" | "year" (default: "today")
 */
export const GET = withAdminAuth(async (req, res: MedusaResponse<CustomerResponse>) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const customerModule = req.scope.resolve(Modules.CUSTOMER);

  // Get period from query params, default to "today"
  const period = (req.query.period as string) || "today";

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

  // Query orders in current and previous periods
  // Also need all orders before previousStart to determine if customers are truly "new"
  const [periodOrders, historicalOrders] = await Promise.all([
    orderModule.listOrders({
      created_at: {
        $gte: previousStart.toISOString(),
        $lt: currentEnd.toISOString(),
      } as any,
    }),
    orderModule.listOrders({
      created_at: {
        $lt: previousStart.toISOString(),
      } as any,
    }),
  ]);

  // Track customers who had orders before the previous period (not new customers)
  const existingCustomers = new Set<string>();
  for (const order of historicalOrders) {
    if (order.email) {
      existingCustomers.add(order.email);
    }
  }

  // Track first order date for each customer in the period
  const customerFirstOrders = new Map<string, Date>();

  for (const order of periodOrders) {
    if (order.email && !existingCustomers.has(order.email)) {
      const orderDate = new Date(order.created_at);
      const existingFirstOrder = customerFirstOrders.get(order.email);

      if (!existingFirstOrder || orderDate < existingFirstOrder) {
        customerFirstOrders.set(order.email, orderDate);
      }
    }
  }

  // Count new customers in current and previous periods
  let newCustomersCount = 0;
  let previousNewCustomersCount = 0;

  for (const [_email, firstOrderDate] of customerFirstOrders) {
    // Check if customer's first order was in current period
    if (firstOrderDate >= currentStart && firstOrderDate < currentEnd) {
      newCustomersCount += 1;
    }

    // Check if customer's first order was in previous period
    if (firstOrderDate >= previousStart && firstOrderDate < previousEnd) {
      previousNewCustomersCount += 1;
    }
  }

  // Calculate percentage change
  let changePercent = 0;
  let changeDirection: "up" | "down" | "neutral" = "neutral";

  if (previousNewCustomersCount > 0) {
    changePercent = ((newCustomersCount - previousNewCustomersCount) / previousNewCustomersCount) * 100;
    if (changePercent > 0) {
      changeDirection = "up";
    } else if (changePercent < 0) {
      changeDirection = "down";
      changePercent = Math.abs(changePercent);
    }
  } else if (newCustomersCount > 0) {
    changePercent = 100;
    changeDirection = "up";
  }

  const response: CustomerResponse = {
    customers: {
      new_customers: newCustomersCount,
      new_customers_previous: previousNewCustomersCount,
      change_percent: changePercent,
      change_direction: changeDirection,
    },
  };

  res.json(response);
});
