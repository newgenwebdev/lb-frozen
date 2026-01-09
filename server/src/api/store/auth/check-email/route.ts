import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"

const CheckEmailSchema = z.object({
  email: z.string().email().describe("Email address to check"),
})

/**
 * POST /store/auth/check-email
 * Check if a customer email exists in the system
 * Returns { exists: boolean }
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const parsed = CheckEmailSchema.safeParse(req.body)

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
    // Search for customer with exact email match
    const [customers] = await customerModuleService.listAndCountCustomers(
      { email: email.toLowerCase() },
      { take: 1 }
    )

    res.json({
      exists: customers.length > 0,
    })
  } catch (error) {
    console.error("Error checking email existence:", error)
    res.status(500).json({
      message: "Failed to check email",
    })
  }
}
