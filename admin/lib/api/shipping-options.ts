/**
 * Shipping Options API Functions
 *
 * API layer for managing Medusa shipping options
 */

import { api } from "./client";
import type {
  ShippingOptionAPIListResponse,
  ShippingOptionAPI,
  ShippingOptionFormData,
  ShippingOptionListParams,
  ShippingProfile,
  ServiceZone,
} from "../types/shipping-option";

/**
 * Fetch all shipping options
 * @param params - Query parameters (limit, offset)
 * @returns Shipping option list response
 */
export async function getShippingOptions(
  params: ShippingOptionListParams = {}
): Promise<ShippingOptionAPIListResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit !== undefined) {
    queryParams.append("limit", params.limit.toString());
  }
  if (params.offset !== undefined) {
    queryParams.append("offset", params.offset.toString());
  }

  const queryString = queryParams.toString();
  const url = `/admin/store-shipping-options${queryString ? `?${queryString}` : ""}`;

  const response = await api.get<ShippingOptionAPIListResponse>(url);
  return response.data;
}

/**
 * Get a single shipping option by ID
 * @param id - Shipping option ID
 * @returns Shipping option or null if not found
 */
export async function getShippingOptionById(
  id: string
): Promise<ShippingOptionAPI | null> {
  try {
    const response = await api.get<{ shipping_option: ShippingOptionAPI }>(
      `/admin/store-shipping-options/${id}`
    );
    return response.data.shipping_option;
  } catch (error) {
    console.error("Failed to fetch shipping option:", error);
    return null;
  }
}

/**
 * Create a new shipping option
 * @param data - Shipping option form data
 * @returns Created shipping option
 */
export async function createShippingOption(
  data: ShippingOptionFormData
): Promise<ShippingOptionAPI> {
  const response = await api.post<{ shipping_option: ShippingOptionAPI }>(
    "/admin/store-shipping-options",
    {
      name: data.name,
      description: data.eta,
      prices: data.prices,
      enabled: data.enabled,
      service_zone_id: data.service_zone_id,
      shipping_profile_id: data.shipping_profile_id,
    }
  );
  return response.data.shipping_option;
}

/**
 * Update an existing shipping option
 * @param id - Shipping option ID
 * @param data - Partial shipping option form data (only fields to update)
 * @returns Updated shipping option
 */
export async function updateShippingOption(
  id: string,
  data: Partial<ShippingOptionFormData>
): Promise<ShippingOptionAPI> {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.eta !== undefined) payload.description = data.eta;
  if (data.prices !== undefined) payload.prices = data.prices;
  if (data.enabled !== undefined) payload.enabled = data.enabled;

  const response = await api.put<{ shipping_option: ShippingOptionAPI }>(
    `/admin/store-shipping-options/${id}`,
    payload
  );
  return response.data.shipping_option;
}

/**
 * Delete a shipping option
 * @param id - Shipping option ID
 * @returns void
 */
export async function deleteShippingOption(id: string): Promise<void> {
  await api.delete(`/admin/store-shipping-options/${id}`);
}

/**
 * Fetch all shipping profiles (for dropdown selection)
 * @returns Array of shipping profiles
 */
export async function getShippingProfiles(): Promise<ShippingProfile[]> {
  const response = await api.get<{ shipping_profiles: ShippingProfile[] }>(
    "/admin/shipping-profiles"
  );
  return response.data.shipping_profiles;
}

/**
 * Fetch all service zones (for dropdown selection)
 * @returns Array of service zones
 */
export async function getServiceZones(): Promise<ServiceZone[]> {
  const response = await api.get<{ service_zones: ServiceZone[] }>(
    "/admin/service-zones"
  );
  return response.data.service_zones;
}
