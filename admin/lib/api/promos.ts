/**
 * Promo API Functions
 *
 * API layer for promo operations (coupons and PWP rules)
 */

import { api } from "./client";
import type {
  PromoStats,
  CouponAPI,
  PWPRuleAPI,
  CouponListResponse,
  PWPRuleListResponse,
  CreateCouponInput,
  UpdateCouponInput,
  CreatePWPRuleInput,
  UpdatePWPRuleInput,
  PromoFilter,
  Coupon,
  PWPRule,
} from "../types/promo";

// ============================================================
// Promo Stats
// ============================================================

/**
 * Fetch promo statistics
 * @returns Promo statistics (total, active, redemptions)
 */
export async function getPromoStats(): Promise<PromoStats> {
  const response = await api.get<{ stats: PromoStats }>("/admin/promos");
  return response.data.stats;
}

// ============================================================
// Coupons
// ============================================================

/**
 * Fetch all coupons with filtering and pagination
 * @param filters - Optional filter parameters
 * @returns List of coupons
 */
export async function getCoupons(
  filters?: PromoFilter
): Promise<CouponListResponse> {
  const queryParams = new URLSearchParams();

  queryParams.append("limit", String(filters?.limit ?? 100));
  queryParams.append("offset", String(filters?.offset ?? 0));

  if (filters?.status) {
    queryParams.append("status", filters.status);
  }

  if (filters?.type) {
    queryParams.append("type", filters.type);
  }

  if (filters?.q) {
    queryParams.append("q", filters.q);
  }

  const response = await api.get<CouponListResponse>(
    `/admin/promos/coupons?${queryParams.toString()}`
  );

  return response.data;
}

/**
 * Fetch a single coupon by ID
 * @param id - Coupon ID
 * @returns Coupon entity
 */
export async function getCoupon(id: string): Promise<CouponAPI> {
  const response = await api.get<{ coupon: CouponAPI }>(
    `/admin/promos/coupons/${id}`
  );
  return response.data.coupon;
}

/**
 * Create a new coupon
 * @param data - Coupon data
 * @returns Created coupon
 */
export async function createCoupon(
  data: CreateCouponInput
): Promise<CouponAPI> {
  const response = await api.post<{ coupon: CouponAPI }>(
    "/admin/promos/coupons",
    data
  );
  return response.data.coupon;
}

/**
 * Update an existing coupon
 * @param id - Coupon ID
 * @param data - Updated coupon data
 * @returns Updated coupon
 */
export async function updateCoupon(
  id: string,
  data: UpdateCouponInput
): Promise<CouponAPI> {
  const response = await api.post<{ coupon: CouponAPI }>(
    `/admin/promos/coupons/${id}`,
    data
  );
  return response.data.coupon;
}

/**
 * Delete a coupon
 * @param id - Coupon ID
 */
export async function deleteCoupon(id: string): Promise<void> {
  await api.delete(`/admin/promos/coupons/${id}`);
}

// ============================================================
// PWP Rules
// ============================================================

/**
 * Fetch all PWP rules with filtering and pagination
 * @param filters - Optional filter parameters
 * @returns List of PWP rules
 */
export async function getPWPRules(
  filters?: PromoFilter
): Promise<PWPRuleListResponse> {
  const queryParams = new URLSearchParams();

  queryParams.append("limit", String(filters?.limit ?? 100));
  queryParams.append("offset", String(filters?.offset ?? 0));

  if (filters?.status) {
    queryParams.append("status", filters.status);
  }

  if (filters?.q) {
    queryParams.append("q", filters.q);
  }

  const response = await api.get<PWPRuleListResponse>(
    `/admin/promos/pwp-rules?${queryParams.toString()}`
  );

  return response.data;
}

/**
 * Fetch a single PWP rule by ID
 * @param id - PWP rule ID
 * @returns PWP rule entity
 */
export async function getPWPRule(id: string): Promise<PWPRuleAPI> {
  const response = await api.get<{ pwp_rule: PWPRuleAPI }>(
    `/admin/promos/pwp-rules/${id}`
  );
  return response.data.pwp_rule;
}

/**
 * Create a new PWP rule
 * @param data - PWP rule data
 * @returns Created PWP rule
 */
export async function createPWPRule(
  data: CreatePWPRuleInput
): Promise<PWPRuleAPI> {
  const response = await api.post<{ pwp_rule: PWPRuleAPI }>(
    "/admin/promos/pwp-rules",
    data
  );
  return response.data.pwp_rule;
}

/**
 * Update an existing PWP rule
 * @param id - PWP rule ID
 * @param data - Updated PWP rule data
 * @returns Updated PWP rule
 */
export async function updatePWPRule(
  id: string,
  data: UpdatePWPRuleInput
): Promise<PWPRuleAPI> {
  const response = await api.post<{ pwp_rule: PWPRuleAPI }>(
    `/admin/promos/pwp-rules/${id}`,
    data
  );
  return response.data.pwp_rule;
}

/**
 * Delete a PWP rule
 * @param id - PWP rule ID
 */
export async function deletePWPRule(id: string): Promise<void> {
  await api.delete(`/admin/promos/pwp-rules/${id}`);
}

// ============================================================
// Utility Functions - Transform API data to display format
// ============================================================

/**
 * Format currency value for display (SGD)
 */
function formatCurrency(value: number): string {
  const dollars = value / 100; // Convert from cents
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Format date for display (DD/MM/YYYY)
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Generate display ID from coupon ID
 */
function generateDisplayId(id: string): string {
  // Extract last 4 chars or generate from hash
  const shortId = id.slice(-4).replace(/\D/g, "") || "0000";
  return `#${shortId.padStart(4, "0")}`;
}

/**
 * Transform API coupon to display format
 */
export function transformCouponForDisplay(coupon: CouponAPI): Coupon {
  const valueDisplay =
    coupon.type === "percentage"
      ? `${coupon.value}%`
      : formatCurrency(coupon.value);

  return {
    id: coupon.id,
    displayId: generateDisplayId(coupon.id),
    code: coupon.code,
    type: coupon.type,
    value: valueDisplay,
    startDate: formatDate(coupon.starts_at),
    endDate: formatDate(coupon.ends_at),
    status: coupon.status,
    endsAt: coupon.ends_at,
  };
}

/**
 * Transform API PWP rule to display format
 */
export function transformPWPRuleForDisplay(rule: PWPRuleAPI): PWPRule {
  const rewardValueDisplay =
    rule.reward_type === "percentage"
      ? `${rule.reward_value}%`
      : formatCurrency(rule.reward_value);

  return {
    id: rule.id,
    displayId: generateDisplayId(rule.id),
    rule: rule.rule_description,
    rewardType: rule.reward_type,
    rewardValue: rewardValueDisplay,
    startDate: formatDate(rule.starts_at),
    endDate: formatDate(rule.ends_at),
    endsAt: rule.ends_at,
    redemptions: rule.redemption_count,
    status: rule.status,
  };
}
