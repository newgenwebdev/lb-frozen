import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INotificationModuleService, ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import crypto from "crypto"
import { STOREFRONT_URL } from "../../../../lib/constants"
import { EmailTemplates } from "../../../../modules/email-notifications/templates"

const ResendVerificationSchema = z.object({
  email: z.string().email().describe("Customer email address"),
})

/**
 * POST /store/auth/resend-verification
 * Resend verification email to customer
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const parsed = ResendVerificationSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid email format",
      errors: parsed.error.issues,
    })
    return
  }

  const { email } = parsed.data
  const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const notificationModuleService: INotificationModuleService = req.scope.resolve(Modules.NOTIFICATION)

  try {
    // Find customer by email
    const [customers] = await customerModuleService.listAndCountCustomers(
      { email: email.toLowerCase() },
      { take: 1 }
    )

    if (customers.length === 0) {
      // Don't reveal if email exists
      res.json({
        success: true,
        message: "If an account exists with this email, a verification link has been sent.",
      })
      return
    }

    const customer = customers[0] as { id: string; email: string; first_name?: string | null; metadata?: Record<string, unknown> }

    // Check if already verified
    if (customer.metadata?.email_verified === true) {
      res.json({
        success: true,
        message: "Email is already verified. You can log in.",
        already_verified: true,
      })
      return
    }

    // Rate limiting: Check last sent time (minimum 60 seconds between requests)
    const lastSentAt = customer.metadata?.email_verification_sent_at as string
    if (lastSentAt) {
      const lastSentTime = new Date(lastSentAt).getTime()
      const now = Date.now()
      const secondsSinceLastSent = (now - lastSentTime) / 1000

      if (secondsSinceLastSent < 60) {
        res.status(429).json({
          message: "Please wait before requesting another verification email",
          code: "RATE_LIMITED",
          retry_after: Math.ceil(60 - secondsSinceLastSent),
        })
        return
      }
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationLink = `${STOREFRONT_URL}/auth/verify-email?token=${verificationToken}`

    // Update customer metadata with new token
    const existingMetadata = (customer.metadata || {}) as Record<string, unknown>
    await customerModuleService.updateCustomers(customer.id, {
      metadata: {
        ...existingMetadata,
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

    res.json({
      success: true,
      message: "Verification email sent successfully",
    })
  } catch (error) {
    console.error("[RESEND-VERIFICATION] Error:", error)
    res.status(500).json({
      message: "Failed to send verification email",
    })
  }
}
