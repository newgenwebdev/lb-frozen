import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../modules/promo"
import type PromoModuleService from "../../../../modules/promo/services/promo"
import { CreatePWPRuleSchema, ListQuerySchema } from "../schemas"

/**
 * GET /admin/promos/pwp-rules
 * List all PWP rules with pagination and filtering
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

  const promoService = req.scope.resolve<PromoModuleService>(PROMO_MODULE)

  // Parse query params
  const queryResult = ListQuerySchema.safeParse(req.query)
  if (!queryResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      queryResult.error.message
    )
  }

  const { limit, offset, status, q } = queryResult.data

  // Build filters
  const filters: Record<string, unknown> = {}
  if (status) {
    filters.status = status
  }

  // Get PWP rules
  const [rules, count] = await Promise.all([
    promoService.listPWPRules(filters, {
      skip: offset,
      take: limit,
      order: { created_at: "DESC" },
    }),
    promoService.listPWPRules(filters, {}),
  ])

  // Filter by search query if provided
  let filteredRules = rules
  if (q) {
    const searchLower = q.toLowerCase()
    filteredRules = rules.filter(
      (r) =>
        r.name.toLowerCase().includes(searchLower) ||
        r.rule_description.toLowerCase().includes(searchLower)
    )
  }

  res.json({
    pwp_rules: filteredRules,
    count: count.length,
    limit,
    offset,
  })
}

/**
 * POST /admin/promos/pwp-rules
 * Create a new PWP rule
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

  const promoService = req.scope.resolve<PromoModuleService>(PROMO_MODULE)

  // Validate request body
  const result = CreatePWPRuleSchema.safeParse(req.body)
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message)
  }

  const data = result.data

  // Create PWP rule
  const rule = await promoService.createPWPRule({
    name: data.name,
    rule_description: data.rule_description,
    trigger_type: data.trigger_type,
    trigger_product_id: data.trigger_product_id,
    trigger_cart_value: data.trigger_cart_value,
    reward_product_id: data.reward_product_id,
    reward_type: data.reward_type,
    reward_value: data.reward_value,
    status: data.status,
    starts_at: data.starts_at ? new Date(data.starts_at) : null,
    ends_at: data.ends_at ? new Date(data.ends_at) : null,
    usage_limit: data.usage_limit,
    metadata: data.metadata,
  })

  res.status(201).json({ pwp_rule: rule })
}

/**
 * OPTIONS /admin/promos/pwp-rules
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
