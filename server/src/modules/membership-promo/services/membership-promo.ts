import { MedusaService } from "@medusajs/framework/utils"
import MembershipPromo from "../models/membership-promo"

type CreateMembershipPromoInput = {
  name: string
  description?: string
  start_date: Date
  end_date: Date
  status?: "active" | "non-active"
  discount_type?: "percentage" | "fixed"
  discount_value?: number
  minimum_purchase?: number
}

type UpdateMembershipPromoInput = {
  id: string
  name?: string
  description?: string
  start_date?: Date
  end_date?: Date
  status?: "active" | "non-active"
  discount_type?: "percentage" | "fixed"
  discount_value?: number
  minimum_purchase?: number
}

/**
 * MembershipPromoModuleService
 * Handles membership promo CRUD operations
 *
 * IMPORTANT: The service class name must NOT match the pattern {ModelName}Service
 * (e.g., MembershipPromoService) because it would conflict with the internal service
 * that Medusa auto-generates for each model. Use a different name like
 * MembershipPromoModuleService instead.
 *
 * NOTE: TypeScript infers method names as *Promoes but runtime uses *Promos
 * Use (this as any) to call the correct runtime method names.
 */
class MembershipPromoModuleService extends MedusaService({
  MembershipPromo,
}) {
  /**
   * Create a new membership promo
   */
  async createPromo(data: CreateMembershipPromoInput): Promise<any> {
    // Runtime uses *Promos (not *Promoes as TypeScript suggests)
    const promo = await (this as any).createMembershipPromos({
      name: data.name,
      description: data.description || null,
      start_date: data.start_date,
      end_date: data.end_date,
      status: data.status || "active",
      discount_type: data.discount_type || "percentage",
      discount_value: data.discount_value || 0,
      minimum_purchase: data.minimum_purchase || null,
    })

    return promo
  }

  /**
   * Update an existing membership promo
   */
  async updatePromo(data: UpdateMembershipPromoInput): Promise<any> {
    const updateData: Record<string, any> = {
      id: data.id,
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.start_date !== undefined) updateData.start_date = data.start_date
    if (data.end_date !== undefined) updateData.end_date = data.end_date
    if (data.status !== undefined) updateData.status = data.status
    if (data.discount_type !== undefined) updateData.discount_type = data.discount_type
    if (data.discount_value !== undefined) updateData.discount_value = data.discount_value
    if (data.minimum_purchase !== undefined) updateData.minimum_purchase = data.minimum_purchase

    // Runtime uses *Promos (not *Promoes as TypeScript suggests)
    const promo = await (this as any).updateMembershipPromos(updateData)

    return promo
  }

  /**
   * Get promo by ID
   */
  async getPromoById(id: string): Promise<any> {
    const promo = await this.retrieveMembershipPromo(id)
    return promo
  }

  /**
   * List all promos with pagination
   */
  async listPromos(filters?: {
    limit?: number
    offset?: number
    status?: "active" | "non-active"
  }): Promise<[any[], number]> {
    const queryFilters: Record<string, any> = {}

    if (filters?.status) {
      queryFilters.status = filters.status
    }

    // Runtime uses *Promos (not *Promoes as TypeScript suggests)
    const promos = await (this as any).listMembershipPromos(
      queryFilters,
      {
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
        order: { created_at: "DESC" },
      }
    )

    return [promos, promos.length]
  }

  /**
   * Delete a promo (soft delete)
   */
  async deletePromo(id: string): Promise<void> {
    // Runtime uses *Promos (not *Promoes as TypeScript suggests)
    await (this as any).softDeleteMembershipPromos([id])
  }

  /**
   * Toggle promo status
   */
  async togglePromoStatus(id: string, newStatus: "active" | "non-active"): Promise<any> {
    // Runtime uses *Promos (not *Promoes as TypeScript suggests)
    const promo = await (this as any).updateMembershipPromos({
      id,
      status: newStatus,
    })

    return promo
  }
}

export default MembershipPromoModuleService
