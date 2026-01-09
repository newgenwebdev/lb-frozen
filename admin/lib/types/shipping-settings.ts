// ============================================================
// Shipping Settings Types (for EasyParcel integration)
// ============================================================

export type ShippingSettings = {
  id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_unit: string | null;
  sender_postcode: string;
  sender_country: string;
  created_at: string;
  updated_at: string;
};

export type ShippingSettingsResponse = {
  settings: ShippingSettings | null;
};

export type UpdateShippingSettingsInput = {
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_unit?: string;
  sender_postcode: string;
  sender_country?: string;
};

export type UpdateShippingSettingsResponse = {
  settings: ShippingSettings;
  message: string;
};

// EasyParcel API connection test response
export type TestEasyParcelConnectionResponse = {
  success: boolean;
  message?: string;
  environment?: "demo" | "production";
};

// EasyParcel courier rate
export type EasyParcelRate = {
  service_id: string;
  service_name: string;
  courier_id: string;
  courier_name: string;
  courier_logo: string;
  price: number;
  price_display: string;
  pickup_date: string;
  delivery_eta: string;
  has_cod: boolean;
  has_insurance: boolean;
};

// EasyParcel rates response
export type EasyParcelRatesResponse = {
  success: boolean;
  message?: string;
  rates: EasyParcelRate[];
  count?: number;
  environment?: "demo" | "production";
};
