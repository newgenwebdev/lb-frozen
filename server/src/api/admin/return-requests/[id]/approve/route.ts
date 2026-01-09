import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../modules/return";
import { withAdminAuth } from "../../../../../utils/admin-auth";

type ApproveReturnBody = {
  admin_notes?: string;
};

/**
 * POST /admin/returns/:id/approve
 * Approve a return request
 */
export const POST = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const { id } = req.params;
  const body = req.body as ApproveReturnBody;

  try {
    const returnRequest = await returnService.approveReturn(id, body.admin_notes);

    res.json({
      success: true,
      return: returnRequest,
    });
  } catch (error: any) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message);
  }
});
