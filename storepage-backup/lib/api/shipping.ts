/**
 * EasyParcel Shipping API for Storepage
 * Fetches real-time shipping rates from EasyParcel
 */

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY

/**
 * EasyParcel courier rate
 */
export type EasyParcelRate = {
  service_id: string
  service_name: string
  courier_id: string
  courier_name: string
  courier_logo: string
  price: number // in cents
  price_display: string
  pickup_date: string
  delivery_eta: string
  has_cod: boolean
  has_insurance: boolean
}

/**
 * EasyParcel rates response
 */
export type EasyParcelRatesResponse = {
  success: boolean
  message?: string
  rates: EasyParcelRate[]
  count?: number
  environment?: "demo" | "production"
}

/**
 * Fetch EasyParcel shipping rates for checkout
 * @param postalCode - Receiver's postal code
 * @param weight - Package weight in kg (optional, defaults to 0.5)
 */
export async function getEasyParcelRates(
  postalCode: string,
  weight?: number
): Promise<EasyParcelRate[]> {
  try {
    const response = await fetch(
      `${BACKEND_URL}/store/shipping/easyparcel-rates`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
        },
        body: JSON.stringify({
          receiver_postcode: postalCode,
          weight: weight || 0.5,
        }),
      }
    )

    if (!response.ok) {
      console.error("[getEasyParcelRates] Failed to fetch rates:", response.status)
      return []
    }

    const data: EasyParcelRatesResponse = await response.json()

    if (!data.success) {
      console.error("[getEasyParcelRates] API error:", data.message)
      return []
    }

    return data.rates
  } catch (error) {
    console.error("[getEasyParcelRates] Error:", error)
    return []
  }
}

/**
 * Convert EasyParcel rate to Medusa-compatible shipping option format
 * This allows seamless integration with existing checkout flow
 */
export function convertRateToShippingOption(rate: EasyParcelRate): {
  id: string
  name: string
  amount: number
  price_type: string
  provider_id: string
  data: {
    service_id: string
    courier_id: string
    courier_name: string
    courier_logo: string
    delivery_eta: string
  }
} {
  return {
    id: rate.service_id,
    name: `${rate.courier_name} - ${rate.service_name}`,
    amount: rate.price,
    price_type: "flat_rate",
    provider_id: "easyparcel",
    data: {
      service_id: rate.service_id,
      courier_id: rate.courier_id,
      courier_name: rate.courier_name,
      courier_logo: rate.courier_logo,
      delivery_eta: rate.delivery_eta,
    },
  }
}

/**
 * Fetch EasyParcel rates and convert to shipping options format
 * Drop-in replacement for getShippingOptions in checkout
 */
export async function getEasyParcelShippingOptions(
  postalCode: string,
  weight?: number
): Promise<
  Array<{
    id: string
    name: string
    amount: number
    price_type: string
    provider_id: string
    data: Record<string, unknown>
  }>
> {
  const rates = await getEasyParcelRates(postalCode, weight)
  return rates.map(convertRateToShippingOption)
}
