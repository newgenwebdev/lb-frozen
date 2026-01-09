import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { Modules } from "@medusajs/framework/utils";
import type { IUserModuleService } from "@medusajs/framework/types";
import { UpdateAccountSchema } from "../schemas";

/**
 * GET /admin/users-management/me
 * Get current user's account details
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

  try {
    const user = await userModuleService.retrieveUser(authContext.actor_id);

    // Format response
    const formattedUser = {
      id: user.id,
      name:
        `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      email: user.email,
      role: (user.metadata as any)?.role || "admin",
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.json({ user: formattedUser });
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "User not found"
    );
  }
};

/**
 * PUT /admin/users-management/me
 * Update current user's account details
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

  const userModuleService = req.scope.resolve<IUserModuleService>(Modules.USER);

  // Validate request body
  const validationResult = UpdateAccountSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      validationResult.error.message
    );
  }

  const data = validationResult.data;

  // Get current user
  let user;
  try {
    user = await userModuleService.retrieveUser(authContext.actor_id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "User not found"
    );
  }

  // If email is being changed, check if new email already exists
  if (data.email && data.email !== user.email) {
    const existingUsers = await userModuleService.listUsers({
      email: data.email,
    });
    if (existingUsers.length > 0 && existingUsers[0].id !== authContext.actor_id) {
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

  // Update user
  const updateResult = await userModuleService.updateUsers({
    id: authContext.actor_id,
    ...updateData,
  });
  const updatedUser = Array.isArray(updateResult)
    ? updateResult[0]
    : updateResult;

  // Format response
  const formattedUser = {
    id: updatedUser.id,
    name:
      data.name ||
      `${updatedUser.first_name || ""} ${updatedUser.last_name || ""}`.trim() ||
      updatedUser.email,
    email: updatedUser.email,
    role: (updatedUser.metadata as any)?.role || "admin",
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
  };

  res.json({ user: formattedUser });
};

/**
 * OPTIONS /admin/users-management/me
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};

