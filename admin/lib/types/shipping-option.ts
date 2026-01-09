/**
 * Shipping Option Types
 * Types for managing Medusa shipping options from admin
 */

export type ShippingOptionStatus = "Active" | "Non Active";

/**
 * Price for a specific currency (SGD only for Singapore focus)
 */
export type ShippingOptionPrice = {
  id?: string;
  currency_code: "sgd";
  amount: number;
};

/**
 * API response format from backend
 */
export type ShippingOptionAPI = {
  id: string;
  name: string;
  base_rate_sgd: number;
  eta: string;
  status: ShippingOptionStatus;
  service_zone_name?: string;
  prices: ShippingOptionPrice[];
  created_at: string;
  updated_at: string;
};

/**
 * List response from API
 */
export type ShippingOptionAPIListResponse = {
  shipping_options: ShippingOptionAPI[];
  count: number;
};

/**
 * Single item response from API
 */
export type ShippingOptionAPIGetResponse = {
  shipping_option: ShippingOptionAPI;
};

/**
 * UI representation for table display
 */
export type ShippingOption = {
  id: string;
  displayId: string;
  name: string;
  baseRateSGD: number;
  eta: string;
  status: ShippingOptionStatus;
  serviceZoneName?: string;
};

/**
 * Form data for create/update operations
 */
export type ShippingOptionFormData = {
  name: string;
  prices: ShippingOptionPrice[];
  eta: string;
  enabled: boolean;
  service_zone_id?: string;
  shipping_profile_id?: string;
};

/**
 * Query parameters for listing
 */
export type ShippingOptionListParams = {
  limit?: number;
  offset?: number;
};

/**
 * Shipping profile for dropdown
 */
export type ShippingProfile = {
  id: string;
  name: string;
  type: string;
};

/**
 * Service zone for dropdown
 */
export type ServiceZone = {
  id: string;
  name: string;
};
