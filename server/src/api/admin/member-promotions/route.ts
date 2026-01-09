import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { MEMBERSHIP_GROUP_ID } from "../../../lib/constants"
import { withAdminAuth } from "../../../utils/admin-auth"
import type { CreateMemberPromotionRequest } from "./schemas"

/**
 * POST /admin/member-promotions
 * Create a member-exclusive promotion
 */
export const POST = withAdminAuth<CreateMemberPromotionRequest>(async (req, res) => {
  const {
    code,
    description,
    type,
    value,
    currency_code,
    is_active,
    target_type,
    starts_at,
    ends_at,
  } = req.validatedBody

  if (type === "fixed" && !currency_code) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "currency_code is required for fixed discount type"
    )
  }

  const promotionModuleService = req.scope.resolve(Modules.PROMOTION)
  const logger = req.scope.resolve("logger")

  try {
    // Create promotion with member group rule
    const promotion = await promotionModuleService.createPromotions({
      code,
      type: "standard",
      is_automatic: false,
      status: is_active ? "active" : "inactive",
      application_method: {
        type,
        value,
        currency_code: type === "fixed" ? currency_code : undefined,
        target_type: target_type || "order",
      },
      rules: [
        {
          attribute: "customer.groups.id",
          operator: "in",
          values: [MEMBERSHIP_GROUP_ID],
        },
      ],
    })

    logger.info(`Created member-exclusive promotion - code: ${code}`)

    res.json({
      promotion: {
        id: promotion.id,
        code: promotion.code,
        type: promotion.type,
        description,
        is_active,
        application_method: promotion.application_method,
        rules: promotion.rules,
      },
    })
  } catch (error) {
    logger.error(`Failed to create member promotion: ${error.message}`)

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to create promotion: ${error.message}`
    )
  }
})

/**
 * GET /admin/member-promotions
 * List all member-exclusive promotions
 */
export const GET = withAdminAuth(async (req, res) => {
  const promotionModuleService = req.scope.resolve(Modules.PROMOTION)

  // Get all promotions (we'll filter for member-only)
  const promotions = await promotionModuleService.listPromotions(
    {},
    {
      relations: ["rules", "application_method"],
    }
  )

  // Filter for promotions with member group rule
  const memberPromotions = promotions.filter((promo) =>
    promo.rules?.some(
      (rule: any) =>
        rule.attribute === "customer.groups.id" &&
        rule.values?.includes(MEMBERSHIP_GROUP_ID)
    )
  )

  res.json({
    promotions: memberPromotions.map((p) => ({
      id: p.id,
      code: p.code,
      type: p.type,
      is_automatic: p.is_automatic,
      application_method: p.application_method,
      rules: p.rules,
    })),
    count: memberPromotions.length,
  })
})
