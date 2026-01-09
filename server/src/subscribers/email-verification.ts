import { INotificationModuleService, ICustomerModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import crypto from 'crypto'
import { STOREFRONT_URL } from '../lib/constants'
import { EmailTemplates } from '../modules/email-notifications/templates'

interface CustomerCreatedEventData {
  id: string
}

/**
 * Handles customer.created event to send email verification
 */
export default async function emailVerificationHandler({
  event: { data },
  container,
}: SubscriberArgs<CustomerCreatedEventData>): Promise<void> {
  const notificationModuleService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )
  const customerModuleService: ICustomerModuleService = container.resolve(
    Modules.CUSTOMER
  )

  try {
    // Retrieve the customer
    const customer = await customerModuleService.retrieveCustomer(data.id)

    // Skip if customer is already verified (e.g., admin-created customers)
    if (customer.metadata?.email_verified === true) {
      return
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationLink = `${STOREFRONT_URL}/auth/verify-email?token=${verificationToken}`

    // Store token in customer metadata
    const existingMetadata = (customer.metadata || {}) as Record<string, unknown>
    await customerModuleService.updateCustomers(data.id, {
      metadata: {
        ...existingMetadata,
        email_verified: false,
        email_verification_token: verificationToken,
        email_verification_sent_at: new Date().toISOString(),
      },
    })

    // Send verification email
    await notificationModuleService.createNotifications({
      to: customer.email,
      channel: 'email',
      template: EmailTemplates.EMAIL_VERIFICATION,
      data: {
        emailOptions: {
          replyTo: 'support@lb-frozen.com',
          subject: 'Verify Your Email Address',
        },
        verificationLink,
        firstName: customer.first_name || undefined,
        preview: 'Please verify your email to activate your account',
      },
    })

    console.log(`[EMAIL-VERIFICATION] Sent verification email to ${customer.email}`)
  } catch (error) {
    console.error('[EMAIL-VERIFICATION] Failed to send verification email:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'customer.created',
}
