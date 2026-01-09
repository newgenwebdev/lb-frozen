import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules, generateJwtToken } from "@medusajs/framework/utils"
import { z } from "zod"

type QueryGraphFunction = {
  graph: (opts: { entity: string; fields: string[] }) => Promise<{ data: Array<{ id: string; app_metadata?: Record<string, unknown> }> }>
}

const VerifyEmailSchema = z.object({
  token: z.string().min(1).describe("Verification token"),
})

/**
 * POST /store/auth/verify-email
 * Verify customer email with token and return auth token for auto-login
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const parsed = VerifyEmailSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request",
      errors: parsed.error.issues,
    })
    return
  }

  const { token } = parsed.data
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Find customer with this verification token
    const [customers] = await customerModuleService.listAndCountCustomers(
      {},
      { take: 1000 }
    )

    const customer = (customers as Array<{ id: string; email: string; metadata?: Record<string, unknown> }>).find(
      (c) => c.metadata?.email_verification_token === token
    )

    if (!customer) {
      res.status(400).json({
        message: "Invalid or expired verification link",
        code: "INVALID_TOKEN",
      })
      return
    }

    // Check if already verified
    if (customer.metadata?.email_verified === true) {
      // Still try to generate token for already verified users
      const authToken = await generateAuthTokenForCustomer(query as QueryGraphFunction, customer.id)
      res.json({
        success: true,
        message: "Email already verified",
        already_verified: true,
        email: customer.email,
        token: authToken,
      })
      return
    }

    // Check token expiration (24 hours)
    const sentAt = customer.metadata?.email_verification_sent_at as string
    if (sentAt) {
      const sentTime = new Date(sentAt).getTime()
      const now = Date.now()
      const hoursSinceSent = (now - sentTime) / (1000 * 60 * 60)

      if (hoursSinceSent > 24) {
        res.status(400).json({
          message: "Verification link has expired. Please request a new one.",
          code: "TOKEN_EXPIRED",
        })
        return
      }
    }

    // Mark email as verified
    const existingMetadata = (customer.metadata || {}) as Record<string, unknown>
    await customerModuleService.updateCustomers(customer.id, {
      metadata: {
        ...existingMetadata,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        email_verification_token: null,
      },
    })

    // Generate auth token for auto-login
    const authToken = await generateAuthTokenForCustomer(query as QueryGraphFunction, customer.id)

    res.json({
      success: true,
      message: "Email verified successfully",
      email: customer.email,
      token: authToken,
    })
  } catch (error) {
    console.error("[VERIFY-EMAIL] Error verifying email:", error)
    res.status(500).json({
      message: "Failed to verify email",
    })
  }
}

/**
 * Generate a JWT auth token for the customer
 */
async function generateAuthTokenForCustomer(
  query: QueryGraphFunction,
  customerId: string
): Promise<string | null> {
  try {
    // Find auth identity linked to this customer
    const { data: authIdentities } = await query.graph({
      entity: "auth_identity",
      fields: ["id", "app_metadata"],
    })

    const authIdentity = authIdentities.find(
      (ai) => ai.app_metadata?.customer_id === customerId
    )

    if (!authIdentity) {
      console.error("[VERIFY-EMAIL] No auth identity found for customer:", customerId)
      return null
    }

    // Generate JWT token with the required payload
    // actor_id is required for successful authentication
    const jwtSecret = process.env.JWT_SECRET || "supersecret"
    const tokenPayload = {
      actor_id: customerId,
      actor_type: "customer",
      auth_identity_id: authIdentity.id,
      app_metadata: authIdentity.app_metadata || {},
    }

    const authToken = generateJwtToken(tokenPayload, {
      secret: jwtSecret,
      expiresIn: "7d",
    })

    return authToken
  } catch (error) {
    console.error("[VERIFY-EMAIL] Failed to generate auth token:", error)
    return null
  }
}
