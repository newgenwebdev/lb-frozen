import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { withAdminAuth } from "../../../../utils/admin-auth"

/**
 * DELETE /admin/customers/:id
 * Delete a customer and their auth identity (admin only)
 */
export const DELETE = withAdminAuth(async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params

  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const authModuleService = req.scope.resolve(Modules.AUTH)
  const logger = req.scope.resolve("logger")

  // Get the customer first
  let customer
  try {
    customer = await customerModuleService.retrieveCustomer(id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer with id "${id}" not found`
    )
  }

  // Delete auth identity if exists
  try {
    const authIdentities = await authModuleService.listAuthIdentities({
      app_metadata: {
        customer_id: id,
      },
    })

    for (const authIdentity of authIdentities) {
      await authModuleService.deleteAuthIdentities([authIdentity.id])
      logger.info(`[ADMIN] Deleted auth identity ${authIdentity.id} for customer ${id}`)
    }
  } catch (error) {
    logger.warn(`[ADMIN] Failed to delete auth identities for customer ${id}:`, error)
    // Continue with customer deletion even if auth identity deletion fails
  }

  // Delete the customer
  await customerModuleService.deleteCustomers([id])
  logger.info(`[ADMIN] Deleted customer ${id} (${customer.email})`)

  res.json({
    success: true,
    message: `Customer ${customer.email} deleted successfully`,
    deleted_id: id,
  })
})
