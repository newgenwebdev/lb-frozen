import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { Modules } from "@medusajs/framework/utils";
import type { IUserModuleService } from "@medusajs/framework/types";
import { UpdateUserSchema } from "../schemas";

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
 * GET /admin/users-management/:id
 * Get a single user by ID
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

  const { id } = req.params;
  const userModuleService = req.scope.resolve<IUserModuleService>(Modules.USER);

  // Check if user has owner role
  const hasOwnerRole = await isOwnerRole(req, userModuleService);
  if (!hasOwnerRole) {
    res.status(403).json({ message: "Forbidden: Only owners can view user details" } as any);
    return;
  }

  try {
    const user = await userModuleService.retrieveUser(id);

    // Format response
    const formattedUser = {
      id: user.id,
      name:
        `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      email: user.email,
      role: (user.metadata as any)?.role || "admin",
      status: (user.metadata as any)?.status || "Active",
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.json({ user: formattedUser });
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `User with id "${id}" not found`
    );
  }
};

/**
 * PUT /admin/users-management/:id
 * Update a user
 * Only accessible by users with 'owner' role
 */
export const PUT = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any);
    return;
  }

  const { id } = req.params;
  const userModuleService = req.scope.resolve<IUserModuleService>(Modules.USER);

  // Check if user has owner role
  const hasOwnerRole = await isOwnerRole(req, userModuleService);
  if (!hasOwnerRole) {
    res.status(403).json({ message: "Forbidden: Only owners can update users" } as any);
    return;
  }

  // Validate request body
  const validationResult = UpdateUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      validationResult.error.message
    );
  }

  const data = validationResult.data;

  // Check if user exists
  let user;
  try {
    user = await userModuleService.retrieveUser(id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `User with id "${id}" not found`
    );
  }

  // If email is being changed, check if new email already exists
  if (data.email && data.email !== user.email) {
    const existingUsers = await userModuleService.listUsers({
      email: data.email,
    });
    if (existingUsers.length > 0 && existingUsers[0].id !== id) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `User with email "${data.email}" already exists`
      );
    }
  }

  // Prepare update data
  const updateData: any = {};
  if (data.name) {
    const nameParts = data.name.trim().split(/\s+/);
    updateData.first_name = nameParts[0] || "";
    updateData.last_name = nameParts.slice(1).join(" ") || "";
  }
  if (data.email) {
    updateData.email = data.email;
  }

  // Update metadata for role and status (stored in metadata)
  const metadataUpdates: any = {
    ...(user.metadata || {}),
  };
  if (data.role !== undefined) {
    metadataUpdates.role = data.role;
  }
  if (data.status !== undefined) {
    metadataUpdates.status = data.status;
  }
  updateData.metadata = metadataUpdates;

  // Update user (updateUsers expects an object with id and update data)
  const updateResult = await userModuleService.updateUsers({
    id,
    ...updateData,
  });
  const updatedUser = Array.isArray(updateResult)
    ? updateResult[0]
    : updateResult;

  // Audit log: user update
  const logger = req.scope.resolve("logger");
  const changes = Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined);
  logger.info(
    `[AUDIT] User updated: id=${id}, changes=[${changes.join(",")}], ` +
    `updated_by=${authContext.actor_id}`
  );

  // Format response
  const formattedUser = {
    id: updatedUser.id,
    name:
      data.name ||
      `${updatedUser.first_name || ""} ${updatedUser.last_name || ""}`.trim() ||
      updatedUser.email,
    email: updatedUser.email,
    role: (updatedUser.metadata as any)?.role || data.role || "admin",
    status: (updatedUser.metadata as any)?.status || data.status || "Active",
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
  };

  res.json({ user: formattedUser });
};

/**
 * DELETE /admin/users-management/:id
 * Delete a user
 * Only accessible by users with 'owner' role
 */
export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any);
    return;
  }

  const { id } = req.params;
  const userModuleService = req.scope.resolve<IUserModuleService>(Modules.USER);

  // Check if user has owner role
  const hasOwnerRole = await isOwnerRole(req, userModuleService);
  if (!hasOwnerRole) {
    res.status(403).json({ message: "Forbidden: Only owners can delete users" } as any);
    return;
  }

  // Prevent deleting yourself
  if (authContext.actor_id === id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You cannot delete your own account"
    );
  }

  // Check if user exists and get details for audit log
  let userToDelete;
  try {
    userToDelete = await userModuleService.retrieveUser(id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `User with id "${id}" not found`
    );
  }

  // Delete user (deleteUsers expects an array of IDs)
  await userModuleService.deleteUsers([id]);

  // Audit log: user deletion
  const logger = req.scope.resolve("logger");
  logger.warn(
    `[AUDIT] User deleted: id=${id}, email=${userToDelete.email}, ` +
    `deleted_by=${authContext.actor_id}`
  );

  res.status(200).json({ id, deleted: true });
};

/**
 * OPTIONS /admin/users-management/:id
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
