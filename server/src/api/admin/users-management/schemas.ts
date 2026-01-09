import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

/**
 * Schema for creating a new user
 */
export const CreateUserSchema = z
  .object({
    name: z.string().min(1).max(255).describe("User full name"),
    email: z.string().email().describe("User email address"),
    password: z
      .string()
      .min(8)
      .describe("User password (must be at least 8 characters)"),
    role: z.enum(["admin", "owner"]).describe("User role (admin or owner)"),
    status: z.enum(["Active", "Non Active"]).describe("User status"),
  })
  .openapi("CreateUserRequest", {
    example: {
      name: "Ken Taro",
      email: "user@example.com",
      password: "SecurePassword123",
      role: "admin",
      status: "Active",
    },
  });

/**
 * Schema for updating a user
 */
export const UpdateUserSchema = z
  .object({
    name: z.string().min(1).max(255).optional().describe("User full name"),
    email: z.string().email().optional().describe("User email address"),
    role: z
      .enum(["admin", "owner"])
      .optional()
      .describe("User role (admin or owner)"),
    status: z.enum(["Active", "Non Active"]).optional().describe("User status"),
  })
  .openapi("UpdateUserRequest", {
    example: {
      name: "Ken Taro Updated",
      role: "owner",
      status: "Active",
    },
  });

/**
 * Query schema for list endpoint
 */
export const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  role: z.enum(["admin", "owner"]).optional().describe("Filter by role"),
  status: z
    .enum(["Active", "Non Active"])
    .optional()
    .describe("Filter by status"),
  q: z.string().optional().describe("Search query for name or email"),
});

/**
 * Schema for updating current user's account details
 */
export const UpdateAccountSchema = z
  .object({
    name: z.string().min(1).max(255).optional().describe("User full name"),
    email: z.string().email().optional().describe("User email address"),
  })
  .openapi("UpdateAccountRequest", {
    example: {
      name: "Ken Taro Updated",
      email: "kentaro.updated@example.com",
    },
  });

/**
 * Schema for changing password
 */
export const ChangePasswordSchema = z
  .object({
    current_password: z
      .string()
      .min(1)
      .describe("Current password for verification"),
    new_password: z
      .string()
      .min(8)
      .describe("New password (must be at least 8 characters)"),
  })
  .openapi("ChangePasswordRequest", {
    example: {
      current_password: "oldPassword123",
      new_password: "newSecurePassword123",
    },
  });

// Infer types from schemas
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserSchema>;
export type ListUserQuery = z.infer<typeof ListQuerySchema>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;
