import type { MedusaResponse } from "@medusajs/framework/http"
import { MEMBERSHIP_PROMO_MODULE } from "../../../../modules/membership-promo"
import { withAdminAuth } from "../../../../utils/admin-auth"

/**
 * GET /admin/membership/promos
 * List all membership promos with pagination
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const promoService = req.scope.resolve(MEMBERSHIP_PROMO_MODULE) as any

  // Get pagination params with bounds checking
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100)
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)
  const status = req.query.status as "active" | "non-active" | undefined

  const [promos, count] = await promoService.listPromos({
    limit,
    offset,
    status,
  })

  // Format promos for response
  const formattedPromos = promos.map((promo: any) => ({
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
  }))

  res.json({
    promos: formattedPromos,
    count,
    limit,
    offset,
  })
})

/**
 * POST /admin/membership/promos
 * Create a new membership promo
 * Requires admin authentication
 */
export const POST = withAdminAuth(async (req, res) => {
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
    name: string
    description?: string
    start_date: string
    end_date: string
    status?: "active" | "non-active"
    discount_type?: "percentage" | "fixed"
    discount_value?: number
    minimum_purchase?: number
  }

  // Validate required fields
  if (!name || !start_date || !end_date) {
    res.status(400).json({
      message: "Missing required fields: name, start_date, end_date",
    })
    return
  }

  const promo = await promoService.createPromo({
    name,
    description,
    start_date: new Date(start_date),
    end_date: new Date(end_date),
    status,
    discount_type,
    discount_value,
    minimum_purchase,
  })

  res.status(201).json({
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
})
