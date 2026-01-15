import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../../../../modules/review"
import type ReviewModuleService from "../../../../../../modules/review/services/review"
import { getVerifiedCustomerId } from "../../../../../../utils/store-auth"

/**
 * POST /store/customer/reviews/:reviewId/helpful
 * Mark a review as helpful (increment helpful_count)
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const { reviewId } = req.params
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  try {
    const review = await reviewService.markReviewHelpful(reviewId)
    
    res.json({
      review,
      message: "Review marked as helpful",
    })
  } catch (error) {
    res.status(404).json({ message: "Review not found" })
  }
}

/**
 * OPTIONS /store/customer/reviews/:reviewId/helpful
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
