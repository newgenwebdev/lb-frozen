import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { REVIEW_MODULE } from "../../../../../modules/review"
import type ReviewModuleService from "../../../../../modules/review/services/review"
import { z } from "zod"

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

/**
 * GET /store/reviews/product/:productId
 * Get all reviews for a specific product
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { productId } = req.params
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  const queryResult = ListQuerySchema.safeParse(req.query)
  const query = queryResult.success ? queryResult.data : { limit: 20, offset: 0 }

  // Get reviews
  const { reviews, count } = await reviewService.getProductReviews(productId, {
    skip: query.offset,
    take: query.limit,
    approvedOnly: true,
  })

  // Get customer info for each review
  const customerIds = [...new Set(reviews.map((r: any) => r.customer_id).filter(Boolean))]
  let customerMap = new Map<string, { first_name: string; last_name: string; avatar_url: string | null }>()
  
  if (customerIds.length > 0) {
    try {
      const customers = await customerModule.listCustomers(
        { id: customerIds },
        { select: ["id", "first_name", "last_name", "metadata"] }
      )
      customerMap = new Map(
        customers.map((c: any) => [c.id, { 
          first_name: c.first_name || "", 
          last_name: c.last_name || "",
          avatar_url: c.metadata?.profile_image || null // Use profile_image from metadata
        }])
      )
    } catch (err) {
      console.error("Error fetching customers:", err)
    }
  }

  // Add customer name and avatar to reviews
  const reviewsWithCustomer = reviews.map((review: any) => {
    const customer = customerMap.get(review.customer_id)
    const firstName = customer?.first_name || ""
    const lastName = customer?.last_name || ""
    const customerName = firstName && lastName 
      ? `${firstName} ${lastName.charAt(0)}.` 
      : firstName || "Customer"
    
    return {
      ...review,
      customer_name: customerName,
      customer_avatar: customer?.avatar_url || null,
    }
  })

  // Get rating stats
  const stats = await reviewService.getProductRatingStats(productId)

  res.json({
    reviews: reviewsWithCustomer,
    count,
    limit: query.limit,
    offset: query.offset,
    stats: {
      average_rating: stats.average_rating,
      total_reviews: stats.total_reviews,
      rating_breakdown: stats.rating_breakdown,
    },
  })
}

/**
 * OPTIONS /store/reviews/product/:productId
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
