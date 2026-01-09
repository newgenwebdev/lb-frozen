/**
 * Banner Mapper Utilities
 *
 * Functions to map API responses to UI format
 */

import type { BannerAPI, Banner, BannerStatus } from "../types/banner";

/**
 * Format date to period string (e.g., "Nov 2025" or "Jun 2025 - Des 2025")
 */
function formatPeriod(startDate: string, endDate: string): string {
  if (!startDate && !endDate) return "";
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  if (!endDate) {
    return formatDate(startDate);
  }
  if (!startDate) {
    return formatDate(endDate);
  }

  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);
  
  return startFormatted === endFormatted ? startFormatted : `${startFormatted} - ${endFormatted}`;
}

/**
 * Extract display ID from banner ID (last 4 characters or a short version)
 */
function extractDisplayId(id: string): string {
  // Use last 4 characters of the ID as display ID
  // If ID is shorter, use the whole ID
  if (id.length <= 4) {
    return id.toUpperCase();
  }
  return id.slice(-4).toUpperCase();
}

/**
 * Map API banner status to UI status
 */
function mapStatus(isActive: boolean): BannerStatus {
  return isActive ? "active" : "non-active";
}

/**
 * Map API banner to UI banner format
 */
export function mapBannerAPIToUI(apiBanner: BannerAPI): Banner {
  return {
    id: apiBanner.id,
    displayId: extractDisplayId(apiBanner.id),
    text: apiBanner.announcement_text,
    period: formatPeriod(apiBanner.start_date, apiBanner.end_date),
    status: mapStatus(apiBanner.is_active),
    isEnabled: apiBanner.is_enabled ?? true,
    link: apiBanner.link,
    startDate: apiBanner.start_date,
    endDate: apiBanner.end_date,
    backgroundColor: apiBanner.background_color,
    textColor: apiBanner.text_color,
  };
}

/**
 * Map API banner list response to UI format
 */
export function mapBannerListAPIToUI(apiResponse: {
  banners: BannerAPI[];
  count: number;
  limit: number;
  offset: number;
}): {
  banners: Banner[];
  count: number;
  page: number;
  limit: number;
} {
  return {
    banners: apiResponse.banners.map(mapBannerAPIToUI),
    count: apiResponse.count,
    page: apiResponse.limit > 0 ? Math.floor(apiResponse.offset / apiResponse.limit) + 1 : 1,
    limit: apiResponse.limit,
  };
}

