import type { MedusaResponse } from "@medusajs/framework/http"
import { POINTS_MODULE } from "../../../../modules/points"
import { MEMBERSHIP_MODULE } from "../../../../modules/membership"
import { withAdminAuth } from "../../../../utils/admin-auth"

/**
 * GET /admin/points/stats
 * Get points system statistics
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const pointsService = req.scope.resolve(POINTS_MODULE) as any
  const membershipService = req.scope.resolve(MEMBERSHIP_MODULE) as any

  // Get overall stats
  const stats = await pointsService.getStats()

  // Get total members count
  const [, membersCount] = await membershipService.listActiveMembers({
    limit: 1,
    offset: 0,
  })

  // Calculate average points per member
  const avgPointsPerMember =
    membersCount > 0
      ? Math.round(stats.total_points_outstanding / membersCount)
      : 0

  res.json({
    stats: {
      total_members: membersCount,
      total_points_issued: stats.total_points_issued,
      total_points_redeemed: stats.total_points_redeemed,
      total_points_outstanding: stats.total_points_outstanding,
      average_points_per_member: avgPointsPerMember,
      redemption_rate_percent:
        stats.total_points_issued > 0
          ? Math.round(
              (stats.total_points_redeemed / stats.total_points_issued) * 100
            )
          : 0,
    },
  })
})
