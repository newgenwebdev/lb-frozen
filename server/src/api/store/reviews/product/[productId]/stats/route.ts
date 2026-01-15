import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../../../../modules/review"
import type ReviewModuleService from "../../../../../../modules/review/services/review"

/**
 * GET /store/reviews/product/:productId/stats
 * Get rating stats for a specific product (no reviews list, just stats)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { productId } = req.params
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  const stats = await reviewService.getProductRatingStats(productId)

  res.json({
    product_id: productId,
    average_rating: stats.average_rating,
    total_reviews: stats.total_reviews,
    rating_breakdown: stats.rating_breakdown,
  })
}

/**
 * OPTIONS /store/reviews/product/:productId/stats
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
