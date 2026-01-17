import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../modules/review"
import type ReviewModuleService from "../../../modules/review/services/review"
import { getVerifiedCustomerId } from "../../../utils/store-auth"
import { z } from "zod"

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  product_id: z.string().optional(),
  customer_id: z.string().optional(),
})

const CreateGuestReviewSchema = z.object({
  product_id: z.string().min(1, "Product ID is required"),
  guest_name: z.string().min(1, "Name is required").max(100),
  guest_email: z.string().email("Valid email is required"),
  guest_phone: z.string().min(8, "Valid phone number is required").max(20).optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional().nullable(),
  content: z.string().min(10, "Review must be at least 10 characters").max(5000),
  images: z.array(z.string().url()).max(5).optional().default([]),
})

/**
 * GET /store/reviews
 * List reviews (public endpoint)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  const queryResult = ListQuerySchema.safeParse(req.query)
  const query = queryResult.success ? queryResult.data : { limit: 20, offset: 0 }

  const { reviews, count } = await reviewService.listReviewsWithFilters(
    {
      product_id: query.product_id,
      customer_id: query.customer_id,
      is_approved: true, // Only approved reviews
    },
    {
      skip: query.offset,
      take: query.limit,
      order: { created_at: "DESC" },
    }
  )

  res.json({
    reviews,
    count,
    limit: query.limit,
    offset: query.offset,
  })
}

/**
 * POST /store/reviews
 * Create a guest review (no authentication required)
 * For logged-in users with verified purchase, use /store/customer/reviews
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  // Check if user is authenticated - if so, redirect to customer review endpoint
  const customerId = getVerifiedCustomerId(req)
  if (customerId) {
    res.status(400).json({
      message: "Authenticated users should use /store/customer/reviews endpoint for verified purchase reviews",
    })
    return
  }

  // Validate request body
  const parseResult = CreateGuestReviewSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.issues,
    })
    return
  }

  const data = parseResult.data

  // Check if guest has already reviewed this product (by email)
  const hasReviewed = await reviewService.hasGuestReviewed(data.product_id, data.guest_email)
  if (hasReviewed) {
    res.status(400).json({ 
      message: "You have already reviewed this product with this email address" 
    })
    return
  }

  // Create the guest review
  // Guest reviews require approval before being shown
  const review = await reviewService.createReview({
    product_id: data.product_id,
    customer_id: null,
    guest_name: data.guest_name,
    guest_email: data.guest_email,
    guest_phone: data.guest_phone || null,
    rating: data.rating,
    title: data.title || null,
    content: data.content,
    images: data.images || [],
    is_verified_purchase: false, // Guest reviews are not verified purchases
    is_guest_review: true,
    is_approved: false, // Guest reviews need moderation
  })

  res.status(201).json({
    review,
    message: "Review submitted successfully. It will be visible after moderation.",
  })
}

/**
 * OPTIONS /store/reviews
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
