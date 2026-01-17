import { INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { STOREFRONT_URL } from '../lib/constants'
import { EmailTemplates } from '../modules/email-notifications/templates'

interface PasswordResetEventData {
  entity_id: string // The email address
  actor_type: string // "customer" or "user"
  token: string // The reset token
}

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetEventData>): Promise<void> {
  // Only handle customer password resets
  // Admin password resets would use a different URL/handler
  if (data.actor_type !== 'customer') {
    return
  }

  const notificationModuleService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION
  )

  const resetLink = `${STOREFRONT_URL}/reset-password?token=${data.token}`

  try {
    await notificationModuleService.createNotifications({
      to: data.entity_id,
      channel: 'email',
      template: EmailTemplates.PASSWORD_RESET,
      data: {
        emailOptions: {
          replyTo: 'support@lb-frozen.com',
          subject: 'Reset Your Password',
        },
        resetLink,
        preview: 'Reset your password',
      },
    })
  } catch (error) {
    console.error('Failed to send password reset email:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'auth.password_reset',
}
