import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { Modules } from "@medusajs/framework/utils";
import type { IUserModuleService } from "@medusajs/framework/types";
import { ChangePasswordSchema } from "../../schemas";

// Try to import bcryptjs, fallback to crypto if not available
let bcrypt: any;
try {
  bcrypt = require("bcryptjs");
} catch {
  // bcryptjs not installed - will need to use alternative method
  bcrypt = null;
}

/**
 * PUT /admin/users-management/me/password
 * Change current user's password
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
  const validationResult = ChangePasswordSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      validationResult.error.message
    );
  }

  const { current_password, new_password } = validationResult.data;

  // Get current user
  let user: any;
  try {
    user = await userModuleService.retrieveUser(authContext.actor_id);
  } catch {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "User not found");
  }

  // Verify current password
  if (!user.password_hash) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "User password not set"
    );
  }

  // Verify current password using bcrypt
  if (!bcrypt) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Password hashing library not available. Please install bcryptjs: pnpm add bcryptjs @types/bcryptjs"
    );
  }

  const isPasswordValid = await bcrypt.compare(
    current_password,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Current password is incorrect"
    );
  }

  // Hash new password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(new_password, saltRounds);

  // Update password
  // Note: password_hash is not in UpdateUserDTO type, but it's a valid field in the database
  await userModuleService.updateUsers({
    id: authContext.actor_id,
    password_hash: hashedPassword,
  } as any);

  res.json({
    success: true,
    message: "Password updated successfully",
  });
};

/**
 * OPTIONS /admin/users-management/me/password
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
