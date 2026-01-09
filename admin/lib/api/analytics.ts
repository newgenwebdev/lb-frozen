import { api } from "./client";
import {
  RevenueSchema,
  type Revenue,
  CustomerSchema,
  type Customer,
  RevenueTimeseriesSchema,
  type RevenueTimeseries,
  RecentOrdersSchema,
  type RecentOrders,
  TopSellingProductsSchema,
  type TopSellingProducts
} from "../validators/analytics";

/**
 * Get revenue analytics from the server
 * @param period - Time period to get revenue for: "today" | "yesterday" | "7days" | "month" | "year"
 * @returns Revenue statistics including total, orders count, and average order value
 * @throws Error if the request fails or validation fails
 */
export async function getRevenue(period: string = "today"): Promise<Revenue> {
  const response = await api.get("/admin/analytics/revenue", {
    params: { period }
  });

  // Validate response with Zod
  const validated = RevenueSchema.parse(response.data);

  return validated;
}

/**
 * Get customer analytics from the server
 * @param period - Time period to get customer stats for: "today" | "yesterday" | "7days" | "month" | "year"
 * @returns Customer statistics including new customers count
 * @throws Error if the request fails or validation fails
 */
export async function getCustomers(period: string = "today"): Promise<Customer> {
  const response = await api.get("/admin/analytics/customers", {
    params: { period }
  });

  // Validate response with Zod
  const validated = CustomerSchema.parse(response.data);

  return validated;
}

/**
 * Get revenue timeseries data from the server
 * @param period - Time period to get timeseries for: "today" | "yesterday" | "7days" | "month" | "year"
 * @returns Timeseries data for charting with current and previous period comparison
 * @throws Error if the request fails or validation fails
 */
export async function getRevenueTimeseries(period: string = "today"): Promise<RevenueTimeseries> {
  const response = await api.get("/admin/analytics/revenue/timeseries", {
    params: { period }
  });

  // Validate response with Zod
  const validated = RevenueTimeseriesSchema.parse(response.data);

  return validated;
}

/**
 * Get recent orders from the server
 * @param limit - Number of orders to fetch (default: 10)
 * @returns Recent orders with customer information
 * @throws Error if the request fails or validation fails
 */
export async function getRecentOrders(limit: number = 10): Promise<RecentOrders> {
  const response = await api.get("/admin/orders/recent", {
    params: { limit }
  });

  // Validate response with Zod
  const validated = RecentOrdersSchema.parse(response.data);

  return validated;
}

/**
 * Sort options for top selling products
 */
export type TopProductsSortBy = "revenue" | "quantity";

/**
 * Get top selling products from the server
 * @param period - Time period to get top products for: "today" | "yesterday" | "7days" | "month" | "year"
 * @param limit - Number of products to fetch (default: 5)
 * @param sortBy - Sort by "revenue" or "quantity" (default: "revenue")
 * @returns Top selling products sorted by specified criteria
 * @throws Error if the request fails or validation fails
 */
export async function getTopSellingProducts(
  period: string = "7days",
  limit: number = 5,
  sortBy: TopProductsSortBy = "revenue"
): Promise<TopSellingProducts> {
  const response = await api.get("/admin/analytics/products/top-selling", {
    params: { period, limit, sort_by: sortBy }
  });

  // Validate response with Zod
  const validated = TopSellingProductsSchema.parse(response.data);

  return validated;
}

/**
 * Export parameters for sales data CSV
 */
export type ExportSalesParams = {
  startDate: string | null;
  endDate: string | null;
  columns: string[];
};

/**
 * Export sales data to CSV
 * @param params - Export parameters including date range and columns to include
 * @returns Blob containing the CSV data
 * @throws Error if the request fails
 */
export async function exportSalesCSV(params: ExportSalesParams): Promise<Blob> {
  const queryParams = new URLSearchParams();

  if (params.startDate) {
    queryParams.append("start_date", params.startDate);
  }
  if (params.endDate) {
    queryParams.append("end_date", params.endDate);
  }
  if (params.columns.length > 0) {
    queryParams.append("columns", params.columns.join(","));
  }

  const response = await api.get(`/admin/analytics/export?${queryParams.toString()}`, {
    responseType: "blob",
  });

  return response.data;
}
