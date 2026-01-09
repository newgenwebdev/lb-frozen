import { z } from "zod";

/**
 * Schema for revenue analytics response
 * Provides total revenue, order statistics, and average order value with comparisons
 */
export const RevenueResponseSchema = z
  .object({
    revenue: z
      .object({
        total: z
          .number()
          .describe("Net revenue (after discounts) in the smallest currency unit"),
        gross_total: z
          .number()
          .optional()
          .describe("Gross revenue (before discounts) in the smallest currency unit"),
        total_discount: z
          .number()
          .optional()
          .describe("Total discounts applied (PWP + coupons + points) in the smallest currency unit"),
        currency: z
          .string()
          .describe("Currency code (e.g., 'usd', 'eur')"),
        orders_count: z
          .number()
          .int()
          .describe("Total number of completed orders"),
        orders_count_previous: z
          .number()
          .int()
          .describe("Previous period's order count"),
        orders_change_percent: z
          .number()
          .describe("Percentage change in orders compared to previous period"),
        orders_change_direction: z
          .enum(["up", "down", "neutral"])
          .describe("Direction of orders change"),
        average_order_value: z
          .number()
          .describe("Average order value in the smallest currency unit"),
        aov_previous: z
          .number()
          .describe("Previous period's average order value"),
        aov_change_percent: z
          .number()
          .describe("Percentage change in AOV compared to previous period"),
        aov_change_direction: z
          .enum(["up", "down", "neutral"])
          .describe("Direction of AOV change"),
        items_per_order: z
          .number()
          .describe("Average number of items per order"),
        items_per_order_previous: z
          .number()
          .describe("Previous period's items per order"),
        items_per_order_change_percent: z
          .number()
          .describe("Percentage change in items per order compared to previous period"),
        items_per_order_change_direction: z
          .enum(["up", "down", "neutral"])
          .describe("Direction of items per order change"),
        yesterday_total: z
          .number()
          .describe("Previous period's total revenue for comparison"),
        change_percent: z
          .number()
          .describe("Percentage change in revenue compared to previous period"),
        change_direction: z
          .enum(["up", "down", "neutral"])
          .describe("Direction of revenue change"),
      })
      .describe("Revenue statistics"),
  })
  .describe("Revenue analytics response");

export type RevenueResponse = z.infer<typeof RevenueResponseSchema>;

/**
 * Schema for customer analytics response
 * Provides new customer statistics
 */
export const CustomerResponseSchema = z
  .object({
    customers: z
      .object({
        new_customers: z
          .number()
          .int()
          .describe("Number of new customers (first-time buyers) in the period"),
        new_customers_previous: z
          .number()
          .int()
          .describe("Previous period's new customer count"),
        change_percent: z
          .number()
          .describe("Percentage change compared to previous period"),
        change_direction: z
          .enum(["up", "down", "neutral"])
          .describe("Direction of change"),
      })
      .describe("Customer statistics"),
  })
  .describe("Customer analytics response");

export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;

/**
 * Schema for a single timeseries data point
 * Represents revenue data for a specific time interval
 */
export const TimeseriesDataPointSchema = z
  .object({
    time: z
      .string()
      .describe("Time label (e.g., '08:00 AM', 'Mon', 'Jan')"),
    sales: z
      .number()
      .describe("Current period sales for this time interval in smallest currency unit"),
    avg: z
      .number()
      .describe("Previous period sales for comparison in smallest currency unit"),
  })
  .describe("A single timeseries data point");

/**
 * Schema for revenue timeseries response
 * Provides time-series revenue data for charting
 */
export const RevenueTimeseriesResponseSchema = z
  .object({
    timeseries: z
      .object({
        data: z
          .array(TimeseriesDataPointSchema)
          .describe("Array of timeseries data points"),
        currency: z
          .string()
          .describe("Currency code (e.g., 'usd', 'eur')"),
        period: z
          .enum(["today", "yesterday", "7days", "month", "year"])
          .describe("The period this timeseries data represents"),
      })
      .describe("Timeseries revenue data"),
  })
  .describe("Revenue timeseries response");

export type RevenueTimeseriesResponse = z.infer<typeof RevenueTimeseriesResponseSchema>;

/**
 * Schema for a single recent order item
 * Represents a recent order with customer and total information
 */
export const RecentOrderSchema = z
  .object({
    id: z
      .string()
      .describe("Order ID"),
    display_id: z
      .number()
      .int()
      .describe("Human-readable order number"),
    customer_name: z
      .string()
      .describe("Customer's full name or email"),
    customer_email: z
      .string()
      .describe("Customer's email address"),
    total: z
      .number()
      .describe("Order total in smallest currency unit"),
    currency: z
      .string()
      .describe("Currency code (e.g., 'myr', 'usd')"),
    items_count: z
      .number()
      .int()
      .describe("Total number of items in the order"),
    created_at: z
      .union([z.string(), z.date()])
      .describe("Order creation timestamp"),
    status: z
      .string()
      .describe("Order status (e.g., 'pending', 'completed')"),
  })
  .describe("A single recent order");

/**
 * Schema for recent orders response
 * Provides list of recent orders with customer information
 */
export const RecentOrdersResponseSchema = z
  .object({
    orders: z
      .array(RecentOrderSchema)
      .describe("Array of recent orders"),
  })
  .describe("Recent orders response");

export type RecentOrdersResponse = z.infer<typeof RecentOrdersResponseSchema>;

/**
 * Schema for a single top selling product
 * Represents product sales statistics
 */
export const TopSellingProductSchema = z
  .object({
    product_id: z
      .string()
      .describe("Product ID"),
    variant_id: z
      .string()
      .describe("Product variant ID"),
    name: z
      .string()
      .describe("Product name"),
    quantity_sold: z
      .number()
      .int()
      .describe("Total quantity sold in current period"),
    revenue: z
      .number()
      .describe("Total revenue in smallest currency unit"),
    previous_quantity: z
      .number()
      .int()
      .describe("Previous period's quantity sold"),
    previous_revenue: z
      .number()
      .describe("Previous period's revenue"),
    change_percent: z
      .number()
      .describe("Percentage change in revenue compared to previous period"),
    change_direction: z
      .enum(["up", "down", "neutral"])
      .describe("Direction of revenue change"),
    image_url: z
      .string()
      .nullable()
      .describe("Product thumbnail image URL"),
  })
  .describe("A single top selling product");

/**
 * Schema for top selling products response
 * Provides list of best performing products
 */
export const TopSellingProductsResponseSchema = z
  .object({
    products: z
      .array(TopSellingProductSchema)
      .describe("Array of top selling products sorted by revenue"),
  })
  .describe("Top selling products response");

export type TopSellingProductsResponse = z.infer<typeof TopSellingProductsResponseSchema>;
