import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EASYPARCEL_ORDER_MODULE } from "../../../../modules/easyparcel-order"
import { SHIPPING_SETTINGS_MODULE } from "../../../../modules/shipping-settings"

/**
 * Order submission request body
 */
interface OrderSubmissionItem {
  order_id: string
  service_id: string
  service_name: string
  courier_id: string
  courier_name: string
  weight: number
  rate: number
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  receiver_postcode: string
  receiver_country?: string
  content: string // Package content description
  pickup_date: string // YYYY-MM-DD
  pickup_time?: string // e.g., "10:00-12:00"
}

interface OrderSubmissionRequest {
  orders: OrderSubmissionItem[]
}

/**
 * Format and validate Singapore phone number for EasyParcel
 * EasyParcel requires format: 8-digit number starting with 8 or 9 (no country code)
 * Returns null if phone number is invalid
 */
function formatSingaporePhone(phone: string): string | null {
  if (!phone) return null

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "")

  // Remove country code if present (65)
  if (cleaned.startsWith("65") && cleaned.length > 8) {
    cleaned = cleaned.slice(2)
  }

  // Singapore mobile numbers are 8 digits starting with 8 or 9
  if (cleaned.length === 8 && (cleaned.startsWith("8") || cleaned.startsWith("9"))) {
    return cleaned
  }

  // Singapore landlines are 8 digits starting with 6
  if (cleaned.length === 8 && cleaned.startsWith("6")) {
    return cleaned
  }

  return null
}

/**
 * EasyParcel API response types
 */
interface EasyParcelSubmitResult {
  status: string
  remarks?: string
  order_number?: string
  parcel_number?: string
  price?: string
  courier?: string
  collect_date?: string
}

interface EasyParcelAPIResponse {
  api_status: string
  error_code?: string | number
  error_remark?: string
  result?: EasyParcelSubmitResult[]
}

