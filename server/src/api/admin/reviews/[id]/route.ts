import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../../modules/review"
import type ReviewModuleService from "../../../../modules/review/services/review"
import { z } from "zod"

const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).nullable().optional(),
  content: z.string().max(5000).nullable().optional(),
  is_approved: z.boolean().optional(),
  is_featured: z.boolean().optional(),
})

/**
 * GET /admin/reviews/:id
 * Get single review by ID
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  try {
    const review = await reviewService.getReviewById(id)
    res.json({ review })
  } catch {
    res.status(404).json({ message: "Review not found" })
  }
}

/**
 * PUT /admin/reviews/:id
 * Update a review
 */
export const PUT = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  const parseResult = UpdateReviewSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.issues,
    })
    return
  }

  try {
    const review = await reviewService.updateReview({
      id,
      ...parseResult.data,
    })
    res.json({ review, message: "Review updated successfully" })
  } catch {
    res.status(404).json({ message: "Review not found" })
  }
}

/**
 * DELETE /admin/reviews/:id
 * Delete a review
 */
export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { id } = req.params
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  try {
    await reviewService.deleteReviewById(id)
    res.json({ message: "Review deleted successfully" })
  } catch {
    res.status(404).json({ message: "Review not found" })
  }
}
