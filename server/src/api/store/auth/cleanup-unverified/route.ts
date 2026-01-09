import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IAuthModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "zod"

type QueryGraphFunction = {
  graph: (opts: { entity: string; fields: string[]; filters?: Record<string, unknown> }) => Promise<{ data: Array<{ id: string; app_metadata?: Record<string, unknown>; provider_identities?: Array<{ provider_metadata?: Record<string, unknown>; entity_id?: string }> }> }>
}

const CleanupUnverifiedSchema = z.object({
  email: z.string().email().describe("Email address to cleanup"),
})

/**
 * POST /store/auth/cleanup-unverified
 * Cleans up unverified customer registration to allow re-registration
 *
 * This endpoint:
 * 1. Finds customer by email
 * 2. Checks if email is NOT verified
 * 3. Finds and deletes the associated auth identity
 * 4. Deletes the customer
 *
 * This allows users who registered with invalid emails to re-register.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const parsed = CleanupUnverifiedSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid email format",
      errors: parsed.error.issues,
    })
    return
  }

  const { email } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const authModuleService = req.scope.resolve(Modules.AUTH)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Step 1: Find customer by email
    const [customers] = await customerModuleService.listAndCountCustomers(
      { email: normalizedEmail },
      { take: 1 }
    )

    if (customers.length === 0) {
      // No customer found - might still have orphaned auth identity
      // Try to clean up any orphaned auth identity
      await cleanupOrphanedAuthIdentity(authModuleService, query as QueryGraphFunction, normalizedEmail)

      res.json({
        success: true,
        message: "No unverified customer found, cleaned up any orphaned auth identity",
      })
      return
    }

    const customer = customers[0] as {
      id: string
      email: string
      metadata?: Record<string, unknown>
    }

    // Step 2: Check if customer is already verified
    if (customer.metadata?.email_verified === true) {
      res.status(400).json({
        success: false,
        message: "Cannot cleanup verified customer account",
      })
      return
    }

    // Step 3: Find and delete auth identity linked to this customer
    // The auth identity has app_metadata.customer_id = customer.id
    try {
      const { data: authIdentities } = await query.graph({
        entity: "auth_identity",
        fields: ["id", "app_metadata", "provider_identities.*"],
        filters: {},
      })

      // Find auth identity with matching customer_id
      const matchingAuthIdentity = authIdentities.find((ai: {
        id: string
        app_metadata?: Record<string, unknown>
      }) => {
        return ai.app_metadata?.customer_id === customer.id
      })

      if (matchingAuthIdentity) {
        await authModuleService.deleteAuthIdentities([matchingAuthIdentity.id])
        console.log(`[CLEANUP-UNVERIFIED] Deleted auth identity ${matchingAuthIdentity.id}`)
      }
    } catch (authError) {
      // If we can't delete auth identity, log but continue to delete customer
      console.error("[CLEANUP-UNVERIFIED] Failed to delete auth identity:", authError)
    }

    // Step 4: Delete the customer
    await customerModuleService.deleteCustomers([customer.id])
    console.log(`[CLEANUP-UNVERIFIED] Deleted unverified customer ${customer.id} (${customer.email})`)

    res.json({
      success: true,
      message: "Unverified registration cleaned up successfully",
    })
  } catch (error) {
    console.error("[CLEANUP-UNVERIFIED] Error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to cleanup unverified registration",
    })
  }
}

/**
 * Cleanup orphaned auth identity that has no customer
 * This can happen if customer was deleted but auth identity remains
 */
async function cleanupOrphanedAuthIdentity(
  authModuleService: IAuthModuleService,
  query: QueryGraphFunction,
  email: string
): Promise<void> {
  try {
    // Query all auth identities and find one with matching email in provider_identities
    const { data: authIdentities } = await query.graph({
      entity: "auth_identity",
      fields: ["id", "provider_identities.*"],
    })

    for (const ai of authIdentities as {
      id: string
      provider_identities?: Array<{
        provider_metadata?: Record<string, unknown>
        entity_id?: string
      }>
    }[]) {
      if (!ai.provider_identities) continue

      for (const pi of ai.provider_identities) {
        // Check if this provider identity has matching email
        if (pi.entity_id === email || pi.provider_metadata?.email === email) {
          await authModuleService.deleteAuthIdentities([ai.id])
          console.log(`[CLEANUP-UNVERIFIED] Deleted orphaned auth identity ${ai.id} for ${email}`)
          return
        }
      }
    }
  } catch (error) {
    console.error("[CLEANUP-UNVERIFIED] Failed to cleanup orphaned auth identity:", error)
  }
}
