/**
 * Tier Configuration API Functions
 * API layer for tier CRUD operations
 */

import { api } from "./client"
import type {
  TierConfig,
  TierListResponse,
  TierResponse,
  CreateTierInput,
  UpdateTierInput,
  TierDisplay,
} from "../types/tier"

/**
 * Get all tier configurations
 * @param includeInactive - Include inactive tiers in response
 */
export async function getTiers(includeInactive = false): Promise<TierListResponse> {
  const params = new URLSearchParams()
  if (includeInactive) {
    params.append("include_inactive", "true")
  }

  const response = await api.get<TierListResponse>(
    `/admin/tiers${params.toString() ? `?${params.toString()}` : ""}`
  )
  return response.data
}

/**
 * Get a single tier by ID
 */
export async function getTier(id: string): Promise<TierConfig> {
  const response = await api.get<TierResponse>(`/admin/tiers/${id}`)
  return response.data.tier
}

/**
 * Create a new tier
 */
export async function createTier(data: CreateTierInput): Promise<TierConfig> {
  const response = await api.post<TierResponse>("/admin/tiers", data)
  return response.data.tier
}

/**
 * Update an existing tier
 */
export async function updateTier(
  id: string,
  data: UpdateTierInput
): Promise<TierConfig> {
  const response = await api.put<TierResponse>(`/admin/tiers/${id}`, data)
  return response.data.tier
}

/**
 * Delete a tier (soft delete)
 */
export async function deleteTier(id: string): Promise<{ id: string; deleted: boolean }> {
  const response = await api.delete<{ id: string; deleted: boolean }>(`/admin/tiers/${id}`)
  return response.data
}

// ============================================
// Utility functions for formatting
// ============================================

/**
 * Format cents to currency string
 * @param cents - Amount in cents
 * @param currency - Currency symbol (default: $)
 */
export function formatCurrency(cents: number, currency = "$"): string {
  return `${currency}${(cents / 100).toFixed(2)}`
}

/**
 * Format multiplier for display
 * @param multiplier - Points multiplier (e.g., 1.5)
 */
export function formatMultiplier(multiplier: number): string {
  return `${multiplier}x`
}

/**
 * Format percentage for display
 * @param percentage - Discount percentage (e.g., 5)
 */
export function formatPercentage(percentage: number): string {
  return `${percentage}%`
}

/**
 * Transform tier API response to display format
 */
export function transformTierForDisplay(tier: TierConfig): TierDisplay {
  return {
    id: tier.id,
    name: tier.name,
    slug: tier.slug,
    rank: tier.rank,
    orderThreshold: tier.order_threshold,
    spendThresholdFormatted: formatCurrency(tier.spend_threshold),
    spendThresholdCents: tier.spend_threshold,
    pointsMultiplier: formatMultiplier(tier.points_multiplier),
    discountPercentage: formatPercentage(tier.discount_percentage),
    birthdayVoucherFormatted: formatCurrency(tier.birthday_voucher_amount),
    birthdayVoucherCents: tier.birthday_voucher_amount,
    isDefault: tier.is_default,
    isActive: tier.is_active,
  }
}

/**
 * Get tier display color based on tier name/rank
 */
export function getTierColor(tier: TierConfig): {
  bg: string
  text: string
  border: string
} {
  const slug = tier.slug.toLowerCase()

  switch (slug) {
    case "classic":
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-300",
      }
    case "silver":
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-400",
      }
    case "gold":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-400",
      }
    case "platinum":
      return {
        bg: "bg-slate-800",
        text: "text-white",
        border: "border-slate-600",
      }
    default:
      // Use rank to determine color for custom tiers
      if (tier.rank >= 3) {
        return {
          bg: "bg-purple-100",
          text: "text-purple-700",
          border: "border-purple-400",
        }
      }
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-400",
      }
  }
}
