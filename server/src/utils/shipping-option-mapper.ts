/**
 * Shipping Option Mapper
 * Maps Medusa's native shipping option format to admin-friendly format
 */

export type ShippingOptionPrice = {
  id?: string;
  currency_code: string;
  amount: number;
};

export type ShippingOptionRule = {
  id?: string;
  attribute: string;
  operator: string;
  value: string | { value: string | string[] };
};

export type MedusaShippingOption = {
  id: string;
  name: string;
  price_type: string;
  provider_id: string;
  service_zone_id?: string;
  shipping_profile_id?: string;
  type?: {
    id?: string;
    label: string;
    description?: string;
    code: string;
  };
  prices?: ShippingOptionPrice[];
  rules?: ShippingOptionRule[];
  service_zone?: {
    id: string;
    name: string;
  };
  created_at: Date | string;
  updated_at: Date | string;
};

export type ShippingOptionResponse = {
  id: string;
  name: string;
  base_rate_myr: number;
  eta: string;
  status: "Active" | "Non Active";
  service_zone_name?: string;
  prices: ShippingOptionPrice[];
  created_at: string;
  updated_at: string;
};

/**
 * Map a single Medusa shipping option to admin response format
 */
export function mapShippingOptionToResponse(
  option: MedusaShippingOption
): ShippingOptionResponse {
  const myrPrice = option.prices?.find((p) => p.currency_code === "myr")?.amount || 0;

  // Check enabled_in_store rule to determine status
  const enabledRule = option.rules?.find((r) => r.attribute === "enabled_in_store");
  // Handle both string value and object { value: string } formats
  const ruleValue = enabledRule?.value;
  const valueStr = typeof ruleValue === "string" ? ruleValue : (ruleValue as { value: string | string[] })?.value;
  const isEnabled = valueStr !== "false";

  // Get ETA from type.description
  const eta = option.type?.description || "";

  return {
    id: option.id,
    name: option.name,
    base_rate_myr: myrPrice,
    eta,
    status: isEnabled ? "Active" : "Non Active",
    service_zone_name: option.service_zone?.name,
    prices: option.prices || [],
    created_at:
      option.created_at instanceof Date
        ? option.created_at.toISOString()
        : option.created_at,
    updated_at:
      option.updated_at instanceof Date
        ? option.updated_at.toISOString()
        : option.updated_at,
  };
}

/**
 * Generate a URL-friendly code from a name
 */
export function generateShippingOptionCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
