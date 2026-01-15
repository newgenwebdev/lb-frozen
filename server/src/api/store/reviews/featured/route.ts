import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_MODULE } from "../../../../modules/review"
import type ReviewModuleService from "../../../../modules/review/services/review"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(6),
  photos_only: z.enum(['true', 'false']).optional().default('true'),
})

/**
 * GET /store/reviews/featured
 * Get featured reviews with photos for landing page
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE)
  
  const queryResult = QuerySchema.safeParse(req.query)
  const params = queryResult.success ? queryResult.data : { limit: 6, photos_only: 'true' }
  
  try {
    // Use review service to fetch reviews
    const { reviews: allReviews } = await reviewService.listReviewsWithFilters(
      {}, // No filters to get all reviews
      {
        skip: 0,
        take: 50,
        order: { created_at: "DESC" },
      }
    )

    console.log('[FEATURED REVIEWS] Total reviews found:', allReviews.length)

    // Helper to extract media URLs from review
    const getMediaUrls = (review: any): string[] => {
      if (!review.images) return []
      
      // Handle different formats
      if (Array.isArray(review.images)) {
        return review.images
      }
      if (review.images.items) {
        if (Array.isArray(review.images.items)) {
          return review.images.items
        }
        if (review.images.items.items && Array.isArray(review.images.items.items)) {
          return review.images.items.items
        }
      }
      return []
    }

    // Helper to check if URL is a video
    const isVideo = (url: string): boolean => {
      const lowerUrl = url.toLowerCase()
      return lowerUrl.includes('.mp4') || 
        lowerUrl.includes('.webm') || 
        lowerUrl.includes('.mov') ||
        lowerUrl.includes('.avi')
    }

    // Helper to get only photo URLs (exclude videos)
    const getPhotoUrls = (mediaUrls: string[]): string[] => {
      return mediaUrls.filter(url => !isVideo(url))
    }

    // Filter reviews that have photos (not videos)
    const reviewsWithPhotos = allReviews.filter((review: any) => {
      const allUrls = getMediaUrls(review)
      const photoUrls = getPhotoUrls(allUrls)
      const hasPhotos = photoUrls.length > 0
      if (hasPhotos) {
        console.log(`[FEATURED REVIEWS] Review ${review.id}: has ${photoUrls.length} photos`, photoUrls)
      }
      return hasPhotos
    })

    console.log('[FEATURED REVIEWS] Reviews with photos:', reviewsWithPhotos.length)

    // Get product info for each review
    const productIds = [...new Set(reviewsWithPhotos.map((r: any) => r.product_id).filter(Boolean))]
    const customerIds = [...new Set(reviewsWithPhotos.map((r: any) => r.customer_id).filter(Boolean))]
    
    let productsMap: Record<string, any> = {}
    let customersMap: Record<string, any> = {}
    
    // Fetch products
    if (productIds.length > 0) {
      try {
        const { data: products } = await remoteQuery.graph({
          entity: "product",
          fields: [
            "id",
            "title",
            "handle",
            "thumbnail",
            "variants.id",
            "variants.calculated_price.calculated_amount",
            "variants.calculated_price.currency_code",
          ],
          filters: {
            id: productIds,
          },
        })
        
        productsMap = products.reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p
          return acc
        }, {})
      } catch (err) {
        console.error('[FEATURED REVIEWS] Error fetching products:', err)
      }
    }

    // Fetch customers
    if (customerIds.length > 0) {
      try {
        const { data: customers } = await remoteQuery.graph({
          entity: "customer",
          fields: [
            "id",
            "first_name",
            "last_name",
            "email",
          ],
          filters: {
            id: customerIds,
          },
        })
        
        customersMap = customers.reduce((acc: Record<string, any>, c: any) => {
          acc[c.id] = c
          return acc
        }, {})
        
        console.log('[FEATURED REVIEWS] Found customers:', Object.keys(customersMap).length)
      } catch (err) {
        console.error('[FEATURED REVIEWS] Error fetching customers:', err)
      }
    }

    // Build response
    const filteredReviews = reviewsWithPhotos
      .slice(0, params.limit)
      .map((review: any) => {
        const product = productsMap[review.product_id]
        const customer = customersMap[review.customer_id]
        const allMediaUrls = getMediaUrls(review)
        const photoUrls = getPhotoUrls(allMediaUrls)
        
        // Build customer name from first_name + last_name, fallback to email or "Customer"
        let customerName = 'Customer'
        if (customer) {
          if (customer.first_name || customer.last_name) {
            customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
          } else if (customer.email) {
            customerName = customer.email.split('@')[0]
          }
        }
        
        return {
          id: review.id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          customer_name: customerName,
          customer_avatar: review.customer_avatar,
          is_verified_purchase: review.is_verified_purchase,
          helpful_count: review.helpful_count || 0,
          created_at: review.created_at,
          photo_urls: photoUrls,
          product: product ? {
            id: product.id,
            title: product.title,
            handle: product.handle,
            thumbnail: product.thumbnail,
            price: product.variants?.[0]?.calculated_price?.calculated_amount 
              ? (product.variants[0].calculated_price.calculated_amount / 100).toFixed(2)
              : null,
            currency: product.variants?.[0]?.calculated_price?.currency_code || 'MYR',
          } : null,
        }
      })

    console.log('[FEATURED REVIEWS] Returning', filteredReviews.length, 'reviews')

    res.json({
      reviews: filteredReviews,
      count: filteredReviews.length,
    })
  } catch (error) {
    console.error('[FEATURED REVIEWS] Error:', error)
    res.status(500).json({
      message: 'Failed to fetch featured reviews',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * OPTIONS /store/reviews/featured
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
