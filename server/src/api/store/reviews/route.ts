import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../modules/review"
import type ReviewModuleService from "../../../modules/review/services/review"
import { z } from "zod"

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  product_id: z.string().optional(),
  customer_id: z.string().optional(),
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
 * OPTIONS /store/reviews
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
