import { z } from "zod";

/**
 * Schema for revenue analytics response from the server
 * Matches the server-side RevenueResponseSchema
 */
export const RevenueSchema = z.object({
  revenue: z.object({
    total: z.number(),
    currency: z.string(),
    orders_count: z.number().int(),
    orders_count_previous: z.number().int(),
    orders_change_percent: z.number(),
    orders_change_direction: z.enum(["up", "down", "neutral"]),
    average_order_value: z.number(),
    aov_previous: z.number(),
    aov_change_percent: z.number(),
    aov_change_direction: z.enum(["up", "down", "neutral"]),
    items_per_order: z.number(),
    items_per_order_previous: z.number(),
    items_per_order_change_percent: z.number(),
    items_per_order_change_direction: z.enum(["up", "down", "neutral"]),
    yesterday_total: z.number(),
    change_percent: z.number(),
    change_direction: z.enum(["up", "down", "neutral"]),
  }),
});

export type Revenue = z.infer<typeof RevenueSchema>;

/**
 * Schema for customer analytics response from the server
 * Matches the server-side CustomerResponseSchema
 */
export const CustomerSchema = z.object({
  customers: z.object({
    new_customers: z.number().int(),
    new_customers_previous: z.number().int(),
    change_percent: z.number(),
    change_direction: z.enum(["up", "down", "neutral"]),
  }),
});

export type Customer = z.infer<typeof CustomerSchema>;

/**
 * Schema for a single timeseries data point
 * Matches the server-side TimeseriesDataPointSchema
 */
export const TimeseriesDataPointSchema = z.object({
  time: z.string(),
  sales: z.number(),
  avg: z.number(),
});

export type TimeseriesDataPoint = z.infer<typeof TimeseriesDataPointSchema>;

/**
 * Schema for revenue timeseries response from the server
 * Matches the server-side RevenueTimeseriesResponseSchema
 */
export const RevenueTimeseriesSchema = z.object({
  timeseries: z.object({
    data: z.array(TimeseriesDataPointSchema),
    currency: z.string(),
    period: z.enum(["today", "yesterday", "7days", "month", "year"]),
  }),
});

export type RevenueTimeseries = z.infer<typeof RevenueTimeseriesSchema>;

/**
 * Schema for a single recent order
 * Matches the server-side RecentOrderSchema
 */
export const RecentOrderSchema = z.object({
  id: z.string(),
  display_id: z.number().int(),
  customer_name: z.string(),
  customer_email: z.string(),
  total: z.number(),
  currency: z.string(),
  items_count: z.number().int(),
  created_at: z.union([z.string(), z.date()]),
  status: z.string(),
});

export type RecentOrder = z.infer<typeof RecentOrderSchema>;

/**
 * Schema for recent orders response from the server
 * Matches the server-side RecentOrdersResponseSchema
 */
export const RecentOrdersSchema = z.object({
  orders: z.array(RecentOrderSchema),
});

export type RecentOrders = z.infer<typeof RecentOrdersSchema>;

/**
 * Schema for a single top selling product
 * Matches the server-side TopSellingProductSchema
 */
export const TopSellingProductSchema = z.object({
  product_id: z.string(),
  variant_id: z.string(),
  name: z.string(),
  quantity_sold: z.number().int(),
  revenue: z.number(),
  previous_quantity: z.number().int(),
  previous_revenue: z.number(),
  change_percent: z.number(),
  change_direction: z.enum(["up", "down", "neutral"]),
  image_url: z.string().nullable(),
});

export type TopSellingProduct = z.infer<typeof TopSellingProductSchema>;

/**
 * Schema for top selling products response from the server
 * Matches the server-side TopSellingProductsResponseSchema
 */
export const TopSellingProductsSchema = z.object({
  products: z.array(TopSellingProductSchema),
});

export type TopSellingProducts = z.infer<typeof TopSellingProductsSchema>;
