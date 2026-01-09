import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { withAdminAuth } from "../../../../../utils/admin-auth"

interface UpdatePasswordBody {
  password: string
}

/**
 * PUT /admin/customers/:id/password
 * Reset/update a customer's password (admin only)
 */
export const PUT = withAdminAuth(async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { password } = req.body as UpdatePasswordBody

  if (!password || password.length < 6) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Password must be at least 6 characters"
    )
  }

  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const authModuleService = req.scope.resolve(Modules.AUTH)
  const logger = req.scope.resolve("logger")

  // Get the customer
  const customer = await customerModuleService.retrieveCustomer(id)
  if (!customer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer with id "${id}" not found`
    )
  }

  try {
    // Hash the password using scrypt (same as Medusa's emailpass provider)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const scrypt = require("scrypt-kdf")
    const hashConfig = { logN: 15, r: 8, p: 1 }
    const passwordHash = await scrypt.kdf(password, hashConfig)
    const passwordHashBase64 = passwordHash.toString("base64")

    // Check if auth identity exists
    const authIdentities = await authModuleService.listAuthIdentities({
      provider_identities: {
        entity_id: customer.email.toLowerCase(),
        provider: "emailpass",
      },
    })

    if (authIdentities.length > 0) {
      // Update existing auth identity
      const authIdentity = authIdentities[0]
      
      // Find the provider identity
      const providerIdentity = authIdentity.provider_identities?.find(
        (pi: any) => pi.provider === "emailpass"
      )
      
      if (providerIdentity) {
        await authModuleService.updateProviderIdentities(providerIdentity.id, {
          provider_metadata: {
            password: passwordHashBase64,
          },
        })
        logger.info(`[ADMIN] Updated password for customer ${id}`)
      }
    } else {
      // Create new auth identity
      await authModuleService.createAuthIdentities({
        app_metadata: {
          customer_id: customer.id,
        },
        provider_identities: [
          {
            provider: "emailpass",
            entity_id: customer.email.toLowerCase(),
            provider_metadata: {
              password: passwordHashBase64,
            },
          },
        ],
      })
      logger.info(`[ADMIN] Created auth identity with password for customer ${id}`)
    }

    res.json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error) {
    logger.error(`[ADMIN] Failed to update password for customer ${id}:`, error)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Failed to update password"
    )
  }
})
