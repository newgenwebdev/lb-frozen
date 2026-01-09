import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PROMO_MODULE } from "../../../modules/promo"
import type PromoModuleService from "../../../modules/promo/services/promo"

/**
 * GET /admin/promos/stats
 * Get promo statistics (total, active, redemptions)
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

  const stats = await promoService.getStats()

  res.json({ stats })
}

/**
 * OPTIONS /admin/promos
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
