/**
 * Type definitions for LB Frozen API responses
 */

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  handle: string;
  thumbnail?: string;
  images?: ProductImage[];
  variants: ProductVariant[];
  categories?: ProductCategory[];
  tags?: ProductTag[];
  options?: ProductOption[];
  metadata?: Record<string, any>;
  status: 'draft' | 'published' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  barcode?: string;
  inventory_quantity: number;
  allow_backorder: boolean;
  manage_inventory: boolean;
  prices: ProductPrice[];
  options?: ProductVariantOption[];
  product_id: string;
  product?: Product;
  metadata?: Record<string, any>;
  calculated_price?: {
    calculated_amount: number;
    original_amount?: number;
    currency_code: string;
  };
}

export interface ProductPrice {
  id: string;
  currency_code: string;
  amount: number;
  variant_id: string;
}

export interface ProductOption {
  id: string;
  title: string;
  values: ProductOptionValue[];
}

export interface ProductOptionValue {
  id: string;
  value: string;
  option_id: string;
}

export interface ProductVariantOption {
  id: string;
  value: string;
  option_id: string;
  variant_id: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  handle: string;
  description?: string;
  parent_category_id?: string;
  parent_category?: ProductCategory;
  metadata?: Record<string, any>;
}

export interface ProductTag {
  id: string;
  value: string;
}

// ============================================================================
// Cart Types
// ============================================================================

export interface Cart {
  id: string;
  email?: string;
  customer_id?: string;
  region_id: string;
  items: LineItem[];
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_total: number;
  total: number;
  currency_code: string;
  metadata?: Record<string, any>;
  shipping_address?: Address;
  billing_address?: Address;
  payment_session?: PaymentSession;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id: string;
  cart_id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  variant_id: string;
  variant: ProductVariant;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total: number;
  metadata?: Record<string, any>;
}

export interface Address {
  id?: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  postal_code: string;
  country_code: string;
  phone?: string;
  company?: string;
  is_default_shipping?: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// Customer Types
// ============================================================================

/**
 * Customer pricing roles
 */
export const CUSTOMER_ROLES = {
  RETAIL: 'retail',
  BULK: 'bulk',
  VIP: 'vip',
  SUPPLIER: 'supplier',
} as const;

export type CustomerRole = typeof CUSTOMER_ROLES[keyof typeof CUSTOMER_ROLES];

/**
 * Customer role info returned from API
 */
export interface CustomerRoleInfo {
  slug: CustomerRole;
  name: string;
  description: string;
  can_see_bulk_prices: boolean;
  can_see_vip_prices: boolean;
  can_see_supplier_prices?: boolean;
}

export interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  has_account: boolean;
  metadata?: Record<string, any>;
  billing_address?: Address;
  addresses?: Address[];
  shipping_addresses?: Address[]; // Alias for backwards compatibility
  created_at: string;
  updated_at: string;
  // Role info (populated from metadata or API)
  pricing_role?: CustomerRole;
}

export interface CustomerRegistration {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface CustomerLogin {
  email: string;
  password: string;
}

// ============================================================================
// Order Types
// ============================================================================

export interface Order {
  id: string;
  display_id: number;
  status: 'pending' | 'completed' | 'archived' | 'canceled';
  email: string;
  customer_id: string;
  customer: Customer;
  items: LineItem[];
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_total: number;
  total: number;
  currency_code: string;
  payment_status: 'not_paid' | 'awaiting' | 'captured' | 'refunded' | 'canceled';
  fulfillment_status: 'not_fulfilled' | 'partially_fulfilled' | 'fulfilled' | 'returned' | 'canceled';
  shipping_address?: Address;
  billing_address?: Address;
  payment_collection?: {
    id: string;
    payment_sessions?: PaymentSession[];
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface PaymentSession {
  id: string;
  cart_id: string;
  provider_id: string;
  data: Record<string, any>;
  status: 'pending' | 'authorized' | 'captured' | 'canceled';
  amount: number;
  currency_code: string;
}

// ============================================================================
// Region Types
// ============================================================================

export interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
  countries: Country[];
  payment_providers: string[];
  fulfillment_providers: string[];
  metadata?: Record<string, any>;
}

export interface Country {
  id: string;
  iso_2: string;
  iso_3: string;
  name: string;
  display_name: string;
  region_id: string;
}

// ============================================================================
// Membership Types
// ============================================================================

export interface Membership {
  id: string;
  customer_id: string;
  tier_id: string;
  tier: MembershipTier;
  status: 'active' | 'expired' | 'canceled';
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipTier {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration_months: number;
  benefits: Record<string, any>;
  metadata?: Record<string, any>;
}

// ============================================================================
// Points Types
// ============================================================================

export interface PointsBalance {
  customer_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

export interface PointsTransaction {
  id: string;
  customer_id: string;
  type: 'earned' | 'spent' | 'expired';
  amount: number;
  description?: string;
  reference_id?: string;
  created_at: string;
}

// ============================================================================
// Promo Types
// ============================================================================

export interface Promo {
  id: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  description?: string;
  valid_from?: string;
  valid_to?: string;
  usage_limit?: number;
  usage_count: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  offset: number;
  limit: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  message: string;
  type?: string;
  code?: string;
}
