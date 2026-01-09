import { Modules } from "@medusajs/framework/utils"

/**
 * Initialize Membership System
 * Creates the "Active Members" customer group if it doesn't exist
 * Run this script once after deploying the membership feature
 *
 * Usage: pnpm medusa exec ./src/scripts/init-membership.ts
 */
export default async function initMembership({ container }: any) {
  const logger = container.resolve("logger")
  const customerModuleService = container.resolve(Modules.CUSTOMER)

  logger.info("Initializing membership system...")

  try {
    // Check if Members group already exists
    const existingGroups = await customerModuleService.listCustomerGroups({
      name: "Active Members",
    })

    if (existingGroups.length > 0) {
      logger.info(`Active Members group already exists with ID: ${existingGroups[0].id}`)
      logger.info("Please add this ID to your .env file as MEMBERSHIP_GROUP_ID")
      return
    }

    // Create Members customer group
    const memberGroup = await customerModuleService.createCustomerGroups({
      name: "Active Members",
      metadata: {
        description: "Customers with active premium membership",
        created_by: "system",
      },
    })

    logger.info(`✅ Created Active Members group with ID: ${memberGroup.id}`)
    logger.info("\nIMPORTANT: Add this to your .env file:")
    logger.info(`MEMBERSHIP_GROUP_ID=${memberGroup.id}`)
    logger.info("\nMembership system initialized successfully!")
  } catch (error) {
    logger.error("Failed to initialize membership system:", error)
    throw error
  }
}
