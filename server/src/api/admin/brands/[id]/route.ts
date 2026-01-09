import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../../modules/brand"
import type BrandModuleService from "../../../../modules/brand/services/brand"
import { UpdateBrandSchema } from "../schemas"

/**
 * Helper to check admin authentication
 */
function checkAuth(req: MedusaRequest, res: MedusaResponse): boolean {
  const authContext = (req as any).auth_context
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any)
    return false
  }
  return true
}

/**
 * GET /admin/brands/:id
 * Get a single brand by ID
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  if (!checkAuth(req, res)) return

  const { id } = req.params
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  try {
    const brand = await brandService.getBrandById(id)
    res.json({ brand })
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${id}" not found`
    )
  }
}

/**
 * PUT /admin/brands/:id
 * Update a brand
 */
export const PUT = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  if (!checkAuth(req, res)) return

  const { id } = req.params
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  // Validate request body
  const result = UpdateBrandSchema.safeParse(req.body)
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message)
  }

  const data = result.data

  // Check if brand exists
  try {
    await brandService.getBrandById(id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${id}" not found`
    )
  }

  // If updating handle, check for duplicates
  if (data.handle) {
    const existing = await brandService.getBrandByHandle(data.handle)
    if (existing && existing.id !== id) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Brand with handle "${data.handle}" already exists`
      )
    }
  }

  // Update brand
  const brand = await brandService.updateBrand({
    id,
    ...data,
  })

  res.json({ brand })
}

/**
 * DELETE /admin/brands/:id
 * Delete a brand
 */
export const DELETE = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  if (!checkAuth(req, res)) return

  const { id } = req.params
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  // Check if brand exists
  try {
    await brandService.getBrandById(id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${id}" not found`
    )
  }

  // Delete brand
  await brandService.deleteBrand(id)

  res.status(200).json({ success: true })
}

/**
 * OPTIONS /admin/brands/:id
 */
export const OPTIONS = async (_req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  res.sendStatus(200)
}
