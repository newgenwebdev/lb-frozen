import { Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import { MEMBERSHIP_GROUP_ID } from "../../../lib/constants"

type InjectedDependencies = {
  logger: Logger
}

/**
 * GroupManagerService
 * Manages customer group assignments for membership
 */
class GroupManagerService {
  protected logger: Logger

  constructor({ logger }: InjectedDependencies) {
    this.logger = logger
  }

  /**
   * Add customer to Members group
   * Creates the group if it doesn't exist
   */
  async addCustomerToMemberGroup(
    customerId: string,
    container: any
  ): Promise<void> {
    try {
      const customerModuleService = container.resolve(Modules.CUSTOMER)

      // Ensure the Members group exists
      await this.ensureMembersGroupExists(customerModuleService)

      await customerModuleService.addCustomerToGroup({
        customer_id: customerId,
        customer_group_id: MEMBERSHIP_GROUP_ID,
      })

      this.logger.info(`Customer ${customerId} added to Members group`)
    } catch (error) {
      this.logger.error(
        `Failed to add customer ${customerId} to Members group:`,
        error
      )
      throw error
    }
  }

  /**
   * Ensure the Members customer group exists, create if not
   */
  private async ensureMembersGroupExists(
    customerModuleService: any
  ): Promise<void> {
    try {
      // Try to retrieve the group
      await customerModuleService.retrieveCustomerGroup(MEMBERSHIP_GROUP_ID)
    } catch {
      // Group doesn't exist, create it
      this.logger.info(`Creating Members customer group: ${MEMBERSHIP_GROUP_ID}`)
      await customerModuleService.createCustomerGroups({
        id: MEMBERSHIP_GROUP_ID,
        name: "Members",
      })
    }
  }

  /**
   * Remove customer from Members group
   */
  async removeCustomerFromMemberGroup(
    customerId: string,
    container: any
  ): Promise<void> {
    try {
      const customerModuleService = container.resolve(Modules.CUSTOMER)

      await customerModuleService.removeCustomerFromGroup({
        customer_id: customerId,
        customer_group_id: MEMBERSHIP_GROUP_ID,
      })

      this.logger.info(`Customer ${customerId} removed from Members group`)
    } catch (error) {
      this.logger.error(
        `Failed to remove customer ${customerId} from Members group:`,
        error
      )
      throw error
    }
  }

  /**
   * Check if customer is in Members group
   */
  async isCustomerMember(customerId: string, container: any): Promise<boolean> {
    try {
      const customerModuleService = container.resolve(Modules.CUSTOMER)

      const customer = await customerModuleService.retrieveCustomer(customerId, {
        relations: ["groups"],
      })

      return customer.groups?.some(
        (group: any) => group.id === MEMBERSHIP_GROUP_ID
      ) || false
    } catch (error) {
      this.logger.error(
        `Failed to check if customer ${customerId} is member:`,
        error
      )
      return false
    }
  }
}

export default GroupManagerService
