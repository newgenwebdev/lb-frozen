import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { withAdminAuth } from "../../../../utils/admin-auth"
import CustomerRolesService from "../../../../modules/customer-roles/services/customer-roles"
import { 
  CUSTOMER_ROLES, 
  CUSTOMER_GROUP_IDS, 
  CustomerRole,
  DEFAULT_CUSTOMER_ROLE 
} from "../../../../lib/constants"

/**
 * GET /admin/customers/roles
 * Get all customers with their roles
 */
export const GET = withAdminAuth(async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const logger = req.scope.resolve("logger")
  const rolesService = new CustomerRolesService({ logger })

  try {
    // List all customers with their groups
    const customers = await customerModuleService.listCustomers(
      {},
      {
        relations: ["groups"],
        order: { created_at: "DESC" },
      }
    )

    // Map customers with their roles
    const customersWithRoles = await Promise.all(
      customers.map(async (customer: any) => {
        // Determine role from metadata or group membership
        let role: CustomerRole = DEFAULT_CUSTOMER_ROLE

        // Log for debugging
        logger.info(`[ADMIN-ROLES] Customer ${customer.email} groups: ${JSON.stringify(customer.groups?.map((g: any) => ({ id: g.id, name: g.name })) || [])}`)
        logger.info(`[ADMIN-ROLES] Customer ${customer.email} metadata: ${JSON.stringify(customer.metadata)}`)
        logger.info(`[ADMIN-ROLES] Expected group IDs: ${JSON.stringify(CUSTOMER_GROUP_IDS)}`)

        // First check metadata (primary source)
        if (customer.metadata?.pricing_role) {
          role = customer.metadata.pricing_role as CustomerRole
          logger.info(`[ADMIN-ROLES] Using metadata role for ${customer.email}: ${role}`)
        } else if (customer.groups && customer.groups.length > 0) {
          // Check group membership as fallback
          for (const [roleKey, groupId] of Object.entries(CUSTOMER_GROUP_IDS)) {
            if (customer.groups.some((g: any) => g.id === groupId)) {
              role = CUSTOMER_ROLES[roleKey as keyof typeof CUSTOMER_ROLES]
              logger.info(`[ADMIN-ROLES] Found group match for ${customer.email}: ${role}`)
              break
            }
          }
        }

        return {
          id: customer.id,
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          has_account: customer.has_account,
          created_at: customer.created_at,
          updated_at: customer.updated_at,
          metadata: customer.metadata,
          role,
          groups: customer.groups?.map((g: any) => ({
            id: g.id,
            name: g.name,
          })) || [],
        }
      })
    )

    res.json({
      customers: customersWithRoles,
      count: customersWithRoles.length,
    })
  } catch (error) {
    logger.error(`[ADMIN] Failed to list customers with roles: ${error}`)
    res.status(500).json({
      message: "Failed to list customers",
      error: (error as Error).message,
    })
  }
})
