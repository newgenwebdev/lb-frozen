import type { MedusaResponse } from "@medusajs/framework/http";
import { RETURN_MODULE } from "../../../../modules/return";
import { withAdminAuth } from "../../../../utils/admin-auth";

/**
 * GET /admin/returns/stats
 * Get return statistics for dashboard
 */
export const GET = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;

  try {
    const stats = await returnService.getReturnStats();

    res.json({
      stats,
    });
  } catch (error: any) {
    // Log detailed error internally but return generic message to client
    const logger = req.scope.resolve("logger");
    logger.error(`[RETURN-STATS] Failed to get return stats: ${error.message}`);
    res.status(500).json({
      message: "Failed to get return stats",
    } as any);
  }
});
