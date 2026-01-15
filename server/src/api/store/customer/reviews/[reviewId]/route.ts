import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../../../modules/review"
import type ReviewModuleService from "../../../../../modules/review/services/review"
import { getVerifiedCustomerId } from "../../../../../utils/store-auth"
import { z } from "zod"

const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional().nullable(),
  content: z.string().max(5000).optional().nullable(),
  images: z.array(z.string().url()).max(5).optional(),
})

/**
 * GET /store/customer/reviews/:reviewId
 * Get a specific review by ID (must be owned by customer)
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

  const { reviewId } = req.params
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  try {
    const review = await reviewService.getReviewById(reviewId)
    
    if (review.customer_id !== customerId) {
      res.status(403).json({ message: "You don't have permission to access this review" })
      return
    }

    res.json({ review })
  } catch (error) {
    res.status(404).json({ message: "Review not found" })
  }
}

/**
 * PUT /store/customer/reviews/:reviewId
 * Update a review (must be owned by customer)
 */
export const PUT = async (
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

  // Get existing review
  let existingReview: any
  try {
    existingReview = await reviewService.getReviewById(reviewId)
  } catch (error) {
    res.status(404).json({ message: "Review not found" })
    return
  }

  // Verify ownership
  if (existingReview.customer_id !== customerId) {
    res.status(403).json({ message: "You don't have permission to update this review" })
    return
  }

  // Validate request body
  const parseResult = UpdateReviewSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.issues,
    })
    return
  }

  const data = parseResult.data

  // Update the review
  const review = await reviewService.updateReview({
    id: reviewId,
    rating: data.rating,
    title: data.title,
    content: data.content,
    images: data.images,
  })

  res.json({
    review,
    message: "Review updated successfully",
  })
}

/**
 * DELETE /store/customer/reviews/:reviewId
 * Delete a review (must be owned by customer)
 */
export const DELETE = async (
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

  // Get existing review
  let existingReview: any
  try {
    existingReview = await reviewService.getReviewById(reviewId)
  } catch (error) {
    res.status(404).json({ message: "Review not found" })
    return
  }

  // Verify ownership
  if (existingReview.customer_id !== customerId) {
    res.status(403).json({ message: "You don't have permission to delete this review" })
    return
  }

  // Delete the review
  await reviewService.deleteReviewById(reviewId)

  res.json({
    message: "Review deleted successfully",
  })
}

/**
 * OPTIONS /store/customer/reviews/:reviewId
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
