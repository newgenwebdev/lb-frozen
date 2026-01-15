import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { REVIEW_MODULE } from "../../../../modules/review"
import { ORDER_EXTENSION_MODULE } from "../../../../modules/order-extension"
import type ReviewModuleService from "../../../../modules/review/services/review"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"
import { z } from "zod"

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

const CreateReviewSchema = z.object({
  product_id: z.string().min(1, "Product ID is required"),
  order_id: z.string().min(1, "Order ID is required"), // Required - must have purchased
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional().nullable(),
  content: z.string().max(5000).optional().nullable(),
  images: z.array(z.string().url()).max(5).optional().default([]),
})

/**
 * GET /store/customer/reviews
 * Get current customer's reviews
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

  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)

  const queryResult = ListQuerySchema.safeParse(req.query)
  const query = queryResult.success ? queryResult.data : { limit: 20, offset: 0 }

  const { reviews, count } = await reviewService.getCustomerReviews(customerId, {
    skip: query.offset,
    take: query.limit,
  })

  res.json({
    reviews,
    count,
    limit: query.limit,
    offset: query.offset,
  })
}

/**
 * POST /store/customer/reviews
 * Create a new review (customer must be authenticated)
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

  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)
  const orderModule = req.scope.resolve(Modules.ORDER)
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any

  // Validate request body
  const parseResult = CreateReviewSchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parseResult.error.issues,
    })
    return
  }

  const data = parseResult.data

  // Verify the order exists and belongs to customer
  let order: any
  try {
    order = await orderModule.retrieveOrder(data.order_id, {
      relations: ["items"],
    })
  } catch (error) {
    res.status(404).json({ message: "Order not found" })
    return
  }

  // Check order belongs to customer
  if (order.customer_id !== customerId) {
    res.status(403).json({ message: "This order does not belong to you" })
    return
  }

  // Get fulfillment status from order extension
  const orderExtensions = await orderExtensionService.listOrderExtensions({ 
    order_id: [data.order_id] 
  })
  const extension = orderExtensions[0]
  const fulfillmentStatus = extension?.fulfillment_status || "not_fulfilled"

  // Check fulfillment status - must be completed/delivered/shipped
  const allowedFulfillmentStatuses = ["completed", "delivered", "shipped", "fulfilled"]
  const allowedOrderStatuses = ["completed", "archived"]
  
  const canReview = allowedFulfillmentStatuses.includes(fulfillmentStatus) || 
                    allowedOrderStatuses.includes(order.status)
  
  if (!canReview) {
    res.status(400).json({ 
      message: "You can only review products from completed orders",
      order_status: order.status,
      fulfillment_status: fulfillmentStatus
    })
    return
  }

  // Check if product is in this order
  // Order items may have product_id directly or we need to look up via variant_id
  const productModule = req.scope.resolve(Modules.PRODUCT)
  
  let orderItem = order.items?.find((item: any) => item.product_id === data.product_id)
  
  // If not found directly, check via variant_id
  if (!orderItem) {
    // Get all variant IDs from order
    const variantIds = order.items?.map((item: any) => item.variant_id).filter(Boolean) || []
    
    if (variantIds.length > 0) {
      try {
        // Fetch variants to get their product_ids
        const variants = await productModule.listProductVariants(
          { id: variantIds },
          { select: ["id", "product_id"] }
        )
        
        // Find the variant that belongs to the requested product
        const matchingVariant = variants.find((v: any) => v.product_id === data.product_id)
        
        if (matchingVariant) {
          // Find the order item with this variant
          orderItem = order.items?.find((item: any) => item.variant_id === matchingVariant.id)
        }
      } catch (err) {
        console.error("Error fetching variants:", err)
      }
    }
  }
  
  if (!orderItem) {
    res.status(400).json({ message: "This product is not in the specified order" })
    return
  }

  // Check if customer already reviewed this product
  const hasReviewed = await reviewService.hasCustomerReviewed(data.product_id, customerId)
  if (hasReviewed) {
    res.status(400).json({ message: "You have already reviewed this product" })
    return
  }

  // Create the review - verified purchase since we validated order
  const review = await reviewService.createReview({
    product_id: data.product_id,
    customer_id: customerId,
    order_id: order.id,
    order_item_id: orderItem.id,
    rating: data.rating,
    title: data.title || null,
    content: data.content || null,
    images: data.images && data.images.length > 0 ? data.images : [],
    is_verified_purchase: true, // Always true since we require order
    is_approved: true,
  })

  res.status(201).json({
    review,
    message: "Review created successfully",
  })
}

/**
 * OPTIONS /store/customer/reviews
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
