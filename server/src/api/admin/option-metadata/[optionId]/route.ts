import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import pg from "pg"
import { withAdminAuth } from "../../../../utils/admin-auth"

type UpdateOptionMetadataRequest = {
  metadata: Record<string, unknown>
}

/**
 * POST /admin/option-metadata/:optionId
 * Update product option metadata (e.g., option images)
 *
 * Note: Uses direct database access because Medusa 2.x doesn't support
 * updating option metadata through the product module.
 */
export const POST = withAdminAuth<UpdateOptionMetadataRequest>(async (req, res) => {
  const { optionId } = req.params
  const { metadata } = req.body

  if (!metadata) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "metadata is required"
    )
  }

  const logger = req.scope.resolve("logger")

  // Use pg client to directly access the database
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()

    // First, get the current option to merge metadata
    const selectResult = await client.query(
      `SELECT id, title, metadata FROM product_option WHERE id = $1`,
      [optionId]
    )

    if (selectResult.rows.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product option with id ${optionId} not found`
      )
    }

    const currentOption = selectResult.rows[0]

    // Merge existing metadata with new metadata
    const existingMetadata = currentOption.metadata || {}
    const mergedMetadata = {
      ...existingMetadata,
      ...metadata,
    }

    // Update the option metadata
    await client.query(
      `UPDATE product_option SET metadata = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(mergedMetadata), optionId]
    )

    logger.info(`Updated option metadata - optionId: ${optionId}`)

    res.json({
      option: {
        id: optionId,
        title: currentOption.title,
        metadata: mergedMetadata,
      },
    })
  } catch (error: any) {
    logger.error(`Failed to update option metadata: ${error.message}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to update option metadata: ${error.message}`
    )
  } finally {
    await client.end()
  }
})
