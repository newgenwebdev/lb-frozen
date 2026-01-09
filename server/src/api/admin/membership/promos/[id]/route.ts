import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { MEMBERSHIP_PROMO_MODULE } from "../../../../../modules/membership-promo"
import { withAdminAuth } from "../../../../../utils/admin-auth"

/**
 * GET /admin/membership/promos/:id
 * Get a specific membership promo by ID
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const promoId = req.params.id
  const promoService = req.scope.resolve(MEMBERSHIP_PROMO_MODULE) as any

  try {
    const promo = await promoService.getPromoById(promoId)

    if (!promo) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Membership promo ${promoId} not found`
      )
    }

    res.json({
      promo: {
        id: promo.id,
        name: promo.name,
        description: promo.description,
        start_date: promo.start_date,
        end_date: promo.end_date,
        status: promo.status,
        discount_type: promo.discount_type,
        discount_value: Number(promo.discount_value),
        minimum_purchase: promo.minimum_purchase ? Number(promo.minimum_purchase) : null,
        created_at: promo.created_at,
        updated_at: promo.updated_at,
      },
    })
  } catch (error: any) {
    if (error.type === MedusaError.Types.NOT_FOUND) {
      throw error
    }
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Membership promo ${promoId} not found`
    )
  }
})

/**
 * PUT /admin/membership/promos/:id
 * Update a membership promo
 * Requires admin authentication
 */
export const PUT = withAdminAuth(async (req, res) => {
  const promoId = req.params.id
  const promoService = req.scope.resolve(MEMBERSHIP_PROMO_MODULE) as any

  const {
    name,
    description,
    start_date,
    end_date,
    status,
    discount_type,
    discount_value,
    minimum_purchase,
  } = req.body as {
    name?: string
    description?: string
    start_date?: string
    end_date?: string
    status?: "active" | "non-active"
    discount_type?: "percentage" | "fixed"
    discount_value?: number
    minimum_purchase?: number
  }

  const updateData: Record<string, any> = { id: promoId }

  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (start_date !== undefined) updateData.start_date = new Date(start_date)
  if (end_date !== undefined) updateData.end_date = new Date(end_date)
  if (status !== undefined) updateData.status = status
  if (discount_type !== undefined) updateData.discount_type = discount_type
  if (discount_value !== undefined) updateData.discount_value = discount_value
  if (minimum_purchase !== undefined) updateData.minimum_purchase = minimum_purchase

  try {
    const promo = await promoService.updatePromo(updateData)

    res.json({
      promo: {
        id: promo.id,
        name: promo.name,
        description: promo.description,
        start_date: promo.start_date,
        end_date: promo.end_date,
        status: promo.status,
        discount_type: promo.discount_type,
        discount_value: Number(promo.discount_value),
        minimum_purchase: promo.minimum_purchase ? Number(promo.minimum_purchase) : null,
        created_at: promo.created_at,
        updated_at: promo.updated_at,
      },
    })
  } catch (error: any) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Membership promo ${promoId} not found`
    )
  }
})

/**
 * DELETE /admin/membership/promos/:id
 * Delete a membership promo (soft delete)
 * Requires admin authentication
 */
export const DELETE = withAdminAuth(async (req, res) => {
  const promoId = req.params.id
  const promoService = req.scope.resolve(MEMBERSHIP_PROMO_MODULE) as any

  try {
    await promoService.deletePromo(promoId)

    res.status(200).json({
      id: promoId,
      deleted: true,
    })
  } catch (error: any) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Membership promo ${promoId} not found`
    )
  }
})

/**
 * PATCH /admin/membership/promos/:id
 * Toggle promo status
 * Requires admin authentication
 */
export const PATCH = withAdminAuth(async (req, res) => {
  const promoId = req.params.id
  const promoService = req.scope.resolve(MEMBERSHIP_PROMO_MODULE) as any

  const { status } = req.body as { status: "active" | "non-active" }

  if (!status || !["active", "non-active"].includes(status)) {
    res.status(400).json({
      message: "Invalid status. Must be 'active' or 'non-active'",
    })
    return
  }

  try {
    const promo = await promoService.togglePromoStatus(promoId, status)

    res.json({
      promo: {
        id: promo.id,
        name: promo.name,
        description: promo.description,
        start_date: promo.start_date,
        end_date: promo.end_date,
        status: promo.status,
        discount_type: promo.discount_type,
        discount_value: Number(promo.discount_value),
        minimum_purchase: promo.minimum_purchase ? Number(promo.minimum_purchase) : null,
        created_at: promo.created_at,
        updated_at: promo.updated_at,
      },
    })
  } catch (error: any) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Membership promo ${promoId} not found`
    )
  }
})
