import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { BACKEND_URL } from "../lib/constants";

// Import all schemas
import {
  UpdateConfigSchema,
  AdjustPointsSchema,
} from "../api/admin/points/schemas";
import {
  CreateMemberPromotionSchema,
  UpdateMemberPromotionSchema,
} from "../api/admin/member-promotions/schemas";
import {
  CreateUserSchema,
  UpdateUserSchema,
  ListQuerySchema,
  UpdateAccountSchema,
  ChangePasswordSchema,
} from "../api/admin/users-management/schemas";
import {
  CreateBannerSchema,
  UpdateBannerSchema,
  ListBannerQuerySchema,
} from "../api/admin/banner/schemas";
import {
  CreateShipmentSchema,
  UpdateShipmentSchema,
  ListShipmentQuerySchema,
} from "../api/admin/shipment/schemas";
import { PurchaseMembershipSchema } from "../api/store/membership/schemas";
import { CalculatePointsSchema } from "../api/store/points/schemas";
import { ApplyPointsSchema } from "../api/store/cart/schemas";

/**
 * Generate OpenAPI 3.0 specification from Zod schemas merged with Medusa's built-in endpoints
 */
export function generateOpenAPIDocument(): any {
  const registry = new OpenAPIRegistry();

  // ===== ADMIN - POINTS ENDPOINTS =====

  // GET /admin/points/config
  registry.registerPath({
    method: "get",
    path: "/admin/points/config",
    summary: "Get points system configuration",
    tags: ["Admin - Points"],
    responses: {
      200: {
        description: "Points configuration retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                config: {
                  type: "object",
                  properties: {
                    earning_type: {
                      type: "string",
                      enum: ["percentage", "per_product"],
                    },
                    earning_rate: { type: "number" },
                    redemption_rate: { type: "number" },
                    is_enabled: { type: "boolean" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // POST /admin/points/config
  registry.registerPath({
    method: "post",
    path: "/admin/points/config",
    summary: "Update points system configuration",
    tags: ["Admin - Points"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: UpdateConfigSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Configuration updated successfully",
      },
    },
  });

  // POST /admin/points/adjust
  registry.registerPath({
    method: "post",
    path: "/admin/points/adjust",
    summary: "Manually adjust customer points",
    tags: ["Admin - Points"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: AdjustPointsSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Points adjusted successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                adjustment: {
                  type: "object",
                  properties: {
                    customer_id: { type: "string" },
                    amount: { type: "number" },
                    new_balance: { type: "number" },
                    reason: { type: "string" },
                    adjusted_by: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // GET /admin/points/history/:customer_id
  registry.registerPath({
    method: "get",
    path: "/admin/points/history/{customer_id}",
    summary: "Get points transaction history for a customer",
    tags: ["Admin - Points"],
    responses: {
      200: {
        description: "Points history retrieved successfully",
      },
    },
  });

  // GET /admin/points/stats
  registry.registerPath({
    method: "get",
    path: "/admin/points/stats",
    summary: "Get points system statistics",
    tags: ["Admin - Points"],
    responses: {
      200: {
        description: "Points statistics retrieved successfully",
      },
    },
  });

  // ===== ADMIN - USERS MANAGEMENT ENDPOINTS =====

  // GET /admin/users-management
  registry.registerPath({
    method: "get",
    path: "/admin/users-management",
    summary: "List all users with pagination and filtering",
    tags: ["Admin - Users Management"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      query: ListQuerySchema,
    },
    responses: {
      200: {
        description: "Users retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                users: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      email: { type: "string" },
                      role: { type: "string", enum: ["admin", "owner"] },
                      status: {
                        type: "string",
                        enum: ["Active", "Non Active"],
                      },
                      created_at: { type: "string", format: "date-time" },
                      updated_at: { type: "string", format: "date-time" },
                    },
                  },
                },
                count: { type: "number" },
                limit: { type: "number" },
                offset: { type: "number" },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
    },
  });

  // POST /admin/users-management
  registry.registerPath({
    method: "post",
    path: "/admin/users-management",
    summary: "Create a new user",
    tags: ["Admin - Users Management"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateUserSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "User created successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string", enum: ["admin", "owner"] },
                    status: { type: "string", enum: ["Active", "Non Active"] },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid request data",
      },
      401: {
        description: "Unauthorized",
      },
      409: {
        description: "User with email already exists",
      },
    },
  });

  // GET /admin/users-management/:id
  registry.registerPath({
    method: "get",
    path: "/admin/users-management/{id}",
    summary: "Get a single user by ID",
    tags: ["Admin - Users Management"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      params: z.object({
        id: z.string().describe("User ID"),
      }),
    },
    responses: {
      200: {
        description: "User retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string", enum: ["admin", "owner"] },
                    status: { type: "string", enum: ["Active", "Non Active"] },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "User not found",
      },
    },
  });

  // PUT /admin/users-management/:id
  registry.registerPath({
    method: "put",
    path: "/admin/users-management/{id}",
    summary: "Update a user",
    tags: ["Admin - Users Management"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      params: z.object({
        id: z.string().describe("User ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateUserSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "User updated successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string", enum: ["admin", "owner"] },
                    status: { type: "string", enum: ["Active", "Non Active"] },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid request data",
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "User not found",
      },
      409: {
        description: "User with email already exists",
      },
    },
  });

  // DELETE /admin/users-management/:id
  registry.registerPath({
    method: "delete",
    path: "/admin/users-management/{id}",
    summary: "Delete a user",
    tags: ["Admin - Users Management"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      params: z.object({
        id: z.string().describe("User ID"),
      }),
    },
    responses: {
      200: {
        description: "User deleted successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                id: { type: "string" },
                deleted: { type: "boolean" },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      403: {
        description: "Cannot delete your own account",
      },
      404: {
        description: "User not found",
      },
    },
  });

  // ===== ADMIN - USER SETTINGS ENDPOINTS =====

  // GET /admin/users-management/me
  registry.registerPath({
    method: "get",
    path: "/admin/users-management/me",
    summary: "Get current user's account details",
    tags: ["Admin - Users Management"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    responses: {
      200: {
        description: "Account details retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string", enum: ["admin", "owner"] },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "User not found",
      },
    },
  });

  // PUT /admin/users-management/me
  registry.registerPath({
    method: "put",
    path: "/admin/users-management/me",
    summary: "Update current user's account details",
    tags: ["Admin - Users Management"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: UpdateAccountSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Account details updated successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string", enum: ["admin", "owner"] },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid request data",
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "User not found",
      },
      409: {
        description: "User with email already exists",
      },
    },
  });

  // PUT /admin/users-management/me/password
  registry.registerPath({
    method: "put",
    path: "/admin/users-management/me/password",
    summary: "Change current user's password",
    tags: ["Admin - Users Management"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: ChangePasswordSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Password changed successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid request data or incorrect current password",
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "User not found",
      },
    },
  });

  // ===== PUBLIC - BANNER ENDPOINTS =====

  // GET /banner (Public endpoint - no authentication required)
  registry.registerPath({
    method: "get",
    path: "/banner",
    summary: "List all banners with pagination and filtering (Public)",
    tags: ["Store - Banner"],
    request: {
      query: ListBannerQuerySchema,
    },
    responses: {
      200: {
        description: "Banners retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                banners: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      announcement_text: { type: "string" },
                      link: { type: "string", nullable: true },
                      start_date: { type: "string", format: "date-time" },
                      end_date: { type: "string", format: "date-time" },
                      background_color: { type: "string" },
                      text_color: { type: "string" },
                      is_active: { type: "boolean" },
                      created_at: { type: "string", format: "date-time" },
                      updated_at: { type: "string", format: "date-time" },
                    },
                  },
                },
                count: { type: "number" },
                limit: { type: "number" },
                offset: { type: "number" },
              },
            },
          },
        },
      },
    },
  });

  // ===== ADMIN - BANNER ENDPOINTS =====

  // POST /admin/banner
  registry.registerPath({
    method: "post",
    path: "/admin/banner",
    summary: "Create a new banner",
    tags: ["Admin - Banner"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateBannerSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Banner created successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                banner: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    announcement_text: { type: "string" },
                    link: { type: "string", nullable: true },
                    start_date: { type: "string", format: "date-time" },
                    end_date: { type: "string", format: "date-time" },
                    background_color: { type: "string" },
                    text_color: { type: "string" },
                    is_active: { type: "boolean" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid request data",
      },
      401: {
        description: "Unauthorized",
      },
    },
  });

  // GET /admin/banner/:id
  registry.registerPath({
    method: "get",
    path: "/admin/banner/{id}",
    summary: "Get a single banner by ID",
    tags: ["Admin - Banner"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      params: z.object({
        id: z.string().describe("Banner ID"),
      }),
    },
    responses: {
      200: {
        description: "Banner retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                banner: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    announcement_text: { type: "string" },
                    link: { type: "string", nullable: true },
                    start_date: { type: "string", format: "date-time" },
                    end_date: { type: "string", format: "date-time" },
                    background_color: { type: "string" },
                    text_color: { type: "string" },
                    is_active: { type: "boolean" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "Banner not found",
      },
    },
  });

  // PUT /admin/banner/:id
  registry.registerPath({
    method: "put",
    path: "/admin/banner/{id}",
    summary: "Update a banner",
    tags: ["Admin - Banner"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      params: z.object({
        id: z.string().describe("Banner ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateBannerSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Banner updated successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                banner: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    announcement_text: { type: "string" },
                    link: { type: "string", nullable: true },
                    start_date: { type: "string", format: "date-time" },
                    end_date: { type: "string", format: "date-time" },
                    background_color: { type: "string" },
                    text_color: { type: "string" },
                    is_active: { type: "boolean" },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid request data",
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "Banner not found",
      },
    },
  });

  // DELETE /admin/banner/:id
  registry.registerPath({
    method: "delete",
    path: "/admin/banner/{id}",
    summary: "Delete a banner",
    tags: ["Admin - Banner"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      params: z.object({
        id: z.string().describe("Banner ID"),
      }),
    },
    responses: {
      200: {
        description: "Banner deleted successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                id: { type: "string" },
                deleted: { type: "boolean" },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "Banner not found",
      },
    },
  });

  // ===== ADMIN - SHIPMENT ENDPOINTS =====

  // GET /admin/shipment
  registry.registerPath({
    method: "get",
    path: "/admin/shipment",
    summary: "List all shipments with pagination and filtering",
    tags: ["Admin - Shipment"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      query: ListShipmentQuerySchema,
    },
    responses: {
      200: {
        description: "Shipments retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                shipments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      base_rate: { type: "number" },
                      eta: { type: "string" },
                      status: { type: "string", enum: ["Active", "Non Active"] },
                      created_at: { type: "string", format: "date-time" },
                      updated_at: { type: "string", format: "date-time" },
                    },
                  },
                },
                count: { type: "number" },
                limit: { type: "number" },
                offset: { type: "number" },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
    },
  });

  // POST /admin/shipment
  registry.registerPath({
    method: "post",
    path: "/admin/shipment",
    summary: "Create a new shipment",
    tags: ["Admin - Shipment"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateShipmentSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Shipment created successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                shipment: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    base_rate: { type: "number" },
                    eta: { type: "string" },
                    status: { type: "string", enum: ["Active", "Non Active"] },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid request data",
      },
      401: {
        description: "Unauthorized",
      },
    },
  });

  // GET /admin/shipment/:id
  registry.registerPath({
    method: "get",
    path: "/admin/shipment/{id}",
    summary: "Get a single shipment by ID",
    tags: ["Admin - Shipment"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      params: z.object({
        id: z.string().describe("Shipment ID"),
      }),
    },
    responses: {
      200: {
        description: "Shipment retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                shipment: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    base_rate: { type: "number" },
                    eta: { type: "string" },
                    status: { type: "string", enum: ["Active", "Non Active"] },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "Shipment not found",
      },
    },
  });

  // PUT /admin/shipment/:id
  registry.registerPath({
    method: "put",
    path: "/admin/shipment/{id}",
    summary: "Update a shipment",
    tags: ["Admin - Shipment"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      params: z.object({
        id: z.string().describe("Shipment ID"),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateShipmentSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Shipment updated successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                shipment: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    base_rate: { type: "number" },
                    eta: { type: "string" },
                    status: { type: "string", enum: ["Active", "Non Active"] },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid request data",
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "Shipment not found",
      },
    },
  });

  // DELETE /admin/shipment/:id
  registry.registerPath({
    method: "delete",
    path: "/admin/shipment/{id}",
    summary: "Delete a shipment",
    tags: ["Admin - Shipment"],
    security: [{ api_token: [] }, { cookie_auth: [] }],
    request: {
      params: z.object({
        id: z.string().describe("Shipment ID"),
      }),
    },
    responses: {
      200: {
        description: "Shipment deleted successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                id: { type: "string" },
                deleted: { type: "boolean" },
              },
            },
          },
        },
      },
      401: {
        description: "Unauthorized",
      },
      404: {
        description: "Shipment not found",
      },
    },
  });

  // Register Admin - Member Promotions endpoints
  registry.registerPath({
    method: "post",
    path: "/admin/member-promotions",
    summary: "Create member-exclusive promotion",
    tags: ["Admin - Promotions"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateMemberPromotionSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Promotion created successfully",
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/admin/member-promotions",
    summary: "List all member-exclusive promotions",
    tags: ["Admin - Promotions"],
    responses: {
      200: {
        description: "Promotions retrieved successfully",
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/admin/member-promotions/{id}",
    summary: "Update member-exclusive promotion",
    tags: ["Admin - Promotions"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: UpdateMemberPromotionSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Promotion updated successfully",
      },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/admin/member-promotions/{id}",
    summary: "Delete member-exclusive promotion",
    tags: ["Admin - Promotions"],
    responses: {
      200: {
        description: "Promotion deleted successfully",
      },
    },
  });

  // ===== STORE - MEMBERSHIP ENDPOINTS =====

  // GET /store/membership
  registry.registerPath({
    method: "get",
    path: "/store/membership",
    summary: "Get membership information and pricing",
    tags: ["Store - Membership"],
    responses: {
      200: {
        description: "Membership info retrieved successfully",
      },
    },
  });

  // POST /store/membership/purchase
  registry.registerPath({
    method: "post",
    path: "/store/membership/purchase",
    summary: "Purchase membership",
    tags: ["Store - Membership"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: PurchaseMembershipSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Membership purchased successfully",
      },
    },
  });

  // GET /store/membership/status
  registry.registerPath({
    method: "get",
    path: "/store/membership/status",
    summary: "Get current membership status",
    tags: ["Store - Membership"],
    responses: {
      200: {
        description: "Membership status retrieved successfully",
      },
    },
  });

  // ===== STORE - POINTS ENDPOINTS =====

  // GET /store/points
  registry.registerPath({
    method: "get",
    path: "/store/points",
    summary: "Get customer points balance",
    tags: ["Store - Points"],
    responses: {
      200: {
        description: "Points balance retrieved successfully",
      },
    },
  });

  // POST /store/points/calculate
  registry.registerPath({
    method: "post",
    path: "/store/points/calculate",
    summary: "Calculate points for redemption or earning",
    tags: ["Store - Points"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CalculatePointsSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Points calculated successfully",
      },
    },
  });

  // GET /store/points/history
  registry.registerPath({
    method: "get",
    path: "/store/points/history",
    summary: "Get points transaction history",
    tags: ["Store - Points"],
    responses: {
      200: {
        description: "Transaction history retrieved successfully",
      },
    },
  });

  // ===== STORE - CART ENDPOINTS =====

  // POST /store/cart/apply-points (Note: Medusa uses [id] pattern, not {id})
  registry.registerPath({
    method: "post",
    path: "/store/cart/apply-points",
    summary: "Apply points as discount to cart",
    tags: ["Store - Cart"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: ApplyPointsSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Points applied successfully",
      },
    },
  });

  // Generate custom endpoints OpenAPI document
  const generator = new OpenApiGeneratorV3(registry.definitions);

  const customDoc = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Medusa API Documentation",
      version: "1.0.0",
      description:
        "Complete API documentation including Medusa built-in endpoints and custom membership & points system",
    },
    servers: [
      {
        url: BACKEND_URL,
        description: BACKEND_URL.includes("localhost")
          ? "Development server"
          : "Production server",
      },
    ],
    tags: [
      {
        name: "Admin - Points",
        description: "Admin endpoints for managing points system",
      },
      {
        name: "Admin - Promotions",
        description: "Admin endpoints for member-exclusive promotions",
      },
      {
        name: "Store - Membership",
        description: "Customer endpoints for membership management",
      },
      {
        name: "Store - Points",
        description: "Customer endpoints for points management",
      },
      {
        name: "Store - Cart",
        description: "Customer endpoints for cart with points",
      },
      {
        name: "Store - Banner",
        description: "Public endpoints for viewing announcement banners",
      },
      {
        name: "Admin - Banner",
        description: "Admin endpoints for managing announcement banners",
      },
    ],
  });

  // Merge with Medusa built-in endpoints (filtered by enabled modules)
  /*
  // NOTE: To show only custom endpoints, uncomment the line below and comment out the try-catch block
  // return customDoc
  */
  try {
    const medusaAdminPath = path.join(
      process.cwd(),
      "openapi-specs",
      "medusa-admin-openapi.yaml"
    );
    const medusaStorePath = path.join(
      process.cwd(),
      "openapi-specs",
      "medusa-store-openapi.yaml"
    );

    let medusaAdminSpec: any = {};
    let medusaStoreSpec: any = {};

    if (fs.existsSync(medusaAdminPath)) {
      const adminYaml = fs.readFileSync(medusaAdminPath, "utf8");
      medusaAdminSpec = yaml.load(adminYaml) as any;
    }

    if (fs.existsSync(medusaStorePath)) {
      const storeYaml = fs.readFileSync(medusaStorePath, "utf8");
      medusaStoreSpec = yaml.load(storeYaml) as any;
    }

    // Filter out endpoints for modules that are not configured
    // Core endpoints that always work
    const enabledPaths = [
      "/admin/products",
      "/store/products",
      "/admin/customers",
      "/store/customers",
      "/admin/orders",
      "/store/orders",
      "/store/carts",
      "/admin/regions",
      "/admin/currencies",
      "/admin/sales-channels",
      "/admin/inventory-items",
      "/admin/stock-locations",
      "/admin/price-lists",
      "/admin/users",
      "/admin/api-keys",
      "/admin/invites",
      "/auth",
      "/store/auth",
      "/admin/uploads", // File module (MinIO or local)
    ];

    // Helper function to check if path should be included
    const shouldIncludePath = (pathKey: string): boolean => {
      // Always include custom endpoints
      if (customDoc.paths?.[pathKey]) {
        return true;
      }

      // Check if it's a core enabled path
      return enabledPaths.some((enabledPath) =>
        pathKey.startsWith(enabledPath)
      );
    };

    // Merge paths at method level, filtering out disabled modules
    const allPathKeys = new Set([
      ...Object.keys(medusaAdminSpec.paths || {}),
      ...Object.keys(medusaStoreSpec.paths || {}),
      ...Object.keys(customDoc.paths || {}),
    ]);

    const mergedPaths: any = {};
    for (const path of allPathKeys) {
      // Only include paths for enabled modules
      if (shouldIncludePath(path)) {
        mergedPaths[path] = {
          ...medusaAdminSpec.paths?.[path], // Admin spec methods
          ...medusaStoreSpec.paths?.[path], // Store spec methods (overwrites Admin)
          ...customDoc.paths?.[path], // Custom methods (only overwrites specified methods)
        };
      }
    }

    // Filter tags to only include those used in enabled paths
    const usedTags = new Set<string>();
    Object.values(mergedPaths).forEach((pathMethods: any) => {
      Object.values(pathMethods).forEach((methodDef: any) => {
        if (methodDef?.tags) {
          methodDef.tags.forEach((tag: string) => usedTags.add(tag));
        }
      });
    });

    const filteredTags = [
      ...(customDoc.tags || []),
      ...(medusaAdminSpec.tags || []).filter((tag: any) =>
        usedTags.has(tag.name)
      ),
      ...(medusaStoreSpec.tags || []).filter((tag: any) =>
        usedTags.has(tag.name)
      ),
    ];

    // Only include schemas that are actually referenced in the filtered paths
    const usedSchemas = new Set<string>();
    const extractSchemaRefs = (obj: any) => {
      if (!obj) return;
      if (typeof obj === "object") {
        if (obj.$ref && typeof obj.$ref === "string") {
          const schemaName = obj.$ref.split("/").pop();
          if (schemaName) usedSchemas.add(schemaName);
        }
        Object.values(obj).forEach(extractSchemaRefs);
      }
    };
    extractSchemaRefs(mergedPaths);

    const filteredSchemas: any = { ...(customDoc.components?.schemas || {}) };
    usedSchemas.forEach((schemaName) => {
      if (medusaAdminSpec.components?.schemas?.[schemaName]) {
        filteredSchemas[schemaName] =
          medusaAdminSpec.components.schemas[schemaName];
      }
      if (medusaStoreSpec.components?.schemas?.[schemaName]) {
        filteredSchemas[schemaName] =
          medusaStoreSpec.components.schemas[schemaName];
      }
    });

    // Merge specs with filtered components
    const mergedDoc = {
      ...customDoc,
      paths: mergedPaths,
      components: {
        schemas: filteredSchemas,
        parameters: {
          ...(customDoc.components?.parameters || {}),
          // Only include commonly used parameters
          limit:
            medusaAdminSpec.components?.parameters?.limit ||
            medusaStoreSpec.components?.parameters?.limit,
          offset:
            medusaAdminSpec.components?.parameters?.offset ||
            medusaStoreSpec.components?.parameters?.offset,
          fields:
            medusaAdminSpec.components?.parameters?.fields ||
            medusaStoreSpec.components?.parameters?.fields,
        },
        securitySchemes: {
          ...(medusaAdminSpec.components?.securitySchemes || {}),
          ...(medusaStoreSpec.components?.securitySchemes || {}),
        },
      },
      tags: filteredTags,
    };

    return mergedDoc;
  } catch (error) {
    console.warn(
      "Failed to load Medusa OpenAPI specs, returning custom endpoints only:",
      error
    );
    return customDoc;
  }
}
