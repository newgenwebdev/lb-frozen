import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EASYPARCEL_ORDER_MODULE } from "../../../../modules/easyparcel-order"

/**
 * Payment request body
 */
interface PaymentRequest {
  order_nos: string[] // EasyParcel order numbers to pay
}

/**
 * EasyParcel API response types
 */
interface EasyParcelPayResult {
  status?: string
  remarks?: string
  messagenow?: string // EasyParcel uses this for error messages
  order_no?: string
  order_number?: string
  orderno?: string // EasyParcel sometimes uses this
  parcel_no?: string
  parcel_number?: string
  awb?: string
  awb_id_link?: string
  tracking_url?: string
  tracking_number?: string
  parcel?: Array<{
    awb?: string
    tracking_url?: string
  }>
}

interface EasyParcelAPIResponse {
  api_status: string
  error_code?: string | number
  error_remark?: string
  result?: EasyParcelPayResult[]
}

/**
 * Generate a mock AWB number for development/testing
 * Format: MOCK-{timestamp}-{random}
 */
function generateMockAwb(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MOCK-${timestamp}-${random}`
}

/**
 * Generate a mock parcel number
 * Format: MP-{5 digit number}
 */
function generateMockParcelNo(): string {
  const num = Math.floor(10000 + Math.random() * 90000)
  return `MP-${num}`
}

/**
 * POST /admin/easyparcel/pay
 * Pay for submitted orders and get AWB numbers
 *
 * Supports mock mode (EASYPARCEL_MOCK_PAYMENT=true) for development
 * which generates dummy AWB numbers without calling the actual API
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
  const useMockPayment = process.env.EASYPARCEL_MOCK_PAYMENT === "true"

  if (!apiKey) {
    res.status(400).json({
      success: false,
      message: "EasyParcel API key is not configured",
    } as any)
    return
  }

  const body = req.body as PaymentRequest
  if (!body.order_nos || body.order_nos.length === 0) {
    res.status(400).json({
      success: false,
      message: "No order numbers provided",
    } as any)
    return
  }

  const easyParcelOrderService = req.scope.resolve(EASYPARCEL_ORDER_MODULE) as any

  // === MOCK PAYMENT MODE ===
  // For development without EasyParcel credits
  if (useMockPayment) {
    console.log("[EasyParcel Pay] MOCK MODE - Generating simulated payment results")

    const results: Array<{
      order_no: string
      success: boolean
      parcel_no?: string
      awb?: string
      tracking_url?: string
      message?: string
    }> = []

    for (const orderNo of body.order_nos) {
      const mockAwb = generateMockAwb()
      const mockParcelNo = generateMockParcelNo()
      const mockTrackingUrl = `https://track.easyparcel.sg/?awb=${mockAwb}`

      // Update database with mock data
      const existingOrder = await easyParcelOrderService.getByOrderNo(orderNo)
      if (existingOrder) {
        await easyParcelOrderService.markAsPaid(
          existingOrder.id,
          mockParcelNo,
          mockAwb,
          mockTrackingUrl
        )
      }

      results.push({
        order_no: orderNo,
        success: true,
        parcel_no: mockParcelNo,
        awb: mockAwb,
        tracking_url: mockTrackingUrl,
      })
    }

    res.json({
      success: true,
      message: `[MOCK] Successfully paid for ${results.length} orders (simulated)`,
      results,
      environment: "mock",
      mock_mode: true,
    })
    return
  }

  // === REAL PAYMENT MODE ===
  const baseUrl = useDemo
    ? "http://demo.connect.easyparcel.sg"
    : "http://connect.easyparcel.sg"

  try {
    // Build request with PHP-style array format
    const params = new URLSearchParams()
    params.append("api", apiKey)

    // Add each order number to the bulk request
    body.order_nos.forEach((orderNo, index) => {
      params.append(`bulk[${index}][order_no]`, orderNo)
    })

    console.log("[EasyParcel Pay] Request params:", params.toString())

    const response = await fetch(`${baseUrl}/?ac=EPPayOrderBulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    })

    const data: EasyParcelAPIResponse = await response.json()

    console.log("[EasyParcel Pay] API Response:", JSON.stringify(data, null, 2))

    // Check for API errors
    if (
      data.api_status === "Error" ||
      (data.error_code && data.error_code !== "0" && data.error_code !== 0)
    ) {
      res.status(400).json({
        success: false,
        message: data.error_remark || "Failed to pay for orders",
        results: [],
      } as any)
      return
    }

    // Process results and update database
    const results: Array<{
      order_no: string
      success: boolean
      parcel_no?: string
      awb?: string
      tracking_url?: string
      message?: string
    }> = []

    if (data.result) {
      for (const result of data.result) {
        // Handle different field names from EasyParcel API
        // EasyParcel uses various field names: orderno, order_no, order_number
        const orderNo = result.orderno || result.order_no || result.order_number || ""
        const parcelNo = result.parcel_no || result.parcel_number || ""

        // AWB might be in different places
        let awb = result.awb || result.tracking_number || ""
        let trackingUrl = result.tracking_url || result.awb_id_link || ""

        // Check parcel array for AWB (sometimes nested)
        if (!awb && result.parcel && result.parcel.length > 0) {
          awb = result.parcel[0].awb || ""
          trackingUrl = trackingUrl || result.parcel[0].tracking_url || ""
        }

        // Check for error message in messagenow field
        const errorMessage = result.messagenow || result.remarks || ""

        // In demo mode, payment might succeed without AWB
        // Check for Success status (case-insensitive)
        // Also check if there's no error message
        const isSuccess = result.status?.toLowerCase() === "success" ||
          (awb && !errorMessage.toLowerCase().includes("insufficient"))

        // Check for specific error conditions
        const isInsufficientCredit = errorMessage.toLowerCase().includes("insufficient credit")

        if (isInsufficientCredit) {
          results.push({
            order_no: orderNo,
            success: false,
            message: "Insufficient credit in EasyParcel wallet. Please top up your EasyParcel account.",
          })
        } else if (isSuccess) {
          // Find and update the order in database
          const existingOrder = await easyParcelOrderService.getByOrderNo(orderNo)

          if (existingOrder && awb) {
            await easyParcelOrderService.markAsPaid(
              existingOrder.id,
              parcelNo,
              awb,
              trackingUrl
            )
          }

          results.push({
            order_no: orderNo,
            success: true,
            parcel_no: parcelNo,
            awb: awb || "Pending (Demo Mode)",
            tracking_url: trackingUrl,
          })
        } else {
          results.push({
            order_no: orderNo,
            success: false,
            message: errorMessage || "Failed to pay for order",
          })
        }
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    // Check if any failed due to insufficient credit
    const insufficientCreditError = results.find((r) =>
      r.message?.toLowerCase().includes("insufficient credit")
    )

    let message: string
    if (failCount === 0) {
      message = `Successfully paid for ${successCount} orders`
    } else if (insufficientCreditError) {
      message = `Payment failed: Insufficient credit in EasyParcel wallet. Please top up your account at easyparcel.sg`
    } else {
      const failedResult = results.find((r) => !r.success)
      message = `Paid ${successCount} orders, ${failCount} failed: ${failedResult?.message || "Unknown error"}`
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
      message: `Failed to pay for orders: ${errorMessage}`,
      results: [],
    } as any)
  }
}

/**
 * OPTIONS /admin/easyparcel/pay
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
