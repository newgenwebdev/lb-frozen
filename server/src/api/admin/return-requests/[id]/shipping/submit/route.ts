import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../../modules/return";
import { SHIPPING_SETTINGS_MODULE } from "../../../../../../modules/shipping-settings";
import { EASYPARCEL_RETURN_MODULE } from "../../../../../../modules/easyparcel-return";
import { withAdminAuth } from "../../../../../../utils/admin-auth";

/**
 * Format and validate Singapore phone number for EasyParcel
 */
function formatSingaporePhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Remove country code if present (65)
  if (cleaned.startsWith("65") && cleaned.length > 8) {
    cleaned = cleaned.slice(2);
  }

  // Singapore mobile numbers are 8 digits starting with 8 or 9
  if (cleaned.length === 8 && (cleaned.startsWith("8") || cleaned.startsWith("9"))) {
    return cleaned;
  }

  // Singapore landlines are 8 digits starting with 6
  if (cleaned.length === 8 && cleaned.startsWith("6")) {
    return cleaned;
  }

  return null;
}

interface SubmitRequest {
  service_id: string;
  service_name: string;
  courier_id: string;
  courier_name: string;
  weight: number;
  rate: number; // in cents
  pickup_date: string; // YYYY-MM-DD
  pickup_time?: string;
  content?: string; // Package content description
}

interface EasyParcelSubmitResult {
  status: string;
  remarks?: string;
  order_number?: string;
  parcel_number?: string;
}

interface EasyParcelAPIResponse {
  api_status: string;
  error_code?: string | number;
  error_remark?: string;
  result?: EasyParcelSubmitResult[];
}

/**
 * POST /admin/return-requests/:id/shipping/submit
 * Submit return shipment to EasyParcel
 */
