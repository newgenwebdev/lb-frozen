import { z } from "zod";

/**
 * Price schema for shipping option pricing
 * SGD only for Singapore-focused store
 */
export const ShippingOptionPriceSchema = z.object({
  id: z.string().optional(),
  currency_code: z.enum(["sgd"]),
  amount: z.number().nonnegative(),
});

/**
 * Schema for creating a new shipping option
 */
export const CreateShippingOptionSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  description: z.string().max(255).optional().default(""),
  prices: z.array(ShippingOptionPriceSchema).min(1, "At least one price is required"),
  enabled: z.boolean().default(true),
  service_zone_id: z.string().optional(),
  shipping_profile_id: z.string().optional(),
});

export type CreateShippingOptionInput = z.infer<typeof CreateShippingOptionSchema>;

/**
 * Schema for updating an existing shipping option
 */
export const UpdateShippingOptionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(255).optional(),
  prices: z.array(ShippingOptionPriceSchema).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateShippingOptionInput = z.infer<typeof UpdateShippingOptionSchema>;

/**
 * Schema for list query parameters
 */
export const ListShippingOptionQuerySchema = z.object({
  limit: z.coerce.number().positive().default(50),
  offset: z.coerce.number().nonnegative().default(0),
});

export type ListShippingOptionQuery = z.infer<typeof ListShippingOptionQuerySchema>;
