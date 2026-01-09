import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { withAdminAuth } from "../../../../utils/admin-auth"
import type { UpdateMemberPromotionRequest } from "../schemas"

/**
 * POST /admin/member-promotions/:id
 * Update a member-exclusive promotion
 * Requires admin authentication
 */
export const POST = withAdminAuth<UpdateMemberPromotionRequest>(async (req, res) => {
  const { code, type, value, is_active } = req.validatedBody
  const promotionId = req.params.id

  const promotionModuleService = req.scope.resolve(Modules.PROMOTION)
  const logger = req.scope.resolve("logger")

  try {
    // Get existing promotion
    const existingPromotion = await promotionModuleService.retrievePromotion(
      promotionId,
      {
        relations: ["application_method"],
      }
    )

    if (!existingPromotion) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Promotion with id ${promotionId} not found`
      )
    }

    // Update promotion
    const updateData: any = {}

    if (code) updateData.code = code
    if (is_active !== undefined) updateData.is_automatic = is_active

    // Update application method if type or value changed
    if (type || value !== undefined) {
      updateData.application_method = {
        ...existingPromotion.application_method,
        type: type || existingPromotion.application_method.type,
        value: value !== undefined ? value : existingPromotion.application_method.value,
      }
    }

    const [updatedPromotion] = await promotionModuleService.updatePromotions({
      id: promotionId,
      ...updateData
    })

    logger.info(`Updated member-exclusive promotion - id: ${promotionId}`)

    res.json({
      promotion: {
        id: updatedPromotion.id,
        code: updatedPromotion.code,
        type: updatedPromotion.type,
        is_active: updatedPromotion.is_automatic,
        application_method: updatedPromotion.application_method,
      },
    })
  } catch (error) {
    logger.error(`Failed to update member promotion: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to update promotion: ${error.message}`
      )
    }
  })

/**
 * DELETE /admin/member-promotions/:id
 * Delete a member-exclusive promotion
 * Requires admin authentication
 */
export const DELETE = withAdminAuth(async (req, res) => {
  const promotionId = req.params.id
  const promotionModuleService = req.scope.resolve(Modules.PROMOTION)
  const logger = req.scope.resolve("logger")

  try {
    await promotionModuleService.deletePromotions(promotionId)

    logger.info(`Deleted member-exclusive promotion - id: ${promotionId}`)

    res.json({
      success: true,
      id: promotionId,
    })
  } catch (error) {
    logger.error(`Failed to delete member promotion: ${error.message}`)

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to delete promotion: ${error.message}`
      )
    }
  })
