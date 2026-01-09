// ============================================================
// Membership Settings Types
// ============================================================

export type ProgramType = "free" | "paid";
export type EvaluationTrigger = "on_order" | "daily" | "both";

export type MembershipSettings = {
  id: string;
  program_type: ProgramType;
  price: number;
  duration_months: number | null;
  evaluation_period_months: number;
  evaluation_trigger: EvaluationTrigger;
  auto_enroll_on_first_order: boolean;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type MembershipSettingsResponse = {
  settings: MembershipSettings;
};

export type UpdateMembershipSettingsInput = {
  program_type?: ProgramType;
  price?: number;
  duration_months?: number | null;
  evaluation_period_months?: number;
  evaluation_trigger?: EvaluationTrigger;
  auto_enroll_on_first_order?: boolean;
  is_enabled?: boolean;
};

// ============================================================
// Points Configuration Types
// ============================================================

export type PointsEarningType = "percentage" | "per_currency";

export type PointsConfig = {
  id: string;
  // Earning settings
  earning_type: PointsEarningType;
  earning_rate: number;
  include_tax_in_earning: boolean;
  include_shipping_in_earning: boolean;
  // Redemption settings
  redemption_rate: number;
  min_points_to_redeem: number;
  max_redemption_percentage: number;
  // Expiration settings
  expiration_months: number;
  // Status
  is_enabled: boolean;
  updated_at: string;
  // Computed info
  redemption_info?: {
    points_per_dollar: number;
    example: string;
  };
};

export type PointsConfigResponse = {
  config: PointsConfig;
};

export type UpdatePointsConfigInput = {
  earning_type?: PointsEarningType;
  earning_rate?: number;
  include_tax_in_earning?: boolean;
  include_shipping_in_earning?: boolean;
  redemption_rate?: number;
  min_points_to_redeem?: number;
  max_redemption_percentage?: number;
  expiration_months?: number;
  is_enabled?: boolean;
};
