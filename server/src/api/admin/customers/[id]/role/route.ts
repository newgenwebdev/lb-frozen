import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { withAdminAuth } from "../../../../../utils/admin-auth"
import CustomerRolesService from "../../../../../modules/customer-roles/services/customer-roles"
import { CUSTOMER_ROLES, CustomerRole } from "../../../../../lib/constants"

/**
 * GET /admin/customers/:id/role
 * Get customer's current role
 */
export const GET = withAdminAuth(async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.params.id
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  
  // Initialize the roles service
  const logger = req.scope.resolve("logger")
  const rolesService = new CustomerRolesService({ logger })

  // Verify customer exists
  let customer
  try {
    customer = await customerModuleService.retrieveCustomer(customerId, {
      relations: ["groups"],
    })
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer ${customerId} not found`
    )
  }

  const role = await rolesService.getCustomerRole(customerId, req.scope)
  const roleInfo = rolesService.getRoleInfo(role)

  res.json({
    customer_id: customerId,
    role,
    role_info: roleInfo,
    groups: customer.groups?.map((g: any) => ({
      id: g.id,
      name: g.name,
    })) || [],
  })
})

/**
 * PUT /admin/customers/:id/role
 * Assign a role to a customer
 */
export const PUT = withAdminAuth(async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.params.id
  const { role } = req.body as { role: CustomerRole }
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  // Validate role
  const validRoles = Object.values(CUSTOMER_ROLES)
  if (!role || !validRoles.includes(role)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid role. Must be one of: ${validRoles.join(", ")}`
    )
  }

  // Verify customer exists
  let customer
  try {
    customer = await customerModuleService.retrieveCustomer(customerId)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer ${customerId} not found`
    )
  }

  // Initialize the roles service
  const logger = req.scope.resolve("logger")
  const rolesService = new CustomerRolesService({ logger })

  // Assign the role
  await rolesService.assignRole(customerId, role, req.scope)

  // Get updated customer with groups
  const updatedCustomer = await customerModuleService.retrieveCustomer(customerId, {
    relations: ["groups"],
  })

  res.json({
    customer_id: customerId,
    role,
    message: `Role "${role}" assigned successfully`,
    groups: updatedCustomer.groups?.map((g: any) => ({
      id: g.id,
      name: g.name,
    })) || [],
  })
})

/**
 * DELETE /admin/customers/:id/role
 * Remove customer from all pricing groups (reset to retail)
 */
export const DELETE = withAdminAuth(async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.params.id
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  // Verify customer exists
  try {
    await customerModuleService.retrieveCustomer(customerId)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer ${customerId} not found`
    )
  }

  // Initialize the roles service
  const logger = req.scope.resolve("logger")
  const rolesService = new CustomerRolesService({ logger })

  // Remove from all pricing groups
  await rolesService.removeFromAllPricingGroups(customerId, req.scope)

  // Update metadata
  await customerModuleService.updateCustomers(customerId, {
    metadata: {
      pricing_role: CUSTOMER_ROLES.RETAIL,
    },
  })

  res.json({
    customer_id: customerId,
    role: CUSTOMER_ROLES.RETAIL,
    message: "Customer reset to retail pricing",
  })
})
