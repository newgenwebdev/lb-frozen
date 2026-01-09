import type { MedusaContainer } from "@medusajs/framework/types"
import { MEMBERSHIP_MODULE } from "../modules/membership"
import { TIER_CONFIG_MODULE } from "../modules/tier-config"

/**
 * Daily job to evaluate and process tier upgrades/downgrades
 *
 * This job runs daily to:
 * 1. Recalculate rolling 12-month activity for all members
 * 2. Determine appropriate tier based on updated activity
 * 3. Upgrade or downgrade members accordingly
 *
 * Tier changes are based on rolling 12-month activity, so as old orders
 * fall outside the 12-month window, customers may be downgraded.
 */
export default async function evaluateTierDowngrades(
  container: MedusaContainer
): Promise<void> {
  const membershipService = container.resolve(MEMBERSHIP_MODULE) as any
  const tierConfigService = container.resolve(TIER_CONFIG_MODULE) as any
  const logger = container.resolve("logger") as any

  logger.info("[TIER-EVAL] Starting daily tier evaluation job")

  const startTime = Date.now()
  let processed = 0
  let upgraded = 0
  let downgraded = 0
  let unchanged = 0
  let errors = 0

  try {
    // Get all active memberships
    const [memberships] = await membershipService.listActiveMembers({ limit: 10000 })

    logger.info(`[TIER-EVAL] Processing ${memberships.length} active members`)

    for (const membership of memberships) {
      try {
        // Recalculate rolling 12-month activity for this customer
        const activity = await membershipService.recalculateCustomerActivity(membership.customer_id)

        // Determine appropriate tier based on updated activity
        const appropriateTier = await tierConfigService.determineTierForActivity(
          activity.orderCount,
          activity.totalSpend
        )

        if (!appropriateTier) {
          logger.warn(`[TIER-EVAL] No appropriate tier found for customer ${membership.customer_id}`)
          continue
        }

        if (membership.tier_slug !== appropriateTier.slug) {
          // Get current tier for comparison
          const currentTier = await tierConfigService.getTierBySlug(membership.tier_slug)
          const currentRank = currentTier?.rank || 0
          const newRank = appropriateTier.rank

          // Update membership tier
          await membershipService.updateMemberTier(membership.customer_id, appropriateTier.slug)

          if (newRank > currentRank) {
            upgraded++
            logger.info(
              `[TIER-EVAL] UPGRADED: Customer ${membership.customer_id} ` +
              `${membership.tier_slug} -> ${appropriateTier.slug} ` +
              `(orders: ${activity.orderCount}, spend: ${activity.totalSpend})`
            )
          } else {
            downgraded++
            logger.info(
              `[TIER-EVAL] DOWNGRADED: Customer ${membership.customer_id} ` +
              `${membership.tier_slug} -> ${appropriateTier.slug} ` +
              `(orders: ${activity.orderCount}, spend: ${activity.totalSpend})`
            )
          }

          // Emit tier change event for notifications
          try {
            const eventBus: any = container.resolve("eventBus")
            await eventBus.emit("membership.tier_changed", {
              customer_id: membership.customer_id,
              old_tier: membership.tier_slug,
              new_tier: appropriateTier.slug,
              tier_name: appropriateTier.name,
              reason: "daily_evaluation",
            })
          } catch (eventError) {
            logger.warn(`[TIER-EVAL] Failed to emit tier_changed event: ${eventError}`)
          }
        } else {
          unchanged++
        }

        processed++
      } catch (customerError) {
        errors++
        logger.error(
          `[TIER-EVAL] Error processing customer ${membership.customer_id}:`,
          customerError
        )
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    logger.info(
      `[TIER-EVAL] Completed in ${duration}s. ` +
      `Processed: ${processed}, Upgraded: ${upgraded}, Downgraded: ${downgraded}, ` +
      `Unchanged: ${unchanged}, Errors: ${errors}`
    )
  } catch (error) {
    logger.error("[TIER-EVAL] Job failed:", error)
    throw error
  }
}

/**
 * Job configuration
 * Runs daily at 2:00 AM server time
 */
export const config = {
  name: "evaluate-tier-downgrades",
  schedule: "0 2 * * *", // Cron: At 02:00 every day
}
