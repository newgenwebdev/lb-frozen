import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../modules/return";
import { withAdminAuth } from "../../../../../utils/admin-auth";

/**
 * POST /admin/returns/:id/received
 * Mark return as received at warehouse
 */
export const POST = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const { id } = req.params;

  try {
    const returnRequest = await returnService.markReturnReceived(id);

    res.json({
      success: true,
      return: returnRequest,
    });
  } catch (error: any) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message);
  }
});
