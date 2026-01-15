// ============================================================
// Member Types (for Members List & Detail pages)
// ============================================================

export type MembershipStatus = "active" | "cancelled";
export type MembershipTier = "premium"; // Legacy type, kept for backwards compatibility

export type MemberCustomer = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

export type MemberPoints = {
  balance: number;
  total_earned: number;
  total_redeemed: number;
};

export type Member = {
  membership_id: string;
  customer: MemberCustomer | null;
  tier_slug: string; // e.g., "classic", "silver", "gold", "platinum"
  status: MembershipStatus;
  activated_at: string;
  points: MemberPoints | null;
};

export type MemberListResponse = {
  members: Member[];
  count: number;
  limit: number;
  offset: number;
};

export type MemberFilter = {
  search?: string;
  limit?: number;
  offset?: number;
};

// Member Detail Types
export type MembershipDetail = {
  id: string;
  status: MembershipStatus;
  tier_slug: string; // e.g., "classic", "silver", "gold", "platinum"
  activated_at: string;
  stripe_payment_id: string | null;
};

export type MemberCustomerDetail = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  has_account: boolean;
  created_at: string;
};

export type PointsTransactionType = "earn" | "redeem" | "adjust" | "expire";

export type PointsTransaction = {
  id: string;
  type: PointsTransactionType;
  amount: number;
  order_id: string | null;
  reason: string | null;
  balance_after: number;
  created_at: string;
};

export type MemberDetailResponse = {
  membership: MembershipDetail;
  customer: MemberCustomerDetail;
  points: MemberPoints | null;
  recent_transactions: PointsTransaction[];
};

// ============================================================
// Membership Promo Types
// ============================================================

export type MembershipPromoStatus = "active" | "non-active";
export type MembershipPromoDiscountType = "percentage" | "fixed";

/** Raw API response type for a membership promo */
export type MembershipPromoAPI = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: MembershipPromoStatus;
  discount_type: MembershipPromoDiscountType;
  discount_value: number;
  minimum_purchase: number | null;
  created_at: string;
  updated_at: string;
};

/** Display type for membership promo (transformed from API) */
export type MembershipPromo = {
  id: string;
  displayId: string; // e.g., "#2109"
  name: string;
  period: string; // e.g., "Nov 2025" or "Jun 2025 - Dec 2025"
  status: MembershipPromoStatus;
  discountType: MembershipPromoDiscountType;
  discountValue: number;
};

export type MembershipPromoListResponse = {
  promos: MembershipPromoAPI[];
  count: number;
  limit: number;
  offset: number;
};

export type MembershipPromoFilter = {
  status?: MembershipPromoStatus;
  limit?: number;
  offset?: number;
};

export type CreateMembershipPromoInput = {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status?: MembershipPromoStatus;
  discount_type?: MembershipPromoDiscountType;
  discount_value?: number;
  minimum_purchase?: number;
};

export type UpdateMembershipPromoInput = Partial<CreateMembershipPromoInput>;

// ============================================================
// Create Member Types
// ============================================================

export type CreateMemberInput = {
  customer_id: string;
  initial_points?: number;
};

export type CreateMemberResponse = {
  membership: {
    id: string;
    customer_id: string;
    tier_slug: string;
    status: MembershipStatus;
    activated_at: string;
  };
  customer: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  points: MemberPoints | null;
};

// ============================================================
// Membership & Points Configuration Types
// ============================================================

export type MembershipPointsFormData = {
  // Membership Name
  name: string;

  // Earning Rules
  currency: string;
  rounding: string;
  pointsPerCurrency: number;
  includeTaxes: boolean;
  includeShipping: boolean;
  excludeDiscountedItems: boolean;

  // Birthday Bonus
  birthdayMultiplier: string;
  birthdayMonthlyCap: number;
  applyToFirstOrderOnly: boolean;

  // Point Expiration
  expirationPolicy: string;
  monthsUntilExpiry: number;

  // Redemption Rules
  valuePer1MYR: number;
  redeemStep: number;
  minimumPointsPerOrder: number;
  maxPercentOrderPayableByPoints: number;
};
