export type PromoStatus = "active" | "non-active";

export type PromoType = "percentage" | "fixed";

export type TriggerType = "product" | "cart_value";

/**
 * Coupon entity from server API
 */
export type CouponAPI = {
  id: string;
  code: string;
  name: string;
  type: PromoType;
  value: number;
  currency_code: string;
  status: PromoStatus;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/**
 * PWP Rule entity from server API
 */
export type PWPRuleAPI = {
  id: string;
  name: string;
  rule_description: string;
  trigger_type: TriggerType;
  trigger_product_id: string | null;
  trigger_cart_value: number | null;
  reward_product_id: string | null;
  reward_type: PromoType;
  reward_value: number;
  status: PromoStatus;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  redemption_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/**
 * Display-formatted Coupon for UI tables
 */
export type Coupon = {
  id: string;
  displayId: string;
  code: string;
  type: PromoType;
  value: string;
  startDate: string;
  endDate: string;
  status: PromoStatus;
  endsAt: string | null;
};

/**
 * Display-formatted PWP Rule for UI tables
 */
export type PWPRule = {
  id: string;
  displayId: string;
  rule: string;
  rewardType: PromoType;
  rewardValue: string;
  startDate: string;
  endDate: string;
  endsAt: string | null;
  redemptions: number;
  status: PromoStatus;
};

export type PromoStats = {
  totalPromo: number;
  activePromo: number;
  redemptionCoupons: number;
};

export type CouponListResponse = {
  coupons: CouponAPI[];
  count: number;
  offset: number;
  limit: number;
};

export type PWPRuleListResponse = {
  pwp_rules: PWPRuleAPI[];
  count: number;
  offset: number;
  limit: number;
};

export type PromoTab = "coupons" | "pwp-rules";

/**
 * Input for creating a coupon
 */
export type CreateCouponInput = {
  code: string;
  name: string;
  type?: PromoType;
  value?: number;
  currency_code?: string;
  status?: PromoStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Input for updating a coupon
 */
export type UpdateCouponInput = Partial<CreateCouponInput>;

/**
 * Input for creating a PWP rule
 */
export type CreatePWPRuleInput = {
  name: string;
  rule_description: string;
  trigger_type?: TriggerType;
  trigger_product_id?: string | null;
  trigger_cart_value?: number | null;
  reward_product_id?: string | null;
  reward_type?: PromoType;
  reward_value?: number;
  status?: PromoStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Input for updating a PWP rule
 */
export type UpdatePWPRuleInput = Partial<CreatePWPRuleInput>;

/**
 * Filter parameters for listing promos
 */
export type PromoFilter = {
  limit?: number;
  offset?: number;
  status?: PromoStatus;
  type?: PromoType;
  q?: string;
};
