import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../../modules/return";
import { EASYPARCEL_RETURN_MODULE } from "../../../../../../modules/easyparcel-return";
import { withAdminAuth } from "../../../../../../utils/admin-auth";

/**
 * EasyParcel API response types
 */
interface EasyParcelPayResult {
  status?: string;
  remarks?: string;
  messagenow?: string;
  order_no?: string;
  order_number?: string;
  orderno?: string;
  parcel_no?: string;
  parcel_number?: string;
  awb?: string;
  awb_id_link?: string;
  tracking_url?: string;
  tracking_number?: string;
  parcel?: Array<{
    awb?: string;
    tracking_url?: string;
  }>;
}

interface EasyParcelAPIResponse {
  api_status: string;
  error_code?: string | number;
  error_remark?: string;
  result?: EasyParcelPayResult[];
}

/**
 * Generate a mock AWB number for development/testing
 */
function generateMockAwb(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MOCK-RTN-${timestamp}-${random}`;
}

/**
 * Generate a mock parcel number
 */
function generateMockParcelNo(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `MPR-${num}`;
}

/**
 * POST /admin/return-requests/:id/shipping/pay
 * Pay for submitted return shipment and get AWB/tracking number
 */
export const POST = withAdminAuth(async (req, res) => {
  const { id } = req.params;

  const apiKey = process.env.EASYPARCEL_API_KEY;
  const useDemo = process.env.EASYPARCEL_USE_DEMO === "true";
  const useMockPayment = process.env.EASYPARCEL_MOCK_PAYMENT === "true";

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

  // Get the EasyParcel return record
  const easyParcelReturnService = req.scope.resolve(EASYPARCEL_RETURN_MODULE) as any;
  const easyParcelReturn = await easyParcelReturnService.getByReturnId(id);

  if (!easyParcelReturn) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Return shipment not submitted yet. Please submit the shipment first."
    );
  }

  if (!easyParcelReturn.order_no) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Return shipment order number not found"
    );
  }

  // Check if already paid
  if (easyParcelReturn.awb) {
    res.json({
      success: true,
      message: "Return shipment already paid",
      return_id: id,
      order_no: easyParcelReturn.order_no,
      awb: easyParcelReturn.awb,
      tracking_url: easyParcelReturn.tracking_url,
      already_paid: true,
    });
    return;
  }

  // === MOCK PAYMENT MODE ===
  if (useMockPayment) {
    console.log("[EasyParcel Return Pay] MOCK MODE - Generating simulated payment");

    const mockAwb = generateMockAwb();
    const mockParcelNo = generateMockParcelNo();
    const mockTrackingUrl = `https://track.easyparcel.sg/?awb=${mockAwb}`;

    // Update database with mock data
    await easyParcelReturnService.markAsPaid(
      easyParcelReturn.id,
      mockParcelNo,
      mockAwb,
      mockTrackingUrl
    );

    // Update return request with tracking info
    await returnService.markReturnInTransit(id, {
      courier: easyParcelReturn.courier_name,
      tracking_number: mockAwb,
    });

    res.json({
      success: true,
      message: "[MOCK] Return shipment paid successfully (simulated)",
      return_id: id,
      order_no: easyParcelReturn.order_no,
      parcel_no: mockParcelNo,
      awb: mockAwb,
      tracking_url: mockTrackingUrl,
      environment: "mock",
      mock_mode: true,
    });
    return;
  }

  // === REAL PAYMENT MODE ===
  const baseUrl = useDemo
    ? "http://demo.connect.easyparcel.sg"
    : "http://connect.easyparcel.sg";

  try {
    // Build request
    const params = new URLSearchParams();
    params.append("api", apiKey);
    params.append("bulk[0][order_no]", easyParcelReturn.order_no);

    console.log("[EasyParcel Return Pay] Paying for return shipment:", {
      return_id: id,
      order_no: easyParcelReturn.order_no,
    });

    const response = await fetch(`${baseUrl}/?ac=EPPayOrderBulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data: EasyParcelAPIResponse = await response.json();

    console.log("[EasyParcel Return Pay] API Response:", JSON.stringify(data, null, 2));

    // Check for API errors
    if (
      data.api_status === "Error" ||
      (data.error_code && data.error_code !== "0" && data.error_code !== 0)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        data.error_remark || "Failed to pay for return shipment"
      );
    }

    // Process result
    const result = data.result?.[0];
    if (!result) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No payment result returned from EasyParcel"
      );
    }

    // Extract AWB and tracking info
    const orderNo = result.orderno || result.order_no || result.order_number || easyParcelReturn.order_no;
    const parcelNo = result.parcel_no || result.parcel_number || "";

    let awb = result.awb || result.tracking_number || "";
    let trackingUrl = result.tracking_url || result.awb_id_link || "";

    // Check parcel array for AWB
    if (!awb && result.parcel && result.parcel.length > 0) {
      awb = result.parcel[0].awb || "";
      trackingUrl = trackingUrl || result.parcel[0].tracking_url || "";
    }

    // Check for error messages
    const errorMessage = result.messagenow || result.remarks || "";
    const isInsufficientCredit = errorMessage.toLowerCase().includes("insufficient credit");

    if (isInsufficientCredit) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Insufficient credit in EasyParcel wallet. Please top up your EasyParcel account."
      );
    }

    const isSuccess = result.status?.toLowerCase() === "success" ||
      (awb && !errorMessage.toLowerCase().includes("insufficient"));

    if (!isSuccess) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        errorMessage || "Failed to pay for return shipment"
      );
    }

    // Update EasyParcel return record
    if (awb) {
      await easyParcelReturnService.markAsPaid(
        easyParcelReturn.id,
        parcelNo,
        awb,
        trackingUrl
      );

      // Update return request with tracking info and mark as in_transit
      await returnService.markReturnInTransit(id, {
        courier: easyParcelReturn.courier_name,
        tracking_number: awb,
      });
    }

    res.json({
      success: true,
      message: "Return shipment paid successfully",
      return_id: id,
      order_no: orderNo,
      parcel_no: parcelNo,
      awb: awb || "Pending (Demo Mode)",
      tracking_url: trackingUrl,
      environment: useDemo ? "demo" : "production",
    });
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to pay for return shipment: ${errorMessage}`
    );
  }
});
