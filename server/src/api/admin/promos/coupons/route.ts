import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PROMO_MODULE } from "../../../../modules/promo"
import type PromoModuleService from "../../../../modules/promo/services/promo"
import { CreateCouponSchema, ListQuerySchema } from "../schemas"

/**
 * GET /admin/promos/coupons
 * List all coupons with pagination and filtering
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

  const { limit, offset, status, type, q } = queryResult.data

  // Build filters
  const filters: Record<string, unknown> = {}
  if (status) {
    filters.status = status
  }
  if (type) {
    filters.type = type
  }

  // Get coupons
  const [coupons, count] = await Promise.all([
    promoService.listCoupons(filters, {
      skip: offset,
      take: limit,
      order: { created_at: "DESC" },
    }),
    promoService.listCoupons(filters, {}),
  ])

  // Filter by search query if provided
  let filteredCoupons = coupons
  if (q) {
    const searchLower = q.toLowerCase()
    filteredCoupons = coupons.filter(
      (c) =>
        c.code.toLowerCase().includes(searchLower) ||
        c.name.toLowerCase().includes(searchLower)
    )
  }

  res.json({
    coupons: filteredCoupons,
    count: count.length,
    limit,
    offset,
  })
}

/**
 * POST /admin/promos/coupons
 * Create a new coupon
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
  const result = CreateCouponSchema.safeParse(req.body)
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message)
  }

  const data = result.data

  // Create coupon
  const coupon = await promoService.createCoupon({
    code: data.code,
    name: data.name,
    type: data.type,
    value: data.value,
    currency_code: data.currency_code,
    status: data.status,
    starts_at: data.starts_at ? new Date(data.starts_at) : null,
    ends_at: data.ends_at ? new Date(data.ends_at) : null,
    usage_limit: data.usage_limit,
    metadata: data.metadata,
  })

  res.status(201).json({ coupon })
}

/**
 * OPTIONS /admin/promos/coupons
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
