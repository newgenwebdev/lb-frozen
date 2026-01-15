import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHIPPING_SETTINGS_MODULE } from "../../../../modules/shipping-settings"

/**
 * Request body for rate checking
 */
interface RateCheckRequest {
  receiver_postcode: string
  weight?: number // in kg, default 0.5
}

/**
 * EasyParcel API response types
 * Note: result is an array of EasyParcelRateCheckResult, each containing a rates array
 */
interface EasyParcelRateItem {
  service_id: string
  service_name: string
  courier_id: string
  courier_name: string
  courier_logo: string
  pickup_date: string
  delivery: string
  price: number | string
  addon_cod: string
  addon_insurance: string
  addon_packing: string
}

interface EasyParcelRateCheckResult {
  status: string
  remarks?: string
  rates?: EasyParcelRateItem[]
}

interface EasyParcelAPIResponse {
  api_status: string
  error_code?: string | number
  error_remark?: string
  result?: EasyParcelRateCheckResult[]
}

/**
 * Formatted rate for storepage display
 */
interface FormattedRate {
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
 * POST /store/shipping/easyparcel-rates
 * Get available EasyParcel shipping rates for checkout
 * This is a public endpoint - no auth required
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const apiKey = process.env.EASYPARCEL_API_KEY
  const useDemo = process.env.EASYPARCEL_USE_DEMO === "true"

  if (!apiKey) {
    res.status(400).json({
      success: false,
      message: "Shipping service is not configured",
      rates: [],
    } as any)
    return
  }

  const body = req.body as RateCheckRequest
  if (!body.receiver_postcode) {
    res.status(400).json({
      success: false,
      message: "Postal code is required",
      rates: [],
    } as any)
    return
  }

  // Get sender address from shipping settings
  let senderSettings: any = null
  try {
    const shippingSettingsService = req.scope.resolve(SHIPPING_SETTINGS_MODULE) as any
    senderSettings = await shippingSettingsService.getSettings()
  } catch (error) {
    console.error("[EasyParcel Rates] Failed to get shipping settings:", error)
    res.status(400).json({
      success: false,
      message: "Shipping settings not configured",
      rates: [],
    } as any)
    return
  }

  if (!senderSettings || !senderSettings.sender_postcode) {
    res.status(400).json({
      success: false,
      message: "Shipping pickup address not configured. Please configure it in Admin > Shipping > Settings.",
      rates: [],
    } as any)
    return
  }

  const weight = body.weight || 0.5 // Default weight
  const baseUrl = useDemo
    ? "http://demo.connect.easyparcel.sg"
    : "http://connect.easyparcel.sg"

  try {
    // Build rate check request
    const params = new URLSearchParams()
    params.append("api", apiKey)

    // Sender (pickup) info from settings
    params.append("bulk[0][pick_code]", senderSettings.sender_postcode)
    params.append("bulk[0][pick_country]", senderSettings.sender_country || "MY")

    // Receiver info
    params.append("bulk[0][send_code]", body.receiver_postcode)
    params.append("bulk[0][send_country]", "MY") // Malaysia only

    // Package details
    params.append("bulk[0][weight]", weight.toString())

    let response: Response
    let data: EasyParcelAPIResponse

    try {
      response = await fetch(`${baseUrl}/?ac=EPRateCheckingBulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      })
      data = await response.json()
    } catch (fetchError) {
      console.error("[EasyParcel] Fetch error:", fetchError)
      res.status(500).json({
        success: false,
        message: `Failed to connect to shipping service: ${fetchError instanceof Error ? fetchError.message : "Network error"}`,
        rates: [],
      } as any)
      return
    }

    // Check for API errors
    if (
      data.api_status === "Error" ||
      (data.error_code && data.error_code !== "0" && data.error_code !== 0)
    ) {
      res.status(400).json({
        success: false,
        message: data.error_remark || "Failed to fetch shipping rates",
        rates: [],
      } as any)
      return
    }

    // Extract rates from result (result is an array, rates are in result[0].rates)
    const rateCheckResult = data.result?.[0]
    if (!rateCheckResult || rateCheckResult.status !== "Success" || !rateCheckResult.rates) {
      res.json({
        success: true,
        message: rateCheckResult?.remarks || "No shipping rates available for this postal code",
        rates: [],
        environment: useDemo ? "demo" : "production",
      })
      return
    }

    // Filter out point-to-point services that require locker/dropoff selection
    // These services need additional UI for selecting pickup/dropoff points
    const filteredRates = rateCheckResult.rates.filter((rate) => {
      const serviceName = rate.service_name.toLowerCase()
      // Exclude services that require dropoff/pickup points
      if (serviceName.includes("point to point") || serviceName.includes("dropoff")) {
        return false
      }
      return true
    })

    // Format rates for display
    const rates: FormattedRate[] = filteredRates.map((rate) => {
      const priceNum = parseFloat(rate.price.toString())
      return {
        service_id: rate.service_id,
        service_name: rate.service_name,
        courier_id: rate.courier_id,
        courier_name: rate.courier_name,
        courier_logo: rate.courier_logo,
        price: Math.round(priceNum * 100), // Convert to cents
        price_display: `$${priceNum.toFixed(2)}`,
        pickup_date: rate.pickup_date,
        delivery_eta: rate.delivery || "1-3 business days",
        has_cod: rate.addon_cod === "1",
        has_insurance: rate.addon_insurance === "1",
      }
    })

    // Sort by price (cheapest first)
    rates.sort((a, b) => a.price - b.price)

    res.json({
      success: true,
      rates,
      count: rates.length,
      environment: useDemo ? "demo" : "production",
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"
    res.status(500).json({
      success: false,
      message: `Failed to fetch shipping rates: ${errorMessage}`,
      rates: [],
    } as any)
  }
}

/**
 * OPTIONS /store/shipping/easyparcel-rates
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
