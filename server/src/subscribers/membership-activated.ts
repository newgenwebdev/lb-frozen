import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type MembershipActivatedData = {
  customer_id: string
  membership_id: string
  tier: string
}

type InjectedDependencies = {
  logger: Logger
}

/**
 * Subscriber: membership.activated
 * Triggered when a customer purchases membership
 * Sends welcome email with membership benefits
 */
export default async function membershipActivatedHandler({
  event: { data },
  container,
}: SubscriberArgs<MembershipActivatedData>) {
  const logger = container.resolve<Logger>("logger")

  logger.info(`Processing membership.activated event for customer ${data.customer_id}`)

  try {
    // Get customer details
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const customer = await customerModuleService.retrieveCustomer(data.customer_id)

    // TODO: Send welcome email
    // const notificationModuleService = container.resolve(Modules.NOTIFICATION)
    // await notificationModuleService.send("membership-welcome", {
    //   to: customer.email,
    //   data: {
    //     customer_name: `${customer.first_name} ${customer.last_name}`,
    //     tier: data.tier,
    //     membership_id: data.membership_id,
    //   },
    // })

    logger.info(
      `Welcome email would be sent to ${customer.email} for membership ${data.membership_id}`
    )
  } catch (error) {
    logger.error(`Error processing membership.activated event: ${error}`)
    // Don't throw - we don't want to fail the membership purchase if email fails
  }
}

export const config: SubscriberConfig = {
  event: "membership.activated",
}
