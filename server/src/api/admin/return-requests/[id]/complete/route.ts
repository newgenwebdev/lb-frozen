import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../modules/return";
import { withAdminAuth } from "../../../../../utils/admin-auth";

/**
 * POST /admin/returns/:id/complete
 * Complete return (after inspection passed)
 */
export const POST = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const { id } = req.params;
  const { admin_notes } = req.body as { admin_notes?: string };

  try {
    const returnRequest = await returnService.completeReturn(id, admin_notes);

    res.json({
      success: true,
      return: returnRequest,
    });
  } catch (error: any) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message);
  }
});