/**
 * POST /admin/easyparcel/orders
 * Submit orders to EasyParcel for shipping
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Auth check
  const authContext = (req as any).auth_context
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any)
    return
  }

  const apiKey = process.env.EASYPARCEL_API_KEY
  const useDemo = process.env.EASYPARCEL_USE_DEMO === "true"

  if (!apiKey) {
    res.status(400).json({
      success: false,
      message: "EasyParcel API key is not configured",
    } as any)
    return
  }

  const body = req.body as OrderSubmissionRequest
  if (!body.orders || body.orders.length === 0) {
    res.status(400).json({
      success: false,
      message: "No orders provided",
    } as any)
    return
  }

  // Get sender address from shipping settings
  const shippingSettingsService = req.scope.resolve(SHIPPING_SETTINGS_MODULE) as any
  const senderSettings = await shippingSettingsService.getSettings()

  console.log("[EasyParcel] Sender settings:", JSON.stringify(senderSettings, null, 2))

  if (!senderSettings) {
    console.error("[EasyParcel] ERROR: Pickup address not configured")
    res.status(400).json({
      success: false,
      message: "Pickup address not configured. Please configure it in Shipping Settings.",
    } as any)
    return
  }

  const baseUrl = useDemo
    ? "http://demo.connect.easyparcel.sg"
    : "http://connect.easyparcel.sg"

  try {
    // Build request with PHP-style array format
    const params = new URLSearchParams()
    params.append("api", apiKey)

    // Validate and format sender phone
    const senderPhone = formatSingaporePhone(senderSettings.sender_phone)
    console.log("[EasyParcel] Sender phone validation:", {
      raw: senderSettings.sender_phone,
      formatted: senderPhone,
    })
    if (!senderPhone) {
      console.error("[EasyParcel] ERROR: Invalid sender phone:", senderSettings.sender_phone)
      res.status(400).json({
        success: false,
        message: `Invalid sender phone number: ${senderSettings.sender_phone}. Must be a valid Singapore number (8 digits starting with 6, 8, or 9).`,
      } as any)
      return
    }

    // Validate receiver phones before making API call
    const phoneErrors: string[] = []
    body.orders.forEach((order, index) => {
      const formattedPhone = formatSingaporePhone(order.receiver_phone)
      console.log(`[EasyParcel] Receiver ${index + 1} phone validation:`, {
        raw: order.receiver_phone,
        formatted: formattedPhone,
        receiver_name: order.receiver_name,
        order_id: order.order_id,
      })
      if (!formattedPhone) {
        phoneErrors.push(`Order ${index + 1}: Invalid receiver phone "${order.receiver_phone}"`)
      }
    })

    if (phoneErrors.length > 0) {
      console.error("[EasyParcel] ERROR: Invalid receiver phones:", phoneErrors)
      res.status(400).json({
        success: false,
        message: `Invalid phone number(s). Singapore numbers must be 8 digits starting with 6, 8, or 9. ${phoneErrors.join("; ")}`,
      } as any)
      return
    }

    // Add each order to the bulk request
    // Based on EasyParcel Singapore API documentation
    body.orders.forEach((order, index) => {
      // Sender (pickup) info - all required fields per EasyParcel docs
      params.append(`bulk[${index}][pick_name]`, senderSettings.sender_name)
      params.append(`bulk[${index}][pick_company]`, senderSettings.sender_name)
      params.append(`bulk[${index}][pick_contact]`, senderPhone)
      params.append(`bulk[${index}][pick_mobile]`, senderPhone)
      params.append(`bulk[${index}][pick_addr1]`, senderSettings.sender_address)
      params.append(`bulk[${index}][pick_addr2]`, "")
      params.append(`bulk[${index}][pick_unit]`, senderSettings.sender_unit || "-")
      params.append(`bulk[${index}][pick_state]`, "Singapore")
      params.append(`bulk[${index}][pick_code]`, senderSettings.sender_postcode)
      params.append(`bulk[${index}][pick_country]`, senderSettings.sender_country || "SG")

      // Receiver info - format phone number
      const receiverPhone = formatSingaporePhone(order.receiver_phone) || order.receiver_phone
      params.append(`bulk[${index}][send_name]`, order.receiver_name)
      params.append(`bulk[${index}][send_company]`, "")
      params.append(`bulk[${index}][send_contact]`, receiverPhone)
      params.append(`bulk[${index}][send_mobile]`, receiverPhone)
      params.append(`bulk[${index}][send_addr1]`, order.receiver_address)
      params.append(`bulk[${index}][send_addr2]`, "")
      params.append(`bulk[${index}][send_unit]`, "-")
      params.append(`bulk[${index}][send_state]`, "Singapore")
      params.append(`bulk[${index}][send_code]`, order.receiver_postcode)
      params.append(`bulk[${index}][send_country]`, order.receiver_country || "SG")

      // Package details - all required fields
      params.append(`bulk[${index}][weight]`, order.weight.toString())
      params.append(`bulk[${index}][width]`, "10")
      params.append(`bulk[${index}][length]`, "10")
      params.append(`bulk[${index}][height]`, "10")
      params.append(`bulk[${index}][content]`, order.content)
      params.append(`bulk[${index}][value]`, (order.rate / 100).toFixed(2))
      params.append(`bulk[${index}][service_id]`, order.service_id)
      params.append(`bulk[${index}][collect_date]`, order.pickup_date)
      params.append(`bulk[${index}][sms]`, "0") // SMS notification: 0=no, 1=yes

      // Reference for tracking back to Medusa order
      params.append(`bulk[${index}][reference]`, order.order_id)
    })

    // Log the request for debugging
    console.log("[EasyParcel] Submitting orders to:", `${baseUrl}/?ac=EPSubmitOrderBulk`)
    console.log("[EasyParcel] Sender (pickup) info:", {
      name: senderSettings.sender_name,
      phone_raw: senderSettings.sender_phone,
      phone_formatted: senderPhone,
      address: senderSettings.sender_address,
      postcode: senderSettings.sender_postcode,
    })
    console.log("[EasyParcel] Order data:", JSON.stringify(body.orders, null, 2))
    // Log the actual params being sent
    console.log("[EasyParcel] Request params:", params.toString())

    let response: Response
    let data: EasyParcelAPIResponse

    try {
      response = await fetch(`${baseUrl}/?ac=EPSubmitOrderBulk`, {
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
        message: `Failed to connect to EasyParcel API: ${fetchError instanceof Error ? fetchError.message : "Network error"}`,
        results: [],
      } as any)
      return
    }

    // Log the response for debugging
    console.log("[EasyParcel] API Response:", JSON.stringify(data, null, 2))

    // Check for API errors
    if (
      data.api_status === "Error" ||
      (data.error_code && data.error_code !== "0" && data.error_code !== 0)
    ) {
      res.status(400).json({
        success: false,
        message: data.error_remark || "Failed to submit orders to EasyParcel",
        results: [],
      } as any)
      return
    }

    // Process results and save to database
    const easyParcelOrderService = req.scope.resolve(EASYPARCEL_ORDER_MODULE) as any
    const results: Array<{
      order_id: string
      success: boolean
      order_no?: string
      message?: string
    }> = []

    if (data.result) {
      for (let i = 0; i < data.result.length; i++) {
        const result = data.result[i]
        const orderData = body.orders[i]

        if (result.status === "Success" && result.order_number) {
          // Save to database
          await easyParcelOrderService.createOrder({
            order_id: orderData.order_id,
            order_no: result.order_number,
            parcel_no: result.parcel_number,
            service_id: orderData.service_id,
            service_name: orderData.service_name,
            courier_id: orderData.courier_id,
            courier_name: orderData.courier_name,
            weight: orderData.weight,
            rate: orderData.rate,
            pickup_date: orderData.pickup_date,
            pickup_time: orderData.pickup_time,
            receiver_name: orderData.receiver_name,
            receiver_phone: orderData.receiver_phone,
            receiver_address: orderData.receiver_address,
            receiver_postcode: orderData.receiver_postcode,
            receiver_country: orderData.receiver_country || "SG",
            status: "order_created",
          })

          results.push({
            order_id: orderData.order_id,
            success: true,
            order_no: result.order_number,
          })
        } else {
          results.push({
            order_id: orderData.order_id,
            success: false,
            message: result.remarks || "Failed to create order",
          })
        }
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    // Build detailed error message if there are failures
    let message: string
    if (failCount === 0) {
      message = `Successfully submitted ${successCount} orders`
    } else {
      // Include the first failure reason in the message
      const failedResult = results.find((r) => !r.success)
      const failReason = failedResult?.message || "Unknown error"
      message = `Submitted ${successCount} orders, ${failCount} failed: ${failReason}`
    }

    res.json({
      success: successCount > 0,
      message,
      results,
      environment: useDemo ? "demo" : "production",
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"
    res.status(500).json({
      success: false,
      message: `Failed to submit orders: ${errorMessage}`,
      results: [],
    } as any)
  }
}

/**
 * OPTIONS /admin/easyparcel/orders
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
