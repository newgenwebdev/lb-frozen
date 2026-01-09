import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { Modules } from "@medusajs/framework/utils";
import type { IUserModuleService } from "@medusajs/framework/types";
import { CreateUserSchema, ListQuerySchema } from "./schemas";

// Try to import bcryptjs for password hashing
let bcrypt: any;
try {
  bcrypt = require("bcryptjs");
} catch {
  bcrypt = null;
}

/**
 * Check if current user has owner role
 * Only owners can manage users
 */
async function isOwnerRole(
  req: MedusaRequest,
  userModuleService: IUserModuleService
): Promise<boolean> {
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    return false;
  }

  try {
    const user = await userModuleService.retrieveUser(authContext.actor_id);
    const role = (user.metadata as any)?.role || "admin";
    return role.toLowerCase() === "owner";
  } catch {
    return false;
  }
}

/**
 * GET /admin/users-management
 * List all users with pagination and filtering
 * Only accessible by users with 'owner' role
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any);
    return;
  }

  const userModuleService = req.scope.resolve<IUserModuleService>(Modules.USER);

  // Check if user has owner role
  const hasOwnerRole = await isOwnerRole(req, userModuleService);
  if (!hasOwnerRole) {
    res.status(403).json({ message: "Forbidden: Only owners can manage users" } as any);
    return;
  }

  // Parse query params
  const queryResult = ListQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      queryResult.error.message
    );
  }

  const { limit, offset, role, status, q } = queryResult.data;

  // Build filters (role is stored in metadata, not as a direct property)
  const filters: Record<string, unknown> = {};

  // List users with pagination
  const [users, count] = await userModuleService.listAndCountUsers(filters, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" },
  });

  // Apply search and status filters
  let filteredUsers = users;
  if (q) {
    const searchLower = q.toLowerCase();
    filteredUsers = filteredUsers.filter(
      (user: any) =>
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        `${user.first_name || ""} ${user.last_name || ""}`
          .toLowerCase()
          .includes(searchLower)
    );
  }

  // Filter by role (stored in metadata)
  if (role) {
    filteredUsers = filteredUsers.filter((user: any) => {
      const userRole = (user.metadata as any)?.role || "admin";
      return userRole === role;
    });
  }

  // Filter by status (stored in metadata)
  if (status) {
    filteredUsers = filteredUsers.filter((user: any) => {
      const userStatus = (user.metadata as any)?.status || "Active";
      return userStatus === status;
    });
  }

  // Format users for response
  const formattedUsers = filteredUsers.map((user: any) => ({
    id: user.id,
    name:
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
    email: user.email,
    role: (user.metadata as any)?.role || "admin",
    status: (user.metadata as any)?.status || "Active",
    created_at: user.created_at,
    updated_at: user.updated_at,
  }));

  res.json({
    users: formattedUsers,
    count: q || status ? formattedUsers.length : count,
    limit,
    offset,
  });
};

/**
 * POST /admin/users-management
 * Create a new user
 * Only accessible by users with 'owner' role
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any);
    return;
  }

  const userModuleService = req.scope.resolve<IUserModuleService>(Modules.USER);

  // Check if user has owner role
  const hasOwnerRole = await isOwnerRole(req, userModuleService);
  if (!hasOwnerRole) {
    res.status(403).json({ message: "Forbidden: Only owners can create users" } as any);
    return;
  }

  // Validate request body
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message);
  }

  const data = result.data;

  // Check if user with email already exists
  const existingUsers = await userModuleService.listUsers({
    email: data.email,
  });
  if (existingUsers.length > 0) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `User with email "${data.email}" already exists`
    );
  }

  // Parse name into first_name and last_name
  const nameParts = data.name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Hash password
  if (!bcrypt) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Password hashing library not available. Please install bcryptjs: pnpm add bcryptjs @types/bcryptjs"
    );
  }
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(data.password, saltRounds);

  // Create user directly
  // Note: role is stored in metadata since UserDTO doesn't have a role property
  const [user] = await userModuleService.createUsers([
    {
      email: data.email,
      first_name: firstName,
      last_name: lastName,
      password_hash: hashedPassword,
      metadata: {
        role: data.role,
        status: data.status,
      },
    } as any,
  ]);

  // Audit log: user creation
  const logger = req.scope.resolve("logger");
  logger.info(
    `[AUDIT] User created: id=${user.id}, email=${data.email}, role=${data.role}, ` +
    `created_by=${authContext.actor_id}`
  );

  // Format response
  const formattedUser = {
    id: user.id,
    name: data.name,
    email: user.email,
    role: (user.metadata as any)?.role || data.role,
    status: (user.metadata as any)?.status || data.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  res.status(201).json({ user: formattedUser });
};

/**
 * OPTIONS /admin/users-management
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
