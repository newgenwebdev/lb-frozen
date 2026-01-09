/**
 * Banner API Functions
 *
 * API layer for banner operations
 */

import { api } from "./client";
import type {
  BannerAPIListResponse,
  BannerListParams,
  BannerAPI,
  BannerFormData,
} from "../types/banner";
import axios from "axios";

/**
 * Fetch all banners with pagination and filtering
 * @param params - Query parameters (limit, offset, status)
 * @returns Banner list response
 */
export async function getBanners(
  params: BannerListParams = {}
): Promise<BannerAPIListResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit !== undefined) {
    queryParams.append("limit", params.limit.toString());
  }
  if (params.offset !== undefined) {
    queryParams.append("offset", params.offset.toString());
  }
  if (params.status) {
    queryParams.append("status", params.status);
  }

  const queryString = queryParams.toString();
  const url = `/banner${queryString ? `?${queryString}` : ""}`;

  const response = await axios.get<BannerAPIListResponse>(
    `${process.env.NEXT_PUBLIC_API_URL}${url}`
  );
  return response.data;
}

/**
 * Convert date string (YYYY-MM-DD) to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
 */
function formatDateForAPI(dateString: string): string {
  if (!dateString) return "";
  // If already in ISO format with time, return as is
  if (dateString.includes("T")) return dateString;
  // Convert YYYY-MM-DD to ISO format with time at midnight UTC
  return `${dateString}T00:00:00.000Z`;
}

/**
 * Create a new banner
 * @param data - Banner form data
 * @returns Created banner
 */
export async function createBanner(data: BannerFormData): Promise<BannerAPI> {
  const response = await api.post<BannerAPI>("/admin/banner", {
    announcement_text: data.text,
    // Only include link if it's a non-empty string, otherwise send null
    link: data.link?.trim() ? data.link.trim() : null,
    start_date: formatDateForAPI(data.startDate),
    end_date: formatDateForAPI(data.endDate),
    background_color: data.backgroundColor,
    text_color: data.textColor,
  });
  return response.data;
}

/**
 * Update an existing banner
 * @param id - Banner ID
 * @param data - Partial banner form data (only fields to update)
 * @returns Updated banner
 */
export async function updateBanner(
  id: string,
  data: Partial<BannerFormData>
): Promise<BannerAPI> {
  const payload: Record<string, string | null> = {};

  if (data.text !== undefined) payload.announcement_text = data.text;
  // Only include link if it's a non-empty string, otherwise send null
  if (data.link !== undefined) payload.link = data.link?.trim() ? data.link.trim() : null;
  if (data.startDate !== undefined)
    payload.start_date = formatDateForAPI(data.startDate);
  if (data.endDate !== undefined)
    payload.end_date = formatDateForAPI(data.endDate);
  if (data.backgroundColor !== undefined)
    payload.background_color = data.backgroundColor;
  if (data.textColor !== undefined) payload.text_color = data.textColor;

  const response = await api.put<BannerAPI>(`/admin/banner/${id}`, payload);
  return response.data;
}

/**
 * Get a single banner by ID
 * @param id - Banner ID
 * @returns Banner or null if not found
 */
export async function getBannerById(id: string): Promise<BannerAPI | null> {
  try {
    const response = await api.get<{ banner: BannerAPI }>(`/admin/banner/${id}`);
    return response.data.banner;
  } catch {
    return null;
  }
}

/**
 * Delete a banner
 * @param id - Banner ID
 * @returns void
 */
export async function deleteBanner(id: string): Promise<void> {
  await api.delete(`/admin/banner/${id}`);
}

/**
 * Toggle banner enabled status
 * @param id - Banner ID
 * @param isEnabled - New enabled status
 * @returns Updated banner
 */
export async function toggleBannerStatus(
  id: string,
  isEnabled: boolean
): Promise<BannerAPI> {
  const response = await api.patch<{ banner: BannerAPI }>(`/admin/banner/${id}`, {
    is_enabled: isEnabled,
  });
  return response.data.banner;
}
