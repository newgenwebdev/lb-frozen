import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type PointsEarnedData = {
  customer_id: string
  order_id: string
  points_earned: number
  new_balance: number
}

/**
 * Subscriber: points.earned
 * Triggered when a customer earns points from a purchase
 * Sends email notification about points earned
 */
export default async function pointsEarnedHandler({
  event: { data },
  container,
}: SubscriberArgs<PointsEarnedData>) {
  const logger = container.resolve<Logger>("logger")

  logger.info(
    `Processing points.earned event for customer ${data.customer_id}: ${data.points_earned} points`
  )

  try {
    // Get customer details
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const customer = await customerModuleService.retrieveCustomer(data.customer_id)

    // TODO: Send points earned email
    // const notificationModuleService = container.resolve(Modules.NOTIFICATION)
    // await notificationModuleService.send("points-earned", {
    //   to: customer.email,
    //   data: {
    //     customer_name: `${customer.first_name} ${customer.last_name}`,
    //     points_earned: data.points_earned,
    //     new_balance: data.new_balance,
    //     order_id: data.order_id,
    //   },
    // })

    logger.info(
      `Points earned email would be sent to ${customer.email}: ${data.points_earned} points`
    )
  } catch (error) {
    logger.error("Error processing points.earned event:", error)
    // Don't throw - email failure shouldn't affect points award
  }
}

export const config: SubscriberConfig = {
  event: "points.earned",
}
