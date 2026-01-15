import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../../../../modules/review"
import type ReviewModuleService from "../../../../../../modules/review/services/review"
import { getVerifiedCustomerId } from "../../../../../../utils/store-auth"

/**
 * GET /store/customer/reviews/product/:productId
 * Check if customer has reviewed this product, and get their review if exists
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const customerId = getVerifiedCustomerId(req)
  
  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const { productId } = req.params
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  const review = await reviewService.getCustomerProductReview(productId, customerId)

  res.json({
    has_reviewed: !!review,
    review: review || null,
  })
}

/**
 * OPTIONS /store/customer/reviews/product/:productId
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
