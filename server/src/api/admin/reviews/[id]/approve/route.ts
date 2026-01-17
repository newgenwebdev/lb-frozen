import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../../../modules/review"
import type ReviewModuleService from "../../../../../modules/review/services/review"

/**
 * POST /admin/reviews/:id/approve
 * Approve a review (make it visible)
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  try {
    const review = await reviewService.updateReview({
      id,
      is_approved: true,
    })
    res.json({ review, message: "Review approved successfully" })
  } catch {
    res.status(404).json({ message: "Review not found" })
  }
}
