import { Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import {
  CUSTOMER_ROLES,
  CUSTOMER_GROUP_IDS,
  PRICE_LIST_IDS,
  CustomerRole,
  DEFAULT_CUSTOMER_ROLE
} from "../../../lib/constants"

/**
 * Roles that map to a Medusa Price List.
 * Retail uses the variant's default price, so it does not need a price list.
 */
type PricedRole = Exclude<CustomerRole, typeof CUSTOMER_ROLES.RETAIL>

interface PriceListInfo {
  id: string
  title: string
  description: string
  customerGroupId: string
}

const PRICE_LISTS: Record<PricedRole, PriceListInfo> = {
  [CUSTOMER_ROLES.BULK]: {
    id: PRICE_LIST_IDS.BULK,
    title: "Bulk Pricing",
    description: "Price overrides for bulk customers",
    customerGroupId: CUSTOMER_GROUP_IDS.BULK,
  },
  [CUSTOMER_ROLES.VIP]: {
    id: PRICE_LIST_IDS.VIP,
    title: "VIP Pricing",
    description: "Price overrides for VIP customers",
    customerGroupId: CUSTOMER_GROUP_IDS.VIP,
  },
  [CUSTOMER_ROLES.SUPPLIER]: {
    id: PRICE_LIST_IDS.SUPPLIER,
    title: "Supplier Pricing",
    description: "Price overrides for supplier accounts",
    customerGroupId: CUSTOMER_GROUP_IDS.SUPPLIER,
  },
}

type InjectedDependencies = {
  logger: Logger
}

/**
 * Customer Role Group Metadata
 */
interface CustomerGroupInfo {
  id: string
  name: string
  role: CustomerRole
  description: string
}

/**
 * Customer Groups for each pricing tier
 */
const CUSTOMER_GROUPS: Record<CustomerRole, CustomerGroupInfo> = {
  [CUSTOMER_ROLES.RETAIL]: {
    id: CUSTOMER_GROUP_IDS.RETAIL,
    name: "Retail Customers",
    role: CUSTOMER_ROLES.RETAIL,
    description: "Standard retail customers with public pricing",
  },
  [CUSTOMER_ROLES.BULK]: {
    id: CUSTOMER_GROUP_IDS.BULK,
    name: "Bulk Customers",
    role: CUSTOMER_ROLES.BULK,
    description: "Wholesale/bulk purchase customers with discounted pricing",
  },
  [CUSTOMER_ROLES.VIP]: {
    id: CUSTOMER_GROUP_IDS.VIP,
    name: "VIP Customers",
    role: CUSTOMER_ROLES.VIP,
    description: "VIP customers with premium pricing and benefits",
  },
  [CUSTOMER_ROLES.SUPPLIER]: {
    id: CUSTOMER_GROUP_IDS.SUPPLIER,
    name: "Suppliers",
    role: CUSTOMER_ROLES.SUPPLIER,
    description: "Supplier accounts with special access",
  },
}

/**
 * CustomerRolesService
 * Manages customer role/group assignments for pricing tiers
 */
class CustomerRolesService {
  protected logger: Logger

  constructor({ logger }: InjectedDependencies) {
    this.logger = logger
  }

  /**
   * Initialize all customer groups
   * Should be called on server startup
   */
  async initializeCustomerGroups(container: any): Promise<void> {
    const customerModuleService = container.resolve(Modules.CUSTOMER)

    for (const [role, groupInfo] of Object.entries(CUSTOMER_GROUPS)) {
      try {
        await this.ensureGroupExists(customerModuleService, groupInfo)
        this.logger.info(`[CUSTOMER-ROLES] Group "${groupInfo.name}" initialized`)
      } catch (error) {
        this.logger.error(
          `[CUSTOMER-ROLES] Failed to initialize group "${groupInfo.name}":`,
          error
        )
      }
    }
  }

  /**
   * Ensure a customer group exists, create if not
   */
  private async ensureGroupExists(
    customerModuleService: any,
    groupInfo: CustomerGroupInfo
  ): Promise<void> {
    try {
      await customerModuleService.retrieveCustomerGroup(groupInfo.id)
    } catch {
      // Group doesn't exist, create it
      this.logger.info(`[CUSTOMER-ROLES] Creating customer group: ${groupInfo.id}`)
      await customerModuleService.createCustomerGroups({
        id: groupInfo.id,
        name: groupInfo.name,
        metadata: {
          role: groupInfo.role,
          description: groupInfo.description,
        },
      })
    }
  }

  /**
   * Get customer's role based on their group membership
   */
  async getCustomerRole(customerId: string, container: any): Promise<CustomerRole> {
    try {
      const customerModuleService = container.resolve(Modules.CUSTOMER)

      const customer = await customerModuleService.retrieveCustomer(customerId, {
        relations: ["groups"],
      })

      this.logger.info(`[CUSTOMER-ROLES] Customer ${customerId} groups: ${JSON.stringify(customer.groups?.map((g: any) => ({ id: g.id, name: g.name })) || [])}`)

      if (!customer.groups || customer.groups.length === 0) {
        // Check metadata for role as fallback
        if (customer.metadata?.pricing_role) {
          this.logger.info(`[CUSTOMER-ROLES] Using metadata role: ${customer.metadata.pricing_role}`)
          return customer.metadata.pricing_role as CustomerRole
        }
        return DEFAULT_CUSTOMER_ROLE
      }

      // Check group membership in priority order: VIP > Bulk > Supplier > Retail
      for (const role of [CUSTOMER_ROLES.VIP, CUSTOMER_ROLES.BULK, CUSTOMER_ROLES.SUPPLIER]) {
        const groupId = CUSTOMER_GROUP_IDS[role.toUpperCase() as keyof typeof CUSTOMER_GROUP_IDS]
        this.logger.info(`[CUSTOMER-ROLES] Checking for group ${groupId} (role: ${role})`)
        if (customer.groups.some((g: any) => g.id === groupId)) {
          this.logger.info(`[CUSTOMER-ROLES] Found matching group for role: ${role}`)
          return role
        }
      }

      // Fallback to metadata if no group match
      if (customer.metadata?.pricing_role) {
        this.logger.info(`[CUSTOMER-ROLES] Fallback to metadata role: ${customer.metadata.pricing_role}`)
        return customer.metadata.pricing_role as CustomerRole
      }

      return DEFAULT_CUSTOMER_ROLE
    } catch (error) {
      this.logger.error(
        `[CUSTOMER-ROLES] Failed to get role for customer ${customerId}:`,
        error
      )
      return DEFAULT_CUSTOMER_ROLE
    }
  }

  /**
   * Assign a role to a customer
   */
  async assignRole(
    customerId: string,
    role: CustomerRole,
    container: any
  ): Promise<void> {
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const groupInfo = CUSTOMER_GROUPS[role]

    if (!groupInfo) {
      throw new Error(`Invalid role: ${role}`)
    }

    try {
      // First, ensure the group exists
      await this.ensureGroupExists(customerModuleService, groupInfo)

      // Remove from all other pricing groups
      await this.removeFromAllPricingGroups(customerId, container)

      // Add to the new group
      await customerModuleService.addCustomerToGroup({
        customer_id: customerId,
        customer_group_id: groupInfo.id,
      })

      // Update customer metadata with role
      await customerModuleService.updateCustomers(customerId, {
        metadata: {
          pricing_role: role,
        },
      })

      this.logger.info(
        `[CUSTOMER-ROLES] Assigned role "${role}" to customer ${customerId}`
      )
    } catch (error) {
      this.logger.error(
        `[CUSTOMER-ROLES] Failed to assign role "${role}" to customer ${customerId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Remove customer from all pricing groups
   */
  async removeFromAllPricingGroups(customerId: string, container: any): Promise<void> {
    const customerModuleService = container.resolve(Modules.CUSTOMER)

    for (const groupInfo of Object.values(CUSTOMER_GROUPS)) {
      try {
        await customerModuleService.removeCustomerFromGroup({
          customer_id: customerId,
          customer_group_id: groupInfo.id,
        })
      } catch {
        // Ignore errors - customer might not be in this group
      }
    }
  }

  /**
   * Get all available roles
   */
  getAvailableRoles(): CustomerGroupInfo[] {
    return Object.values(CUSTOMER_GROUPS)
  }

  /**
   * Get role info by role slug
   */
  getRoleInfo(role: CustomerRole): CustomerGroupInfo | null {
    return CUSTOMER_GROUPS[role] || null
  }

  /**
   * Get customer group ID for a role
   */
  getGroupIdForRole(role: CustomerRole): string {
    const groupInfo = CUSTOMER_GROUPS[role]
    return groupInfo?.id || CUSTOMER_GROUP_IDS.RETAIL
  }

  /**
   * Get the Medusa price list ID for a role.
   * Returns null for RETAIL since retail uses the variant default price.
   */
  getPriceListIdForRole(role: CustomerRole): string | null {
    if (role === CUSTOMER_ROLES.RETAIL) return null
    const info = PRICE_LISTS[role as PricedRole]
    return info?.id ?? null
  }

  /**
   * Initialize all role-based price lists (BULK / VIP / SUPPLIER).
   * Idempotent: skips lists that already exist. Safe to call on every startup.
   */
  async initializePriceLists(container: any): Promise<void> {
    const pricingModuleService = container.resolve(Modules.PRICING)

    for (const info of Object.values(PRICE_LISTS)) {
      try {
        await this.ensurePriceListExists(pricingModuleService, info)
        this.logger.info(
          `[CUSTOMER-ROLES] Price list "${info.title}" initialized`
        )
      } catch (error) {
        this.logger.error(
          `[CUSTOMER-ROLES] Failed to initialize price list "${info.title}":`,
          error as Error
        )
      }
    }
  }

  /**
   * Ensure a single price list exists, create it if missing.
   * Lazy-creation friendly — call from anywhere before writing prices.
   */
  async ensurePriceListExists(
    pricingModuleService: any,
    info: PriceListInfo
  ): Promise<void> {
    try {
      await pricingModuleService.retrievePriceList(info.id)
    } catch {
      this.logger.info(`[CUSTOMER-ROLES] Creating price list: ${info.id}`)
      await pricingModuleService.createPriceLists([
        {
          id: info.id,
          title: info.title,
          description: info.description,
          type: "override",
          status: "active",
          rules: {
            customer_group_id: [info.customerGroupId],
          },
        },
      ])
    }
  }

  /**
   * Ensure the price list for a given role exists. Returns the price list ID,
   * or null for roles that use the default product price (retail).
   */
  async ensurePriceListForRole(
    role: CustomerRole,
    container: any
  ): Promise<string | null> {
    if (role === CUSTOMER_ROLES.RETAIL) return null
    const info = PRICE_LISTS[role as PricedRole]
    if (!info) return null

    const pricingModuleService = container.resolve(Modules.PRICING)
    await this.ensurePriceListExists(pricingModuleService, info)
    return info.id
  }
}

export default CustomerRolesService
