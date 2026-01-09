import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../../modules/promo"
import type PromoModuleService from "../../../../../modules/promo/services/promo"
import { UpdatePWPRuleSchema } from "../../schemas"

/**
 * GET /admin/promos/pwp-rules/:id
 * Get a single PWP rule by ID
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
    const rule = await promoService.retrievePWPRule(id)
    res.json({ pwp_rule: rule })
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `PWP rule with id ${id} not found`
    )
  }
}

/**
 * POST /admin/promos/pwp-rules/:id
 * Update a PWP rule
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
  const result = UpdatePWPRuleSchema.safeParse(req.body)
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message)
  }

  const data = result.data

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.rule_description !== undefined) updateData.rule_description = data.rule_description
  if (data.trigger_type !== undefined) updateData.trigger_type = data.trigger_type
  if (data.trigger_product_id !== undefined) updateData.trigger_product_id = data.trigger_product_id
  if (data.trigger_cart_value !== undefined) updateData.trigger_cart_value = data.trigger_cart_value
  if (data.reward_product_id !== undefined) updateData.reward_product_id = data.reward_product_id
  if (data.reward_type !== undefined) updateData.reward_type = data.reward_type
  if (data.reward_value !== undefined) updateData.reward_value = data.reward_value
  if (data.status !== undefined) updateData.status = data.status
  if (data.starts_at !== undefined) updateData.starts_at = data.starts_at ? new Date(data.starts_at) : null
  if (data.ends_at !== undefined) updateData.ends_at = data.ends_at ? new Date(data.ends_at) : null
  if (data.usage_limit !== undefined) updateData.usage_limit = data.usage_limit
  if (data.metadata !== undefined) updateData.metadata = data.metadata

  // Update PWP rule
  const rule = await promoService.updatePWPRule(id, updateData)

  res.json({ pwp_rule: rule })
}

/**
 * DELETE /admin/promos/pwp-rules/:id
 * Delete a PWP rule (soft delete)
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

  await promoService.deletePWPRule(id)

  res.status(200).json({ id, deleted: true })
}

/**
 * OPTIONS /admin/promos/pwp-rules/:id
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
