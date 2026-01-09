import { MedusaService } from "@medusajs/framework/utils"
import MembershipConfig from "../models/membership-config"

class MembershipConfigModuleService extends MedusaService({
  MembershipConfig,
}) {
  /**
   * Get the global membership configuration
   * Creates a default config if none exists
   */
  async getConfig(): Promise<any> {
    const configs = await this.listMembershipConfigs({}, { take: 1 })

    if (!configs || configs.length === 0) {
      // Create default config
      return this.createMembershipConfigs({
        program_type: "free",
        price: 0,
        duration_months: null,
        evaluation_period_months: 12,
        evaluation_trigger: "both",
        auto_enroll_on_first_order: true,
        is_enabled: true,
      })
    }

    return configs[0]
  }

  /**
   * Update the global membership configuration
   */
  async updateConfig(data: {
    program_type?: "free" | "paid"
    price?: number
    duration_months?: number | null
    evaluation_period_months?: number
    evaluation_trigger?: "on_order" | "daily" | "both"
    auto_enroll_on_first_order?: boolean
    is_enabled?: boolean
  }): Promise<any> {
    const config = await this.getConfig()

    return this.updateMembershipConfigs({
      id: config.id,
      ...data,
    })
  }

  /**
   * Check if membership program is enabled
   */
  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig()
    return config.is_enabled
  }

  /**
   * Check if program is free (auto-enroll all customers)
   */
  async isFreeProgram(): Promise<boolean> {
    const config = await this.getConfig()
    return config.program_type === "free"
  }

  /**
   * Get the evaluation period in months
   */
  async getEvaluationPeriod(): Promise<number> {
    const config = await this.getConfig()
    return config.evaluation_period_months
  }

  /**
   * Check if should evaluate on order
   */
  async shouldEvaluateOnOrder(): Promise<boolean> {
    const config = await this.getConfig()
    return config.evaluation_trigger === "on_order" || config.evaluation_trigger === "both"
  }

  /**
   * Check if should run daily evaluation job
   */
  async shouldEvaluateDaily(): Promise<boolean> {
    const config = await this.getConfig()
    return config.evaluation_trigger === "daily" || config.evaluation_trigger === "both"
  }
}

export default MembershipConfigModuleService
