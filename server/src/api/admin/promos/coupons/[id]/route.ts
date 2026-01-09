import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../../modules/promo"
import type PromoModuleService from "../../../../../modules/promo/services/promo"
import { UpdateCouponSchema } from "../../schemas"

/**
 * GET /admin/promos/coupons/:id
 * Get a single coupon by ID
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any)
    return
  }

  const { id } = req.params
  const promoService = req.scope.resolve<PromoModuleService>(PROMO_MODULE)

  try {
    const coupon = await promoService.retrieveCoupon(id)
    res.json({ coupon })
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Coupon with id ${id} not found`
    )
  }
}

/**
 * POST /admin/promos/coupons/:id
 * Update a coupon
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any)
    return
  }

  const { id } = req.params
  const promoService = req.scope.resolve<PromoModuleService>(PROMO_MODULE)

  // Validate request body
  const result = UpdateCouponSchema.safeParse(req.body)
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message)
  }

  const data = result.data

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {}

  if (data.code !== undefined) updateData.code = data.code
  if (data.name !== undefined) updateData.name = data.name
  if (data.type !== undefined) updateData.type = data.type
  if (data.value !== undefined) updateData.value = data.value
  if (data.currency_code !== undefined) updateData.currency_code = data.currency_code
  if (data.status !== undefined) updateData.status = data.status
  if (data.starts_at !== undefined) updateData.starts_at = data.starts_at ? new Date(data.starts_at) : null
  if (data.ends_at !== undefined) updateData.ends_at = data.ends_at ? new Date(data.ends_at) : null
  if (data.usage_limit !== undefined) updateData.usage_limit = data.usage_limit
  if (data.metadata !== undefined) updateData.metadata = data.metadata

  // Update coupon
  const coupon = await promoService.updateCoupon(id, updateData)

  res.json({ coupon })
}

/**
 * DELETE /admin/promos/coupons/:id
 * Delete a coupon (soft delete)
 */
export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any)
    return
  }

  const { id } = req.params
  const promoService = req.scope.resolve<PromoModuleService>(PROMO_MODULE)

  await promoService.deleteCoupon(id)

  res.status(200).json({ id, deleted: true })
}

/**
 * OPTIONS /admin/promos/coupons/:id
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
