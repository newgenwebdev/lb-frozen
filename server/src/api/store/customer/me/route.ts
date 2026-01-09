import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"

/**
 * GET /store/customer/me
 * Get current customer with all metadata
 * This endpoint is needed because Medusa's default /store/customers/me
 * doesn't always return metadata fields
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    return res.status(401).json({
      message: "Unauthorized",
    })
  }

  try {
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    
    const customer = await customerModuleService.retrieveCustomer(customerId, {
      relations: ["addresses"],
    })

    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        has_account: customer.has_account,
        metadata: customer.metadata || {},
        addresses: customer.addresses || [],
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      },
    })
  } catch (error) {
    console.error("[STORE] Failed to get customer:", error)
    res.status(500).json({
      message: "Failed to get customer data",
    })
  }
}
