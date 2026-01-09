import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { withAdminAuth } from "../../../../utils/admin-auth"
import CustomerRolesService from "../../../../modules/customer-roles/services/customer-roles"
import { CUSTOMER_ROLES, CustomerRole, DEFAULT_CUSTOMER_ROLE } from "../../../../lib/constants"

interface CreateCustomerBody {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  role?: CustomerRole
  password?: string
  metadata?: Record<string, any>
}

/**
 * POST /admin/customers/create
 * Create a new customer with role assignment (admin only)
 * This is the only way to create customers since public registration is disabled
 */
export const POST = withAdminAuth(async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const {
    email,
    first_name = "",
    last_name = "",
    phone,
    role = DEFAULT_CUSTOMER_ROLE,
    password,
    metadata = {},
  } = req.body as CreateCustomerBody

  // Validate required fields
  if (!email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Email is required"
    )
  }

  // Validate role
  const validRoles = Object.values(CUSTOMER_ROLES)
  if (!validRoles.includes(role)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid role. Must be one of: ${validRoles.join(", ")}`
    )
  }

  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const logger = req.scope.resolve("logger")

  // Check if email already exists
  const existingCustomers = await customerModuleService.listCustomers({
    email: email.toLowerCase(),
  })

  if (existingCustomers.length > 0) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Customer with email "${email}" already exists`
    )
  }

  // Create the customer
  const customer = await customerModuleService.createCustomers({
    email: email.toLowerCase(),
    first_name,
    last_name,
    phone,
    has_account: true,
    metadata: {
      ...metadata,
      pricing_role: role,
      created_by_admin: true,
    },
  })

  logger.info(`[ADMIN] Created customer ${customer.id} with email ${email}`)

  // Assign the role (adds to appropriate customer group)
  const rolesService = new CustomerRolesService({ logger })
  await rolesService.assignRole(customer.id, role, req.scope)

  // If password provided, create auth identity
  if (password) {
    try {
      const authModuleService = req.scope.resolve(Modules.AUTH)
      
      // Hash the password using scrypt (same as Medusa's emailpass provider)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const scrypt = require("scrypt-kdf")
      const hashConfig = { logN: 15, r: 8, p: 1 }
      const passwordHash = await scrypt.kdf(password, hashConfig)
      const passwordHashBase64 = passwordHash.toString("base64")
      
      // Create auth identity for email/password login
      await authModuleService.createAuthIdentities({
        app_metadata: {
          customer_id: customer.id,
        },
        provider_identities: [
          {
            provider: "emailpass",
            entity_id: email.toLowerCase(),
            provider_metadata: {
              password: passwordHashBase64,
            },
          },
        ],
      })
      
      logger.info(`[ADMIN] Created auth identity for customer ${customer.id}`)
    } catch (error) {
      logger.error(`[ADMIN] Failed to create auth identity:`, error)
      // Don't fail the whole request, customer is created
    }
  }

  // Retrieve customer with groups
  const customerWithGroups = await customerModuleService.retrieveCustomer(customer.id, {
    relations: ["groups"],
  })

  res.status(201).json({
    customer: {
      id: customerWithGroups.id,
      email: customerWithGroups.email,
      first_name: customerWithGroups.first_name,
      last_name: customerWithGroups.last_name,
      phone: customerWithGroups.phone,
      has_account: customerWithGroups.has_account,
      metadata: customerWithGroups.metadata,
      groups: customerWithGroups.groups?.map((g: any) => ({
        id: g.id,
        name: g.name,
      })) || [],
      created_at: customerWithGroups.created_at,
    },
    role,
    message: `Customer created with ${role} role`,
  })
})
