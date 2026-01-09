import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"

const CheckVerificationSchema = z.object({
  email: z.string().email().describe("Email address to check"),
})

/**
 * POST /store/auth/check-verification
 * Check if a customer email is verified
 * Used by frontend before/after login attempts
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const parsed = CheckVerificationSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid email format",
      errors: parsed.error.issues,
    })
    return
  }

  const { email } = parsed.data
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  try {
    const [customers] = await customerModuleService.listAndCountCustomers(
      { email: email.toLowerCase() },
      { take: 1 }
    )

    if (customers.length === 0) {
      res.json({
        verified: false,
        exists: false,
      })
      return
    }

    const customer = customers[0] as { metadata?: Record<string, unknown> }
    const isVerified = customer.metadata?.email_verified === true

    res.json({
      verified: isVerified,
      exists: true,
    })
  } catch (error) {
    console.error("[CHECK-VERIFICATION] Error:", error)
    res.status(500).json({
      message: "Failed to check verification status",
    })
  }
}
