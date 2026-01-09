import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/services/brand"
import { CreateBrandSchema } from "./schemas"

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
 * GET /admin/brands
 * List all brands with pagination
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  if (!checkAuth(req, res)) return

  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  // Parse query params
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0
  const is_active = req.query.is_active === "true" ? true : req.query.is_active === "false" ? false : undefined

  // Get brands
  const [brands, count] = await brandService.listAllBrands({
    is_active,
    limit,
    offset,
  })

  res.json({
    brands,
    count,
    limit,
    offset,
  })
}

/**
 * POST /admin/brands
 * Create a new brand
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  if (!checkAuth(req, res)) return

  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  // Validate request body
  const result = CreateBrandSchema.safeParse(req.body)
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message)
  }

  const data = result.data

  // Check if handle already exists
  const existing = await brandService.getBrandByHandle(data.handle)
  if (existing) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Brand with handle "${data.handle}" already exists`
    )
  }

  // Create brand
  const brand = await brandService.createBrand({
    name: data.name,
    handle: data.handle,
    description: data.description,
    logo_url: data.logo_url,
    is_active: data.is_active,
    rank: data.rank,
  })

  res.status(201).json({ brand })
}

/**
 * OPTIONS /admin/brands
 */
export const OPTIONS = async (_req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  res.sendStatus(200)
}
