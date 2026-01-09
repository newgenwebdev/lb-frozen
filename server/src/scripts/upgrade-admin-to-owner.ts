import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { IUserModuleService } from "@medusajs/framework/types";

/**
 * Script to upgrade admin@lb-frozen.com to owner role
 * Run with: pnpm medusa exec ./src/scripts/upgrade-admin-to-owner.ts
 */
export default async function upgradeAdminToOwner({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModuleService = container.resolve<IUserModuleService>(Modules.USER);

  const adminEmail = "admin@lb-frozen.com";

  logger.info(`Looking for user with email: ${adminEmail}`);

  // Find the admin user
  const users = await userModuleService.listUsers({ email: adminEmail });

  if (!users.length) {
    logger.error(`User with email ${adminEmail} not found`);
    return;
  }

  const adminUser = users[0];
  logger.info(`Found user: ${adminUser.id} (${adminUser.email})`);
  logger.info(`Current role: ${(adminUser.metadata as any)?.role || "admin (default)"}`);

  // Update metadata to set role as owner
  const updatedUser = await userModuleService.updateUsers({
    id: adminUser.id,
    metadata: {
      ...(adminUser.metadata || {}),
      role: "owner",
    },
  });

  const result = Array.isArray(updatedUser) ? updatedUser[0] : updatedUser;
  logger.info(`Successfully upgraded user to owner role`);
  logger.info(`New role: ${(result.metadata as any)?.role}`);
}
