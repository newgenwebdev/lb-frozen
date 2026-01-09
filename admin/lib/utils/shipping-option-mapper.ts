/**
 * Shipping Option Mapper
 * Maps API response to UI-friendly format
 */

import type {
  ShippingOptionAPI,
  ShippingOption,
  ShippingOptionAPIListResponse,
} from "../types/shipping-option";

/**
 * Extract display ID from full ID (last 4 characters)
 */
function extractDisplayId(id: string): string {
  if (id.length <= 4) return id.toUpperCase();
  return id.slice(-4).toUpperCase();
}

/**
 * Map a single API shipping option to UI format
 */
export function mapShippingOptionAPIToUI(
  apiOption: ShippingOptionAPI
): ShippingOption {
  return {
    id: apiOption.id,
    displayId: extractDisplayId(apiOption.id),
    name: apiOption.name,
    baseRateSGD: apiOption.base_rate_sgd,
    eta: apiOption.eta,
    status: apiOption.status,
    serviceZoneName: apiOption.service_zone_name,
  };
}

/**
 * Map API list response to UI format
 */
export function mapShippingOptionListAPIToUI(apiResponse: ShippingOptionAPIListResponse): {
  shippingOptions: ShippingOption[];
  count: number;
} {
  return {
    shippingOptions: apiResponse.shipping_options.map(mapShippingOptionAPIToUI),
    count: apiResponse.count,
  };
}
