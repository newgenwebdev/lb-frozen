import { MedusaService } from "@medusajs/framework/utils"
import Banner from "../models/banner"

type CreateBannerInput = {
  announcement_text: string
  link?: string | null
  start_date: Date | string
  end_date: Date | string
  background_color?: string
  text_color?: string
  is_enabled?: boolean
}

type UpdateBannerInput = {
  id: string
  announcement_text?: string
  link?: string | null
  start_date?: Date | string
  end_date?: Date | string
  background_color?: string
  text_color?: string
  is_enabled?: boolean
}

/**
 * BannerModuleService
 * Handles banner CRUD operations with date-based active status logic
 */
class BannerModuleService extends MedusaService({
  Banner,
}) {
  /**
   * Create a new banner
   */
  async createBanner(data: CreateBannerInput): Promise<any> {
    const banner = await this.createBanners({
      announcement_text: data.announcement_text,
      link: data.link || null,
      start_date: typeof data.start_date === "string" ? new Date(data.start_date) : data.start_date,
      end_date: typeof data.end_date === "string" ? new Date(data.end_date) : data.end_date,
      background_color: data.background_color || "#007AFF",
      text_color: data.text_color || "#FFFFFF",
      is_enabled: data.is_enabled ?? true,
    })

    return banner
  }

  /**
   * Update a banner
   */
  async updateBanner(data: UpdateBannerInput): Promise<any> {
    const updateData: Record<string, unknown> = { id: data.id }

    if (data.announcement_text !== undefined) updateData.announcement_text = data.announcement_text
    if (data.link !== undefined) updateData.link = data.link
    if (data.start_date !== undefined) {
      updateData.start_date = typeof data.start_date === "string" ? new Date(data.start_date) : data.start_date
    }
    if (data.end_date !== undefined) {
      updateData.end_date = typeof data.end_date === "string" ? new Date(data.end_date) : data.end_date
    }
    if (data.background_color !== undefined) updateData.background_color = data.background_color
    if (data.text_color !== undefined) updateData.text_color = data.text_color
    if (data.is_enabled !== undefined) updateData.is_enabled = data.is_enabled

    const banner = await this.updateBanners(updateData)

    return banner
  }

  /**
   * Toggle banner enabled status
   * When enabling a banner, all other banners are disabled (only one active at a time)
   */
  async toggleBannerEnabled(id: string, isEnabled: boolean): Promise<any> {
    // If enabling this banner, disable all others first
    if (isEnabled) {
      const allBanners = await this.listBanners({})
      const otherBanners = allBanners.filter((b: any) => b.id !== id && b.is_enabled === true)

      // Disable all other enabled banners
      for (const banner of otherBanners) {
        await this.updateBanners({
          id: banner.id,
          is_enabled: false,
        })
      }
    }

    // Now update the target banner
    const banner = await this.updateBanners({
      id,
      is_enabled: isEnabled,
    })
    return banner
  }

  /**
   * Get banner by ID
   */
  async getBannerById(id: string): Promise<any> {
    const banner = await this.retrieveBanner(id)
    return banner
  }

  /**
   * List all banners with pagination, filtering, and sorting
   * Sorts by closest date from today (active banners first, then by start_date)
   */
  async listAllBanners(filters?: {
    limit?: number
    offset?: number
    status?: "active" | "non_active" | "all"
    order?: Record<string, "ASC" | "DESC">
  }) {
    const now = new Date()
    // Fetch all banners first (no pagination at DB level) to calculate active status and sort correctly
    const banners = await this.listBanners(
      {},
      {
        order: { start_date: "ASC" },
      }
    )

    // Calculate active status based on dates ONLY (not is_enabled)
    // is_active = is the banner within its date range?
    // is_enabled = is this banner selected to show on frontend? (separate concept)
    const bannersWithStatus = banners.map((banner: any) => {
      const startDate = new Date(banner.start_date)
      const endDate = new Date(banner.end_date)
      const isActive = now >= startDate && now <= endDate

      return {
        ...banner,
        is_active: isActive,
      }
    })

    // Filter by status if specified
    let filteredBanners = bannersWithStatus
    if (filters?.status && filters.status !== "all") {
      filteredBanners = bannersWithStatus.filter((banner: any) => {
        if (filters.status === "active") {
          return banner.is_active === true
        } else if (filters.status === "non_active") {
          return banner.is_active === false
        }
        return true
      })
    }

    // Sort by closest date from today
    // Active banners first (sorted by end_date ascending - closest to expiring first)
    // Then non-active banners (sorted by start_date descending - most recent first)
    filteredBanners.sort((a: any, b: any) => {
      const aStart = new Date(a.start_date)
      const aEnd = new Date(a.end_date)
      const bStart = new Date(b.start_date)
      const bEnd = new Date(b.end_date)

      // Active banners come first
      if (a.is_active && !b.is_active) return -1
      if (!a.is_active && b.is_active) return 1

      // If both are active, sort by end_date (closest to expiring first)
      if (a.is_active && b.is_active) {
        const aDistance = Math.abs(aEnd.getTime() - now.getTime())
        const bDistance = Math.abs(bEnd.getTime() - now.getTime())
        return aDistance - bDistance
      }

      // If both are non-active, sort by start_date (most recent first)
      if (!a.is_active && !b.is_active) {
        return bStart.getTime() - aStart.getTime()
      }

      return 0
    })

    // Apply pagination after filtering and sorting
    const totalCount = filteredBanners.length
    const paginatedBanners = filteredBanners.slice(
      filters?.offset || 0,
      (filters?.offset || 0) + (filters?.limit || 100)
    )

    return [paginatedBanners, totalCount] as const
  }

  /**
   * Delete a banner
   */
  async deleteBanner(id: string): Promise<void> {
    await this.deleteBanners(id)
  }
}

export default BannerModuleService

