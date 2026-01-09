import { api } from "./client";
import type {
  ShippingSettingsResponse,
  UpdateShippingSettingsInput,
  UpdateShippingSettingsResponse,
  TestEasyParcelConnectionResponse,
  EasyParcelRatesResponse,
} from "../types/shipping-settings";

/**
 * Fetch shipping settings (pickup address configuration)
 */
export async function getShippingSettings(): Promise<ShippingSettingsResponse> {
  const { data } = await api.get<ShippingSettingsResponse>(
    "/admin/shipping/settings"
  );
  return data;
}

/**
 * Update shipping settings (pickup address configuration)
 */
export async function updateShippingSettings(
  input: UpdateShippingSettingsInput
): Promise<UpdateShippingSettingsResponse> {
  const { data } = await api.put<UpdateShippingSettingsResponse>(
    "/admin/shipping/settings",
    input
  );
  return data;
}

/**
 * Test EasyParcel API connection
 */
export async function testEasyParcelConnection(): Promise<TestEasyParcelConnectionResponse> {
  const { data } = await api.post<TestEasyParcelConnectionResponse>(
    "/admin/easyparcel/test-connection"
  );
  return data;
}

/**
 * Fetch available EasyParcel courier rates
 */
export async function getEasyParcelRates(params?: {
  receiver_postcode?: string;
  weight?: number;
}): Promise<EasyParcelRatesResponse> {
  const { data } = await api.post<EasyParcelRatesResponse>(
    "/admin/easyparcel/rates",
    params || {}
  );
  return data;
}
