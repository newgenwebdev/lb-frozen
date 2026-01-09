import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import CustomerRolesService from "../../../../modules/customer-roles/services/customer-roles"
import { 
  CUSTOMER_ROLES, 
  DEFAULT_CUSTOMER_ROLE,
  CustomerRole 
} from "../../../../lib/constants"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"

/**
 * GET /store/customer/role
 * Get current customer's role (or default for guests)
 * Returns role info for frontend pricing display
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = getVerifiedCustomerId(req)
  const logger = req.scope.resolve("logger")

  // If not authenticated, return retail (guest) role
  if (!customerId) {
    return res.json({
      authenticated: false,
      role: DEFAULT_CUSTOMER_ROLE,
      role_info: {
        slug: DEFAULT_CUSTOMER_ROLE,
        name: "Retail",
        description: "Standard retail pricing",
        can_see_bulk_prices: false,
        can_see_vip_prices: false,
      },
    })
  }

  try {
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
    const rolesService = new CustomerRolesService({ logger })

    // Get customer
    const customer = await customerModuleService.retrieveCustomer(customerId, {
      select: ["id", "email", "first_name", "last_name", "metadata"],
    })

    // Get customer's role
    const role = await rolesService.getCustomerRole(customerId, req.scope)

    res.json({
      authenticated: true,
      customer_id: customerId,
      customer: {
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
      role,
      role_info: getRoleInfo(role),
    })
  } catch (error) {
    logger.error(`[STORE] Failed to get customer role:`, error)
    
    // Return retail as fallback
    res.json({
      authenticated: true,
      customer_id: customerId,
      role: DEFAULT_CUSTOMER_ROLE,
      role_info: getRoleInfo(DEFAULT_CUSTOMER_ROLE),
      error: "Failed to retrieve role details",
    })
  }
}

function getRoleInfo(role: CustomerRole) {
  const baseInfo = {
    slug: role,
    can_see_bulk_prices: role === CUSTOMER_ROLES.BULK || role === CUSTOMER_ROLES.VIP,
    can_see_vip_prices: role === CUSTOMER_ROLES.VIP,
    can_see_supplier_prices: role === CUSTOMER_ROLES.SUPPLIER,
  }

  switch (role) {
    case CUSTOMER_ROLES.RETAIL:
      return {
        ...baseInfo,
        name: "Retail",
        description: "Standard retail pricing",
      }
    case CUSTOMER_ROLES.BULK:
      return {
        ...baseInfo,
        name: "Bulk",
        description: "Wholesale pricing for bulk purchases",
      }
    case CUSTOMER_ROLES.VIP:
      return {
        ...baseInfo,
        name: "VIP",
        description: "Exclusive VIP pricing and benefits",
      }
    case CUSTOMER_ROLES.SUPPLIER:
      return {
        ...baseInfo,
        name: "Supplier",
        description: "Supplier account with special access",
      }
    default:
      return {
        ...baseInfo,
        name: "Retail",
        description: "Standard retail pricing",
      }
  }
}
