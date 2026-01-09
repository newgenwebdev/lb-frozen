import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

/**
 * Schema for creating a new shipment
 */
export const CreateShipmentSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .describe("Shipment name"),
    base_rate: z
      .number()
      .positive()
      .describe("Base rate for the shipment"),
    eta: z
      .string()
      .min(1)
      .max(100)
      .describe("Estimated time of arrival (e.g., '2-3 days')"),
    status: z
      .enum(["Active", "Non Active"])
      .optional()
      .default("Active")
      .describe("Shipment status"),
  })
  .openapi("CreateShipmentRequest", {
    example: {
      name: "Standard Shipping",
      base_rate: 10.00,
      eta: "2-3 days",
      status: "Active",
    },
  });

/**
 * Schema for updating a shipment
 */
export const UpdateShipmentSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe("Shipment name"),
    base_rate: z
      .number()
      .positive()
      .optional()
      .describe("Base rate for the shipment"),
    eta: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe("Estimated time of arrival"),
    status: z
      .enum(["Active", "Non Active"])
      .optional()
      .describe("Shipment status"),
  })
  .openapi("UpdateShipmentRequest", {
    example: {
      name: "Express Shipping",
      base_rate: 25.00,
      eta: "1-2 days",
      status: "Active",
    },
  });

/**
 * Query schema for list endpoint
 */
export const ListShipmentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z
    .enum(["Active", "Non Active", "all"])
    .optional()
    .default("all")
    .describe("Filter by shipment status"),
});

// Infer types from schemas
export type CreateShipmentRequest = z.infer<typeof CreateShipmentSchema>;
export type UpdateShipmentRequest = z.infer<typeof UpdateShipmentSchema>;
export type ListShipmentQuery = z.infer<typeof ListShipmentQuerySchema>;

