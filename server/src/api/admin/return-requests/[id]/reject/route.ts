import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../modules/return";
import { withAdminAuth } from "../../../../../utils/admin-auth";

type RejectReturnBody = {
  reason: string;
};

/**
 * POST /admin/returns/:id/reject
 * Reject a return request
 */
export const POST = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const { id } = req.params;
  const body = req.body as RejectReturnBody;

  if (!body.reason) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Rejection reason is required");
  }

  try {
    const returnRequest = await returnService.rejectReturn(id, body.reason);

    res.json({
      success: true,
      return: returnRequest,
    });
  } catch (error: any) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message);
  }
});
