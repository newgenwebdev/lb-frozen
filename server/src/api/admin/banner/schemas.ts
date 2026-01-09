import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

/**
 * Schema for creating a new banner
 */
export const CreateBannerSchema = z
  .object({
    announcement_text: z
      .string()
      .min(1)
      .max(500)
      .describe("Announcement text to display"),
    link: z
      .string()
      .url()
      .optional()
      .nullable()
      .describe("Optional link URL (e.g. https://youtube.com/)"),
    start_date: z
      .union([z.string().datetime(), z.coerce.date()])
      .describe("Start date when banner becomes active (ISO 8601 format)"),
    end_date: z
      .union([z.string().datetime(), z.coerce.date()])
      .describe("End date when banner expires (ISO 8601 format)"),
    background_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code (e.g. #007AFF)")
      .optional()
      .default("#007AFF")
      .describe("Background color in hex format"),
    text_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code (e.g. #FFFFFF)")
      .optional()
      .default("#FFFFFF")
      .describe("Text color in hex format"),
  })
  .openapi("CreateBannerRequest", {
    example: {
      announcement_text: "Type announcement here",
      link: "https://youtube.com/",
      start_date: "2025-01-15T00:00:00Z",
      end_date: "2025-02-15T00:00:00Z",
      background_color: "#007AFF",
      text_color: "#FFFFFF",
    },
  });

/**
 * Schema for updating a banner
 */
export const UpdateBannerSchema = z
  .object({
    announcement_text: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .describe("Announcement text to display"),
    link: z
      .string()
      .url()
      .optional()
      .nullable()
      .describe("Optional link URL"),
    start_date: z
      .union([z.string().datetime(), z.coerce.date()])
      .optional()
      .describe("Start date when banner becomes active"),
    end_date: z
      .union([z.string().datetime(), z.coerce.date()])
      .optional()
      .describe("End date when banner expires"),
    background_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code")
      .optional()
      .describe("Background color in hex format"),
    text_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code")
      .optional()
      .describe("Text color in hex format"),
    is_enabled: z
      .boolean()
      .optional()
      .describe("Whether the banner is enabled (can be toggled independently of dates)"),
  })
  .openapi("UpdateBannerRequest", {
    example: {
      announcement_text: "Updated announcement text",
      background_color: "#FF0000",
    },
  });

/**
 * Schema for toggling banner status
 */
export const ToggleBannerStatusSchema = z
  .object({
    is_enabled: z
      .boolean()
      .describe("Whether the banner should be enabled"),
  })
  .openapi("ToggleBannerStatusRequest", {
    example: {
      is_enabled: true,
    },
  });

export type ToggleBannerStatusRequest = z.infer<typeof ToggleBannerStatusSchema>;

/**
 * Query schema for list endpoint
 */
export const ListBannerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z
    .enum(["active", "non_active", "all"])
    .optional()
    .default("all")
    .describe("Filter by banner status"),
});

// Infer types from schemas
export type CreateBannerRequest = z.infer<typeof CreateBannerSchema>;
export type UpdateBannerRequest = z.infer<typeof UpdateBannerSchema>;
export type ListBannerQuery = z.infer<typeof ListBannerQuerySchema>;

