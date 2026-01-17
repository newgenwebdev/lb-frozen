import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../modules/review"
import type ReviewModuleService from "../../../modules/review/services/review"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  product_id: z.string().optional(),
  customer_id: z.string().optional(),
  is_approved: z.string().optional().transform(v => v === undefined ? undefined : v === "true"),
  is_featured: z.string().optional().transform(v => v === undefined ? undefined : v === "true"),
  is_guest_review: z.string().optional().transform(v => v === undefined ? undefined : v === "true"),
})

/**
 * GET /admin/reviews
 * List all reviews with filters (for admin management)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)
  const productService = req.scope.resolve(Modules.PRODUCT)
  const customerService = req.scope.resolve(Modules.CUSTOMER)

  const parseResult = ListQuerySchema.safeParse(req.query)
  
  console.log("Admin reviews raw query:", JSON.stringify(req.query))
  console.log("Admin reviews parse success:", parseResult.success)
  if (!parseResult.success) {
    console.log("Admin reviews parse error:", JSON.stringify(parseResult.error.issues))
  }
  
  const query = parseResult.success ? parseResult.data : { limit: 20, offset: 0 }
  console.log("Admin reviews parsed query:", JSON.stringify(query))

  const filters: Record<string, unknown> = {}
  if (query.product_id) filters.product_id = query.product_id
  if (query.customer_id) filters.customer_id = query.customer_id
  if (query.is_approved !== undefined) filters.is_approved = query.is_approved
  if (query.is_featured !== undefined) filters.is_featured = query.is_featured
  if (query.is_guest_review !== undefined) filters.is_guest_review = query.is_guest_review

  console.log("Admin reviews query filters:", JSON.stringify(filters))

  const { reviews, count } = await reviewService.listReviewsWithFilters(
    filters as { product_id?: string; customer_id?: string; is_approved?: boolean; is_featured?: boolean; is_guest_review?: boolean },
    {
      skip: query.offset,
      take: query.limit,
      order: { created_at: "DESC" },
    }
  )

  // Enrich with product and customer data
  const enrichedReviews = await Promise.all(
    reviews.map(async (review) => {
      let product = null
      let customer = null

      try {
        if (review.product_id) {
          const products = await productService.listProducts(
            { id: review.product_id },
            { select: ["id", "title", "handle", "thumbnail"] }
          )
          product = products[0] || null
        }
      } catch {
        // Product might not exist
      }

      try {
        if (review.customer_id) {
          const customers = await customerService.listCustomers(
            { id: review.customer_id },
            { select: ["id", "email", "first_name", "last_name"] }
          )
          customer = customers[0] || null
        }
      } catch {
        // Customer might not exist
      }

      return {
        ...review,
        product,
        customer,
      }
    })
  )

  res.json({
    reviews: enrichedReviews,
    count,
    limit: query.limit,
    offset: query.offset,
  })
}
