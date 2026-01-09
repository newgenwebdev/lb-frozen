import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../modules/return";
import { withAdminAuth } from "../../../../../utils/admin-auth";

type InTransitBody = {
  courier: string;
  tracking_number: string;
};

/**
 * POST /admin/returns/:id/in-transit
 * Mark return as in transit (customer shipped product back)
 */
export const POST = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const { id } = req.params;
  const body = req.body as InTransitBody;

  if (!body.courier) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Courier is required");
  }
  if (!body.tracking_number) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Tracking number is required");
  }

  try {
    const returnRequest = await returnService.markReturnInTransit(id, {
      courier: body.courier,
      tracking_number: body.tracking_number,
    });

    res.json({
      success: true,
      return: returnRequest,
    });
  } catch (error: any) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message);
  }
});
