import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService, Logger } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'
import { MEMBERSHIP_MODULE } from '../modules/membership'
import { MEMBERSHIP_CONFIG_MODULE } from '../modules/membership-config'
import { POINTS_MODULE } from '../modules/points'
import { PROMO_MODULE } from '../modules/promo'
import { TIER_CONFIG_MODULE } from '../modules/tier-config'

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  const membershipService = container.resolve(MEMBERSHIP_MODULE)
  const pointsService = container.resolve(POINTS_MODULE)
  const logger = container.resolve<Logger>("logger")

  logger.info(`[ORDER-PLACED] Processing order ${data.id}`)

  const order = await orderModuleService.retrieveOrder(data.id, { relations: ['items', 'items.adjustments', 'summary', 'shipping_address'] })

  // Debug: Log order metadata and adjustments to see if coupon info was transferred
  logger.info(`[ORDER-PLACED] Order ${order.id} metadata: ${JSON.stringify(order.metadata)}`)
  logger.info(`[ORDER-PLACED] Order ${order.id} items adjustments: ${JSON.stringify(order.items?.map(i => ({ id: i.id, adjustments: (i as any).adjustments })))}`)
  logger.info(`[ORDER-PLACED] Order ${order.id} total: ${order.total}, raw_discount_total: ${(order as any).raw_discount_total}, discount_total: ${(order as any).discount_total}`)
  const shippingAddress = await (orderModuleService as any).orderAddressService_.retrieve(order.shipping_address.id)

  // Send order confirmation email
  try {
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: EmailTemplates.ORDER_PLACED,
      data: {
        emailOptions: {
          replyTo: 'info@example.com',
          subject: 'Your order has been placed'
        },
        order,
        shippingAddress,
        preview: 'Thank you for your order!'
      }
    })
  } catch (error) {
    logger.error('Error sending order confirmation notification:', error)
  }

  // Increment coupon usage count if a coupon was used
  const couponId = order.metadata?.applied_coupon_id as string | undefined
  if (couponId) {
    try {
      const promoService = container.resolve(PROMO_MODULE) as any
      await promoService.incrementCouponUsage(couponId)
      logger.info(`[ORDER-PLACED] Incremented usage count for coupon ${couponId} (code: ${order.metadata?.applied_coupon_code})`)
    } catch (error) {
      logger.error(`[ORDER-PLACED] Error incrementing coupon usage: ${error}`)
      // Don't fail the order if coupon increment fails
    }
  }

  // Process membership, points, and tier evaluation for customers
  if (order.customer_id) {
    const tierConfigService = container.resolve(TIER_CONFIG_MODULE) as any

    // Calculate order total from items (order.total is often 0 in Medusa)
    const orderSubtotal = order.items?.reduce((sum, item) => {
      const itemTotal = ((item as any).unit_price || 0) * ((item as any).quantity || 0)
      return sum + itemTotal
    }, 0) || 0

    // Calculate PWP discount from item metadata
    const pwpDiscountTotal = order.items?.reduce((sum, item) => {
      const itemMetadata = (item as any).metadata
      if (itemMetadata?.is_pwp_item && itemMetadata?.pwp_discount_amount) {
        const discountAmount = Number(itemMetadata.pwp_discount_amount) || 0
        return sum + (discountAmount * ((item as any).quantity || 1))
      }
      return sum
    }, 0) || 0

    // Calculate coupon discount from item adjustments
    let couponDiscountTotal = order.items?.reduce((sum, item) => {
      const itemDiscount = (item as any).adjustments?.reduce(
        (adjSum: number, adj: any) => adjSum + (adj.amount || 0),
        0
      ) || 0
      return sum + itemDiscount
    }, 0) || 0

    // Fallback: check order metadata for coupon discount
    if (couponDiscountTotal === 0 && (order as any).metadata?.applied_coupon_discount) {
      couponDiscountTotal = Number((order as any).metadata.applied_coupon_discount) || 0
    }

    const discountTotal = pwpDiscountTotal + couponDiscountTotal
    const orderTotal = Math.max(0, orderSubtotal - discountTotal)

    logger.info(`[ORDER-PLACED] Calculated order total for ${order.id}: subtotal=${orderSubtotal}, discounts=${discountTotal}, total=${orderTotal}`)

    // Auto-enroll customer in free membership program on first order
    try {
      const membershipConfigService = container.resolve(MEMBERSHIP_CONFIG_MODULE) as any
      const config = await membershipConfigService.getConfig()

      // Check if free program with auto-enroll enabled
      if (config.program_type === "free" && config.auto_enroll_on_first_order && config.is_enabled) {
        // Check if customer doesn't already have a membership
        const existingMembership = await (membershipService as any).getMembershipByCustomer(order.customer_id)

        if (!existingMembership) {
          // Create free membership
          const newMembership = await (membershipService as any).createFreeMembership(order.customer_id)
          logger.info(`[ORDER-PLACED] Auto-enrolled customer ${order.customer_id} in free membership program (membership: ${newMembership.id})`)

          // Initialize points balance for the new member
          await (pointsService as any).initializeBalance(order.customer_id)
          logger.info(`[ORDER-PLACED] Initialized points balance for customer ${order.customer_id}`)
        }
      }
    } catch (error) {
      logger.error(`[ORDER-PLACED] Error during auto-enrollment: ${error}`)
      // Don't fail the order if auto-enrollment fails
    }

    // Record order activity for tier calculation (only for existing members)
    try {
      const membership = await (membershipService as any).getMembershipByCustomer(order.customer_id)

      if (membership && membership.status === "active") {
        // Only record order activity for active members
        await (membershipService as any).recordOrderActivity(
          order.customer_id,
          order.id,
          orderTotal
        )
        logger.info(`[ORDER-PLACED] Recorded order activity for member ${order.customer_id}`)
      } else {
        logger.info(`[ORDER-PLACED] Customer ${order.customer_id} is not a member, skipping activity tracking`)
      }
    } catch (error) {
      logger.error(`[ORDER-PLACED] Error recording order activity: ${error}`)
    }

    // Award points if customer is a member
    try {
      const isMember = await (membershipService as any).isMember(order.customer_id)

      if (isMember) {
        // Get customer's current tier for points multiplier
        const membership = await (membershipService as any).getMembershipByCustomer(order.customer_id)
        let pointsMultiplier = 1

        if (membership?.tier_slug) {
          const tier = await tierConfigService.getTierBySlug(membership.tier_slug)
          if (tier) {
            pointsMultiplier = tier.points_multiplier || 1
          }
        }

        const result = await (pointsService as any).earnPoints({
          customer_id: order.customer_id,
          order_id: order.id,
          order_total: orderTotal,
          points_multiplier: pointsMultiplier,
        })

        if (result.points_earned > 0) {
          logger.info(
            `[ORDER-PLACED] Customer ${order.customer_id} earned ${result.points_earned} points ` +
            `(${pointsMultiplier}x multiplier) from order ${order.id}`
          )

          // Emit points.earned event for email notification
          const eventBus: any = container.resolve("eventBus")
          await eventBus.emit("points.earned", {
            customer_id: order.customer_id,
            order_id: order.id,
            points_earned: result.points_earned,
            new_balance: result.new_balance,
          })
        }
      }
    } catch (error) {
      logger.error(`Error awarding points for order: ${error}`)
      // Don't fail the order if points fail
    }

    // Finalize points redemption if points were applied to this order
    try {
      const pointsToRedeem = order.metadata?.points_to_redeem as number | undefined

      if (pointsToRedeem && pointsToRedeem > 0) {
        const result = await (pointsService as any).redeemPoints({
          customer_id: order.customer_id,
          points: pointsToRedeem,
          order_id: order.id,
          reason: `Redeemed for discount on order ${order.id}`,
        })

        logger.info(
          `[ORDER-PLACED] Customer ${order.customer_id} redeemed ${result.points_redeemed} points ` +
          `for $${(result.discount_amount / 100).toFixed(2)} discount on order ${order.id}`
        )
      }
    } catch (error) {
      logger.error(`[ORDER-PLACED] Error finalizing points redemption: ${error}`)
      // Don't fail the order if points redemption finalization fails
    }

    // Evaluate tier upgrade/downgrade
    try {
      const activity = await (membershipService as any).getCustomerActivity(order.customer_id)

      if (activity) {
        const appropriateTier = await tierConfigService.determineTierForActivity(
          activity.rolling_order_count,
          Number(activity.rolling_spend_total)
        )

        if (appropriateTier) {
          const membership = await (membershipService as any).getMembershipByCustomer(order.customer_id)

          if (membership && membership.tier_slug !== appropriateTier.slug) {
            const oldTierSlug = membership.tier_slug
            await (membershipService as any).updateMemberTier(order.customer_id, appropriateTier.slug)

            logger.info(
              `[ORDER-PLACED] Customer ${order.customer_id} tier updated: ` +
              `${oldTierSlug} -> ${appropriateTier.slug} (${appropriateTier.name})`
            )

            // Emit tier change event for notifications
            const eventBus: any = container.resolve("eventBus")
            await eventBus.emit("membership.tier_changed", {
              customer_id: order.customer_id,
              order_id: order.id,
              old_tier: oldTierSlug,
              new_tier: appropriateTier.slug,
              tier_name: appropriateTier.name,
            })
          }
        }
      }
    } catch (error) {
      logger.error(`[ORDER-PLACED] Error evaluating tier upgrade: ${error}`)
      // Don't fail the order if tier evaluation fails
    }
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
