/**
 * Membership Promo API Functions
 *
 * API layer for membership promo operations
 */

import { api } from "./client";
import type {
  MembershipPromoAPI,
  MembershipPromoListResponse,
  MembershipPromoFilter,
  CreateMembershipPromoInput,
  UpdateMembershipPromoInput,
  MembershipPromo,
} from "../types/membership";

// ============================================================
// API Functions
// ============================================================

/**
 * Fetch all membership promos with filtering and pagination
 * @param filters - Optional filter parameters
 * @returns List of promos with count
 */
export async function getMembershipPromos(
  filters?: MembershipPromoFilter
): Promise<MembershipPromoListResponse> {
  const queryParams = new URLSearchParams();

  queryParams.append("limit", String(filters?.limit ?? 50));
  queryParams.append("offset", String(filters?.offset ?? 0));

  if (filters?.status) {
    queryParams.append("status", filters.status);
  }

  const response = await api.get<MembershipPromoListResponse>(
    `/admin/membership/promos?${queryParams.toString()}`
  );

  return response.data;
}

/**
 * Fetch a single membership promo by ID
 * @param id - Promo ID
 * @returns Promo entity
 */
export async function getMembershipPromo(id: string): Promise<MembershipPromoAPI> {
  const response = await api.get<{ promo: MembershipPromoAPI }>(
    `/admin/membership/promos/${id}`
  );
  return response.data.promo;
}

/**
 * Create a new membership promo
 * @param data - Promo data
 * @returns Created promo
 */
export async function createMembershipPromo(
  data: CreateMembershipPromoInput
): Promise<MembershipPromoAPI> {
  const response = await api.post<{ promo: MembershipPromoAPI }>(
    "/admin/membership/promos",
    data
  );
  return response.data.promo;
}

/**
 * Update an existing membership promo
 * @param id - Promo ID
 * @param data - Updated promo data
 * @returns Updated promo
 */
export async function updateMembershipPromo(
  id: string,
  data: UpdateMembershipPromoInput
): Promise<MembershipPromoAPI> {
  const response = await api.put<{ promo: MembershipPromoAPI }>(
    `/admin/membership/promos/${id}`,
    data
  );
  return response.data.promo;
}

/**
 * Toggle membership promo status
 * @param id - Promo ID
 * @param status - New status
 * @returns Updated promo
 */
export async function toggleMembershipPromoStatus(
  id: string,
  status: "active" | "non-active"
): Promise<MembershipPromoAPI> {
  const response = await api.patch<{ promo: MembershipPromoAPI }>(
    `/admin/membership/promos/${id}`,
    { status }
  );
  return response.data.promo;
}

/**
 * Delete a membership promo
 * @param id - Promo ID
 */
export async function deleteMembershipPromo(id: string): Promise<void> {
  await api.delete(`/admin/membership/promos/${id}`);
}

// ============================================================
// Utility Functions - Transform API data to display format
// ============================================================

/**
 * Format date for period display
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Nov 2025")
 */
function formatPeriodDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/**
 * Generate period string from start and end dates
 * @param startDate - ISO date string
 * @param endDate - ISO date string
 * @returns Period string (e.g., "Nov 2025" or "Jun 2025 - Dec 2025")
 */
function formatPeriod(startDate: string, endDate: string): string {
  const start = formatPeriodDate(startDate);
  const end = formatPeriodDate(endDate);

  if (start === end) {
    return start;
  }

  return `${start} - ${end}`;
}

/**
 * Generate display ID from promo ID
 * @param id - Promo ID
 * @returns Display ID (e.g., "#2109")
 */
function generateDisplayId(id: string): string {
  // Extract last 4 digits or generate from hash
  const shortId = id.slice(-4).replace(/\D/g, "") || "0000";
  return `#${shortId.padStart(4, "0")}`;
}

/**
 * Transform API promo to display format
 * @param promo - Raw API promo
 * @returns Display promo
 */
export function transformPromoForDisplay(promo: MembershipPromoAPI): MembershipPromo {
  // Guard against null/undefined promo
  if (!promo || !promo.id) {
    console.warn("[transformPromoForDisplay] Received invalid promo:", promo);
    return {
      id: "",
      displayId: "#0000",
      name: "Unknown",
      period: "",
      status: "non-active",
      discountType: "percentage",
      discountValue: 0,
    };
  }

  return {
    id: promo.id,
    displayId: generateDisplayId(promo.id),
    name: promo.name,
    period: formatPeriod(promo.start_date, promo.end_date),
    status: promo.status,
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
  };
}
