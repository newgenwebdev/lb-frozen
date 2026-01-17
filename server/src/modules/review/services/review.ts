import { MedusaService } from "@medusajs/framework/utils"
import Review from "../models/review"

type CreateReviewInput = {
  product_id: string
  customer_id?: string | null
  order_id?: string | null
  order_item_id?: string | null
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  rating: number
  title?: string | null
  content?: string | null
  images?: string[]
  is_verified_purchase?: boolean
  is_guest_review?: boolean
  is_approved?: boolean
  is_featured?: boolean
}

type UpdateReviewInput = {
  id: string
  rating?: number
  title?: string | null
  content?: string | null
  images?: string[]
  is_approved?: boolean
  is_featured?: boolean
  helpful_count?: number
}

type ListReviewsFilter = {
  product_id?: string
  customer_id?: string
  is_approved?: boolean
  is_featured?: boolean
  is_guest_review?: boolean
}

/**
 * ReviewModuleService
 * Handles product review CRUD operations
 */
class ReviewModuleService extends MedusaService({
  Review,
}) {
  /**
   * Create a new review (supports both customer and guest reviews)
   */
  async createReview(data: CreateReviewInput): Promise<any> {
    // Validate rating is 1-5
    const rating = Math.min(5, Math.max(1, Math.round(data.rating)))

    const review = await this.createReviews({
      product_id: data.product_id,
      customer_id: data.customer_id || null,
      order_id: data.order_id || null,
      order_item_id: data.order_item_id || null,
      guest_name: data.guest_name || null,
      guest_email: data.guest_email || null,
      guest_phone: data.guest_phone || null,
      rating: rating,
      title: data.title || null,
      content: data.content || null,
      images: { items: data.images || [] },
      is_verified_purchase: data.is_verified_purchase || false,
      is_guest_review: data.is_guest_review || false,
      is_approved: data.is_approved !== undefined ? data.is_approved : true,
      is_featured: data.is_featured || false,
      helpful_count: 0,
    })

    return review
  }

  /**
   * Update a review
   */
  async updateReview(data: UpdateReviewInput): Promise<any> {
    const updateData: Record<string, unknown> = { id: data.id }

    if (data.rating !== undefined) {
      updateData.rating = Math.min(5, Math.max(1, Math.round(data.rating)))
    }
    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.images !== undefined) updateData.images = { items: data.images }
    if (data.is_approved !== undefined) updateData.is_approved = data.is_approved
    if (data.is_featured !== undefined) updateData.is_featured = data.is_featured
    if (data.helpful_count !== undefined) updateData.helpful_count = data.helpful_count

    const review = await this.updateReviews(updateData)

    return review
  }

  /**
   * Get review by ID
   */
  async getReviewById(id: string): Promise<any> {
    const review = await this.retrieveReview(id)
    return review
  }

  /**
   * List reviews with filters
   */
  async listReviewsWithFilters(
    filters: ListReviewsFilter,
    config?: { skip?: number; take?: number; order?: Record<string, "ASC" | "DESC"> }
  ): Promise<{ reviews: any[]; count: number }> {
    const where: Record<string, unknown> = {}

    if (filters.product_id) where.product_id = filters.product_id
    if (filters.customer_id) where.customer_id = filters.customer_id
    if (filters.is_approved !== undefined) where.is_approved = filters.is_approved
    if (filters.is_featured !== undefined) where.is_featured = filters.is_featured
    if (filters.is_guest_review !== undefined) where.is_guest_review = filters.is_guest_review

    console.log("Review service listReviewsWithFilters where:", JSON.stringify(where))
    console.log("Review service listReviewsWithFilters config:", JSON.stringify(config))

    const [reviews, count] = await this.listAndCountReviews(where, {
      skip: config?.skip || 0,
      take: config?.take || 10,
      order: config?.order || { created_at: "DESC" },
    })

    console.log("Review service result count:", count, "reviews length:", reviews?.length)

    return { reviews, count }
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(
    productId: string,
    options?: { skip?: number; take?: number; approvedOnly?: boolean }
  ): Promise<{ reviews: any[]; count: number }> {
    return this.listReviewsWithFilters(
      {
        product_id: productId,
        is_approved: options?.approvedOnly !== false ? true : undefined,
      },
      {
        skip: options?.skip,
        take: options?.take,
        order: { created_at: "DESC" },
      }
    )
  }

  /**
   * Get reviews by customer
   */
  async getCustomerReviews(
    customerId: string,
    options?: { skip?: number; take?: number }
  ): Promise<{ reviews: any[]; count: number }> {
    return this.listReviewsWithFilters(
      { customer_id: customerId },
      {
        skip: options?.skip,
        take: options?.take,
        order: { created_at: "DESC" },
      }
    )
  }

  /**
   * Get product rating stats
   */
  async getProductRatingStats(productId: string): Promise<{
    average_rating: number
    total_reviews: number
    rating_breakdown: Record<number, number>
  }> {
    const { reviews, count } = await this.listReviewsWithFilters(
      { product_id: productId, is_approved: true },
      { take: 10000 } // Get all reviews for stats
    )

    if (count === 0) {
      return {
        average_rating: 0,
        total_reviews: 0,
        rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    }

    const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let totalRating = 0

    for (const review of reviews) {
      const rating = review.rating
      ratingBreakdown[rating] = (ratingBreakdown[rating] || 0) + 1
      totalRating += rating
    }

    return {
      average_rating: Math.round((totalRating / count) * 10) / 10, // Round to 1 decimal
      total_reviews: count,
      rating_breakdown: ratingBreakdown,
    }
  }

  /**
   * Check if customer has already reviewed a product
   */
  async hasCustomerReviewed(productId: string, customerId: string): Promise<boolean> {
    const { count } = await this.listReviewsWithFilters({
      product_id: productId,
      customer_id: customerId,
    })
    return count > 0
  }

  /**
   * Check if guest has already reviewed a product (by email)
   */
  async hasGuestReviewed(productId: string, guestEmail: string): Promise<boolean> {
    const [reviews] = await this.listReviews(
      {
        product_id: productId,
        guest_email: guestEmail,
        is_guest_review: true,
      }
    )
    return Array.isArray(reviews) && reviews.length > 0
  }

  /**
   * Get existing customer review for a product
   */
  async getCustomerProductReview(productId: string, customerId: string): Promise<any | null> {
    const { reviews } = await this.listReviewsWithFilters(
      {
        product_id: productId,
        customer_id: customerId,
      },
      { take: 1 }
    )
    return reviews[0] || null
  }

  /**
   * Increment helpful count
   */
  async markReviewHelpful(reviewId: string): Promise<any> {
    const review = await this.retrieveReview(reviewId)
    return this.updateReview({
      id: reviewId,
      helpful_count: (review.helpful_count || 0) + 1,
    })
  }

  /**
   * Delete review
   */
  async deleteReviewById(id: string): Promise<void> {
    await this.deleteReviews([id])
  }

  /**
   * Add images to a review
   * Appends new image URLs to existing images
   */
  async addImagesToReview(reviewId: string, imageUrls: string[]): Promise<any> {
    const review = await this.retrieveReview(reviewId)
    const currentImages = (review.images as any)?.items || []
    const updatedImages = [...currentImages, ...imageUrls]

    return this.updateReview({
      id: reviewId,
      images: updatedImages,
    })
  }

  /**
   * Remove image from a review
   */
  async removeImageFromReview(reviewId: string, imageUrl: string): Promise<any> {
    const review = await this.retrieveReview(reviewId)
    const currentImages = (review.images as any)?.items || []
    const updatedImages = currentImages.filter((url: string) => url !== imageUrl)

    return this.updateReview({
      id: reviewId,
      images: updatedImages,
    })
  }
}

export default ReviewModuleService
