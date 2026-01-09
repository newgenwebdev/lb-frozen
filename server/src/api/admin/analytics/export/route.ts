import type { MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { withAdminAuth } from "../../../../utils/admin-auth";

/**
 * Available columns for export
 */
const COLUMN_CONFIG: Record<string, { header: string; getValue: (order: OrderData, item: ItemData) => string }> = {
  order_id: {
    header: "Order ID",
    getValue: (order) => order.display_id?.toString() || order.id,
  },
  product_name: {
    header: "Product Name",
    getValue: (_order, item) => item.title || "Unknown",
  },
  total_revenue: {
    header: "Total Revenue",
    getValue: (_order, item) => ((item.unit_price || 0) * (item.quantity || 0) / 100).toFixed(2),
  },
  quantity_sold: {
    header: "Quantity Sold",
    getValue: (_order, item) => (item.quantity || 0).toString(),
  },
  payment_method: {
    header: "Payment Method",
    getValue: (order) => order.payment_method || "N/A",
  },
  customer_name: {
    header: "Customer Name",
    getValue: (order) => order.customer_name || order.email || "Guest",
  },
};

/**
 * Type for order data
 */
type OrderData = {
  id: string;
  display_id?: number;
  created_at: Date | string;
  email?: string;
  customer_name?: string;
  payment_method?: string;
  items?: ItemData[];
};

/**
 * Type for item data
 */
type ItemData = {
  title?: string;
  unit_price?: number;
  quantity?: number;
};

/**
 * Escape CSV value to handle special characters
 */
function escapeCSVValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * GET /admin/analytics/export
 * Export sales data to CSV
 * Query params:
 * - start_date: ISO date string for start of range (optional)
 * - end_date: ISO date string for end of range (optional)
 * - columns: comma-separated list of columns to include (optional, defaults to all)
 */
export const GET = withAdminAuth(async (req, res: MedusaResponse) => {
  const orderModule = req.scope.resolve(Modules.ORDER);

  // Get query params
  const startDate = req.query.start_date as string | undefined;
  const endDate = req.query.end_date as string | undefined;
  const columnsParam = req.query.columns as string | undefined;

  // Parse columns to include
  const requestedColumns = columnsParam
    ? columnsParam.split(",").filter((col) => col in COLUMN_CONFIG)
    : Object.keys(COLUMN_CONFIG);

  if (requestedColumns.length === 0) {
    res.status(400).json({ message: "No valid columns specified" });
    return;
  }

  // Build date filter
  const dateFilter: Record<string, unknown> = {};
  if (startDate) {
    dateFilter.$gte = new Date(startDate).toISOString();
  }
  if (endDate) {
    // Add one day to end date to include the entire end day
    const endDateTime = new Date(endDate);
    endDateTime.setDate(endDateTime.getDate() + 1);
    dateFilter.$lt = endDateTime.toISOString();
  }

  // Query orders with items
  const orders = await orderModule.listOrders(
    dateFilter.$gte || dateFilter.$lt
      ? {
          created_at: dateFilter as unknown as { $gte?: string; $lt?: string },
        }
      : {},
    {
      relations: ["items"],
      order: { created_at: "DESC" },
    }
  );

  // Build CSV content
  const headers = requestedColumns.map((col) => COLUMN_CONFIG[col].header);
  const csvRows: string[] = [headers.map(escapeCSVValue).join(",")];

  for (const order of orders) {
    const orderData: OrderData = {
      id: order.id,
      display_id: order.display_id,
      created_at: order.created_at,
      email: order.email,
      customer_name: order.shipping_address?.first_name
        ? `${order.shipping_address.first_name} ${order.shipping_address.last_name || ""}`.trim()
        : order.email,
      payment_method: "Online Payment", // Can be expanded if payment method tracking is added
      items: order.items as ItemData[],
    };

    // If there are items, create a row per item
    if (orderData.items && orderData.items.length > 0) {
      for (const item of orderData.items) {
        const row = requestedColumns.map((col) => {
          const value = COLUMN_CONFIG[col].getValue(orderData, item);
          return escapeCSVValue(value);
        });
        csvRows.push(row.join(","));
      }
    } else {
      // No items, still create a row with order info
      const emptyItem: ItemData = {};
      const row = requestedColumns.map((col) => {
        const value = COLUMN_CONFIG[col].getValue(orderData, emptyItem);
        return escapeCSVValue(value);
      });
      csvRows.push(row.join(","));
    }
  }

  const csvContent = csvRows.join("\n");

  // Generate filename
  const today = new Date().toISOString().split("T")[0];
  const filename = `sales-report_${today}.csv`;

  // Set headers for file download
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csvContent);
});
