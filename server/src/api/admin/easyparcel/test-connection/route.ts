import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * POST /admin/easyparcel/test-connection
 * Test the EasyParcel API connection using configured credentials
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

  // Check if API key is configured
  if (!apiKey) {
    res.json({
      success: false,
      message: "EasyParcel API key is not configured",
      environment: useDemo ? "demo" : "production",
    });
    return;
  }

  // Determine API URL based on environment
  // Per EasyParcel docs: http://connect.easyparcel.sg (live) or http://demo.connect.easyparcel.sg (demo)
  const baseUrl = useDemo
    ? "http://demo.connect.easyparcel.sg"
    : "http://connect.easyparcel.sg";

  try {
    // Test connection using a simple rate check with minimal data
    // This is a lightweight way to verify the API key works
    // EasyParcel expects PHP-style array format for bulk parameter
    const params = new URLSearchParams();
    params.append("api", apiKey);
    params.append("bulk[0][pick_code]", "059893");
    params.append("bulk[0][pick_country]", "SG");
    params.append("bulk[0][send_code]", "059897");
    params.append("bulk[0][send_country]", "SG");
    params.append("bulk[0][weight]", "1");

    const response = await fetch(`${baseUrl}/?ac=EPRateCheckingBulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await response.json();

    // EasyParcel API returns api_status: "Error" with error_code for issues
    // error_code 3 = Required api key, 4 = Invalid api key, 5 = Unauthorized user
    // Note: error_code "0" means success, so we check for truthy non-zero values
    if (data.api_status === "Error" || (data.error_code && data.error_code !== "0" && data.error_code !== 0)) {
      res.json({
        success: false,
        message: data.error_remark || "API authentication failed",
        environment: useDemo ? "demo" : "production",
      });
      return;
    }

    // If api_status is "Success", connection is working
    res.json({
      success: true,
      message: "Connected successfully",
      environment: useDemo ? "demo" : "production",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    res.json({
      success: false,
      message: `Connection failed: ${errorMessage}`,
      environment: useDemo ? "demo" : "production",
    });
  }
};

/**
 * OPTIONS /admin/easyparcel/test-connection
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
