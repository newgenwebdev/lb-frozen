import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../../modules/return";
import { SHIPPING_SETTINGS_MODULE } from "../../../../../../modules/shipping-settings";
import { withAdminAuth } from "../../../../../../utils/admin-auth";

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
}

interface EasyParcelRateCheckResult {
  status: string;
  remarks?: string;
  rates?: EasyParcelRate[];
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
 * POST /admin/return-requests/:id/shipping/rates
 * Get available shipping rates for a return request
 *
 * Body (optional):
 * - weight: number in kg (overrides calculated weight)
 */
export const POST = withAdminAuth(async (req, res) => {
  const { id } = req.params;
  const body = req.body as { weight?: number } | undefined;

  const apiKey = process.env.EASYPARCEL_API_KEY;
  const useDemo = process.env.EASYPARCEL_USE_DEMO === "true";

  if (!apiKey) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "EasyParcel API key is not configured"
    );
  }

  // Get the return request to find customer address
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const returnRequest = await returnService.getReturn(id);

  if (!returnRequest) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Return request ${id} not found`
    );
  }

  // Get the original order to get customer's shipping address
  const orderModule = req.scope.resolve(Modules.ORDER);
  const orders = await orderModule.listOrders(
    { id: returnRequest.order_id },
    { relations: ["shipping_address"] }
  );

  if (!orders || orders.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Original order not found"
    );
  }

  const order = orders[0];
  const customerAddress = order.shipping_address;

  if (!customerAddress) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Customer shipping address not found"
    );
  }

  // Calculate weight from return items' variants
  let calculatedWeight = 0;
  const returnItems = returnRequest.items || [];

  if (returnItems.length > 0) {
    // Get variant IDs from return items
    const variantIds = returnItems.map((item: any) => item.variant_id).filter(Boolean);

    if (variantIds.length > 0) {
      // Get variants with their weights
      const productModule = req.scope.resolve(Modules.PRODUCT);
      const variants = await productModule.listProductVariants(
        { id: variantIds },
        { select: ["id", "weight"] }
      );

      // Create a map of variant weights
      const variantWeightMap = new Map<string, number>();
      for (const variant of variants) {
        // Weight in Medusa is stored in grams, convert to kg
        variantWeightMap.set(variant.id, (variant.weight || 0) / 1000);
      }

      // Calculate total weight based on quantities
      for (const item of returnItems) {
        const variantWeight = variantWeightMap.get(item.variant_id) || 0;
        calculatedWeight += variantWeight * (item.quantity || 1);
      }
    }
  }

  // Use provided weight if specified, otherwise use calculated weight (minimum 0.5kg)
  const weight = body?.weight || Math.max(calculatedWeight, 0.5);

  // Get warehouse/sender settings (this is where the return will be delivered TO)
  const shippingSettingsService = req.scope.resolve(SHIPPING_SETTINGS_MODULE) as any;
  const warehouseSettings = await shippingSettingsService.getSettings();

  if (!warehouseSettings) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Warehouse address not configured. Please configure it in Shipping Settings."
    );
  }

  const baseUrl = useDemo
    ? "http://demo.connect.easyparcel.sg"
    : "http://connect.easyparcel.sg";

  try {
    // For returns: pickup from customer (pick_code), deliver to warehouse (send_code)
    const customerPostcode = customerAddress.postal_code || "";
    const warehousePostcode = warehouseSettings.sender_postcode;

    // Build request with PHP-style array format
    const params = new URLSearchParams();
    params.append("api", apiKey);
    params.append("bulk[0][pick_code]", customerPostcode); // Customer postcode (pickup)
    params.append("bulk[0][pick_country]", "SG");
    params.append("bulk[0][send_code]", warehousePostcode); // Warehouse postcode (delivery)
    params.append("bulk[0][send_country]", "SG");
    params.append("bulk[0][weight]", weight.toString());

    console.log("[EasyParcel Return Rates] Request params:", {
      pick_code: customerPostcode,
      send_code: warehousePostcode,
      weight,
      calculated_weight: calculatedWeight,
    });

    const response = await fetch(`${baseUrl}/?ac=EPRateCheckingBulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data: EasyParcelAPIResponse = await response.json();

    // Check for API errors
    if (
      data.api_status === "Error" ||
      (data.error_code && data.error_code !== "0" && data.error_code !== 0)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        data.error_remark || "Failed to fetch rates from EasyParcel"
      );
    }

    // Extract rates from result
    const result = data.result?.[0];
    if (!result || result.status !== "Success" || !result.rates) {
      res.json({
        success: true,
        message: result?.remarks || "No rates available",
        rates: [],
        return_id: id,
        weight,
        calculated_weight: calculatedWeight,
        customer_postcode: customerPostcode,
        warehouse_postcode: warehousePostcode,
        environment: useDemo ? "demo" : "production",
      });
      return;
    }

    // Filter out point-to-point services that require locker/dropoff selection
    const filteredRates = result.rates.filter((rate) => {
      const serviceName = rate.service_name.toLowerCase();
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
      return_id: id,
      weight,
      calculated_weight: calculatedWeight,
      customer_postcode: customerPostcode,
      warehouse_postcode: warehousePostcode,
      customer_address: {
        name: `${customerAddress.first_name || ""} ${customerAddress.last_name || ""}`.trim(),
        address: customerAddress.address_1 || "",
        postcode: customerPostcode,
        phone: customerAddress.phone || "",
      },
      warehouse_address: {
        name: warehouseSettings.sender_name,
        address: warehouseSettings.sender_address,
        postcode: warehousePostcode,
        phone: warehouseSettings.sender_phone,
      },
      environment: useDemo ? "demo" : "production",
    });
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to fetch rates: ${errorMessage}`
    );
  }
});

/**
 * GET /admin/return-requests/:id/shipping/rates
 * Same as POST but with default weight
 */
export const GET = withAdminAuth(async (req, res) => {
  (req as any).body = { weight: 1 };
  return POST(req as any, res);
});
