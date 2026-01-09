import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * EasyParcel tracking event
 */
interface TrackingEvent {
  date: string
  time: string
  status: string
  location?: string
  description?: string
}

/**
 * EasyParcel API response types
 */
interface EasyParcelTrackResult {
  status: string
  remarks?: string
  awb?: string
  courier?: string
  parcel_status?: string
  tracking?: TrackingEvent[]
}

interface EasyParcelAPIResponse {
  api_status: string
  error_code?: string | number
  error_remark?: string
  result?: EasyParcelTrackResult[]
}

/**
 * GET /admin/easyparcel/track/[awb]
 * Get tracking history for a shipment
 */
export const GET = async (
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

  const { awb } = req.params
  if (!awb) {
    res.status(400).json({
      success: false,
      message: "AWB number is required",
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
    params.append("bulk[0][awb]", awb)

    const response = await fetch(`${baseUrl}/?ac=EPTrackingBulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    })

    const data: EasyParcelAPIResponse = await response.json()

    // Check for API errors
    if (
      data.api_status === "Error" ||
      (data.error_code && data.error_code !== "0" && data.error_code !== 0)
    ) {
      res.status(400).json({
        success: false,
        message: data.error_remark || "Failed to fetch tracking info",
      } as any)
      return
    }

    const result = data.result?.[0]
    if (!result || result.status !== "Success") {
      res.json({
        success: false,
        message: result?.remarks || "No tracking information available",
        awb,
      })
      return
    }

    res.json({
      success: true,
      awb,
      courier: result.courier,
      parcel_status: result.parcel_status,
      tracking: result.tracking || [],
      environment: useDemo ? "demo" : "production",
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"
    res.status(500).json({
      success: false,
      message: `Failed to fetch tracking: ${errorMessage}`,
    } as any)
  }
}

/**
 * OPTIONS /admin/easyparcel/track/[awb]
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