export const POST = withAdminAuth(async (req, res) => {
  const { id } = req.params;
  const body = req.body as SubmitRequest;

  // Validate required fields
  if (!body.service_id || !body.courier_id || !body.pickup_date) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "service_id, courier_id, and pickup_date are required"
    );
  }

  const apiKey = process.env.EASYPARCEL_API_KEY;
  const useDemo = process.env.EASYPARCEL_USE_DEMO === "true";

  if (!apiKey) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "EasyParcel API key is not configured"
    );
  }

  // Get the return request
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const returnRequest = await returnService.getReturn(id);

  if (!returnRequest) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Return request ${id} not found`
    );
  }

  // Check if already submitted
  const easyParcelReturnService = req.scope.resolve(EASYPARCEL_RETURN_MODULE) as any;
  const existingSubmission = await easyParcelReturnService.getByReturnId(id);

  if (existingSubmission && existingSubmission.order_no) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Return shipping already submitted with order number: ${existingSubmission.order_no}`
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

  // Get warehouse settings (receiver for returns)
  const shippingSettingsService = req.scope.resolve(SHIPPING_SETTINGS_MODULE) as any;
  const warehouseSettings = await shippingSettingsService.getSettings();

  if (!warehouseSettings) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Warehouse address not configured"
    );
  }

  // Validate phone numbers
  const customerPhone = formatSingaporePhone(customerAddress.phone || "");
  const warehousePhone = formatSingaporePhone(warehouseSettings.sender_phone);

  if (!customerPhone) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid customer phone number: ${customerAddress.phone}. Must be valid Singapore number (8 digits starting with 6, 8, or 9).`
    );
  }

  if (!warehousePhone) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid warehouse phone number: ${warehouseSettings.sender_phone}. Please update in Shipping Settings.`
    );
  }

  const baseUrl = useDemo
    ? "http://demo.connect.easyparcel.sg"
    : "http://connect.easyparcel.sg";

  try {
    // Build request - For returns: sender is customer, receiver is warehouse
    const params = new URLSearchParams();
    params.append("api", apiKey);

    // Sender (pickup) info - Customer address
    const customerName = `${customerAddress.first_name || ""} ${customerAddress.last_name || ""}`.trim();
    params.append("bulk[0][pick_name]", customerName || "Customer");
    params.append("bulk[0][pick_company]", "");
    params.append("bulk[0][pick_contact]", customerPhone);
    params.append("bulk[0][pick_mobile]", customerPhone);
    params.append("bulk[0][pick_addr1]", customerAddress.address_1 || "");
    params.append("bulk[0][pick_addr2]", customerAddress.address_2 || "");
    params.append("bulk[0][pick_unit]", "-");
    params.append("bulk[0][pick_state]", "Singapore");
    params.append("bulk[0][pick_code]", customerAddress.postal_code || "");
    params.append("bulk[0][pick_country]", "SG");

    // Receiver (delivery) info - Warehouse address
    params.append("bulk[0][send_name]", warehouseSettings.sender_name);
    params.append("bulk[0][send_company]", warehouseSettings.sender_name);
    params.append("bulk[0][send_contact]", warehousePhone);
    params.append("bulk[0][send_mobile]", warehousePhone);
    params.append("bulk[0][send_addr1]", warehouseSettings.sender_address);
    params.append("bulk[0][send_addr2]", "");
    params.append("bulk[0][send_unit]", warehouseSettings.sender_unit || "-");
    params.append("bulk[0][send_state]", "Singapore");
    params.append("bulk[0][send_code]", warehouseSettings.sender_postcode);
    params.append("bulk[0][send_country]", warehouseSettings.sender_country || "SG");

    // Package details
    params.append("bulk[0][weight]", (body.weight || 1).toString());
    params.append("bulk[0][width]", "10");
    params.append("bulk[0][length]", "10");
    params.append("bulk[0][height]", "10");
    params.append("bulk[0][content]", body.content || "Return Items");
    params.append("bulk[0][value]", ((body.rate || 0) / 100).toFixed(2));
    params.append("bulk[0][service_id]", body.service_id);
    params.append("bulk[0][collect_date]", body.pickup_date);
    params.append("bulk[0][sms]", "1"); // Enable SMS notification for returns

    // Reference for tracking
    params.append("bulk[0][reference]", `RETURN-${id}`);

    console.log("[EasyParcel Return Submit] Submitting return shipment:", {
      return_id: id,
      order_id: returnRequest.order_id,
      service_id: body.service_id,
      courier: body.courier_name,
      pickup_from: customerName,
      deliver_to: warehouseSettings.sender_name,
    });

    const response = await fetch(`${baseUrl}/?ac=EPSubmitOrderBulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data: EasyParcelAPIResponse = await response.json();

    console.log("[EasyParcel Return Submit] API Response:", JSON.stringify(data, null, 2));

    // Check for API errors
    if (
      data.api_status === "Error" ||
      (data.error_code && data.error_code !== "0" && data.error_code !== 0)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        data.error_remark || "Failed to submit return shipment to EasyParcel"
      );
    }

    // Process result
    const result = data.result?.[0];
    if (!result || result.status !== "Success" || !result.order_number) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        result?.remarks || "Failed to create return shipment order"
      );
    }

    // Save to database
    const easyParcelReturn = await easyParcelReturnService.createReturn({
      return_id: id,
      order_id: returnRequest.order_id,
      order_no: result.order_number,
      parcel_no: result.parcel_number || null,
      service_id: body.service_id,
      service_name: body.service_name,
      courier_id: body.courier_id,
      courier_name: body.courier_name,
      weight: body.weight || 1,
      rate: body.rate || 0,
      pickup_date: body.pickup_date,
      pickup_time: body.pickup_time || null,
      sender_name: customerName,
      sender_phone: customerPhone,
      sender_address: customerAddress.address_1 || "",
      sender_postcode: customerAddress.postal_code || "",
      sender_country: "SG",
      receiver_name: warehouseSettings.sender_name,
      receiver_phone: warehousePhone,
      receiver_address: warehouseSettings.sender_address,
      receiver_postcode: warehouseSettings.sender_postcode,
      receiver_country: warehouseSettings.sender_country || "SG",
      status: "order_created",
    });

    res.json({
      success: true,
      message: "Return shipment submitted to EasyParcel",
      return_id: id,
      order_no: result.order_number,
      easyparcel_return_id: easyParcelReturn.id,
      environment: useDemo ? "demo" : "production",
    });
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to submit return shipment: ${errorMessage}`
    );
  }
});
