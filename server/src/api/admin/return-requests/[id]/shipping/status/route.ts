import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../../modules/return";
import { EASYPARCEL_RETURN_MODULE } from "../../../../../../modules/easyparcel-return";
import { withAdminAuth } from "../../../../../../utils/admin-auth";

/**
 * GET /admin/return-requests/:id/shipping/status
 * Get EasyParcel shipping status for a return request
 */
export const GET = withAdminAuth(async (req, res) => {
  const { id } = req.params;

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
    res.json({
      success: true,
      return_id: id,
      has_easyparcel_shipping: false,
      message: "No EasyParcel shipping configured for this return",
    });
    return;
  }

  res.json({
    success: true,
    return_id: id,
    has_easyparcel_shipping: true,
    shipping: {
      id: easyParcelReturn.id,
      order_no: easyParcelReturn.order_no,
      parcel_no: easyParcelReturn.parcel_no,
      awb: easyParcelReturn.awb,
      status: easyParcelReturn.status,
      courier_name: easyParcelReturn.courier_name,
      service_name: easyParcelReturn.service_name,
      weight: easyParcelReturn.weight,
      rate: easyParcelReturn.rate,
      pickup_date: easyParcelReturn.pickup_date,
      tracking_url: easyParcelReturn.tracking_url,
      sender: {
        name: easyParcelReturn.sender_name,
        phone: easyParcelReturn.sender_phone,
        address: easyParcelReturn.sender_address,
        postcode: easyParcelReturn.sender_postcode,
      },
      receiver: {
        name: easyParcelReturn.receiver_name,
        phone: easyParcelReturn.receiver_phone,
        address: easyParcelReturn.receiver_address,
        postcode: easyParcelReturn.receiver_postcode,
      },
      created_at: easyParcelReturn.created_at,
      updated_at: easyParcelReturn.updated_at,
    },
  });
});
