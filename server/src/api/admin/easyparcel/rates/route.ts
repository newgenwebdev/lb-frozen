import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * EasyParcel Rate Response Types
 */
interface EasyParcelRate {
  service_id: string;
  service_name: string;
  courier_id: string;
  courier_name: string;
  courier_logo: string;
  price: number;
  pickup_date: string;
  delivery: string;
  addon_cod: string;
  addon_insurance: string;
  addon_packing: string;
  dropoff_point?: string[];
}

interface EasyParcelRateCheckResult {
  status: string;
  remarks?: string;
  rates?: EasyParcelRate[];
  pgeon_point?: unknown[];
}

interface EasyParcelAPIResponse {
  api_status: string;
  error_code?: string | number;
  error_remark?: string;
  result?: EasyParcelRateCheckResult[];
}

interface FormattedRate {
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
}

/**
 * POST /admin/easyparcel/rates
 * Fetch available shipping rates from EasyParcel
 *
 * Body (optional):
 * - receiver_postcode: string (default: use a sample SG postcode)
 * - weight: number in kg (default: 1)
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any);
    return;
  }

  const apiKey = process.env.EASYPARCEL_API_KEY;
  const useDemo = process.env.EASYPARCEL_USE_DEMO === "true";

  if (!apiKey) {
    res.status(400).json({
      success: false,
      message: "EasyParcel API key is not configured",
      rates: [],
    } as any);
    return;
  }

  // Get pickup postcode from shipping settings or use default
  const senderPostcode = "059893"; // Default Singapore postcode

  // Get request body parameters
  const body = req.body as { receiver_postcode?: string; weight?: number } | undefined;
  const receiverPostcode = body?.receiver_postcode || "059897";
  const weight = body?.weight || 1;

  const baseUrl = useDemo
    ? "http://demo.connect.easyparcel.sg"
    : "http://connect.easyparcel.sg";

  try {
    // Build request with PHP-style array format
    const params = new URLSearchParams();
    params.append("api", apiKey);
    params.append("bulk[0][pick_code]", senderPostcode);
    params.append("bulk[0][pick_country]", "SG");
    params.append("bulk[0][send_code]", receiverPostcode);
    params.append("bulk[0][send_country]", "SG");
    params.append("bulk[0][weight]", weight.toString());

    let response: Response;
    let data: EasyParcelAPIResponse;

    try {
      response = await fetch(`${baseUrl}/?ac=EPRateCheckingBulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      data = await response.json();
    } catch (fetchError) {
      console.error("[EasyParcel] Fetch error:", fetchError);
      res.status(500).json({
        success: false,
        message: `Failed to connect to EasyParcel API: ${fetchError instanceof Error ? fetchError.message : "Network error"}`,
        rates: [],
      } as any);
      return;
    }

    // Check for API errors
    if (data.api_status === "Error" || (data.error_code && data.error_code !== "0" && data.error_code !== 0)) {
      res.status(400).json({
        success: false,
        message: data.error_remark || "Failed to fetch rates",
        rates: [],
      } as any);
      return;
    }

    // Extract rates from result
    const result = data.result?.[0];
    if (!result || result.status !== "Success" || !result.rates) {
      res.json({
        success: true,
        message: result?.remarks || "No rates available",
        rates: [],
        environment: useDemo ? "demo" : "production",
      });
      return;
    }

    // Filter out point-to-point services that require locker/dropoff selection
    // These services need additional UI for selecting pickup/dropoff points
    const filteredRates = result.rates.filter((rate) => {
      const serviceName = rate.service_name.toLowerCase();
      // Exclude services that require dropoff/pickup points
      if (serviceName.includes("point to point") || serviceName.includes("dropoff")) {
        return false;
      }
      return true;
    });

    // Format rates for frontend
    const formattedRates: FormattedRate[] = filteredRates.map((rate) => ({
      service_id: rate.service_id,
      service_name: rate.service_name,
      courier_id: rate.courier_id,
      courier_name: rate.courier_name,
      courier_logo: rate.courier_logo,
      price: parseFloat(rate.price.toString()),
      price_display: `$${parseFloat(rate.price.toString()).toFixed(2)}`,
      pickup_date: rate.pickup_date,
      delivery_eta: rate.delivery,
      has_cod: rate.addon_cod === "1",
      has_insurance: rate.addon_insurance === "1",
    }));

    // Sort by price (lowest first)
    formattedRates.sort((a, b) => a.price - b.price);

    res.json({
      success: true,
      rates: formattedRates,
      count: formattedRates.length,
      environment: useDemo ? "demo" : "production",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({
      success: false,
      message: `Failed to fetch rates: ${errorMessage}`,
      rates: [],
    } as any);
  }
};

/**
 * GET /admin/easyparcel/rates
 * Fetch available couriers (same as POST but with defaults)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Reuse POST handler with empty body
  (req as any).body = {};
  return POST(req, res);
};

/**
 * OPTIONS /admin/easyparcel/rates
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
