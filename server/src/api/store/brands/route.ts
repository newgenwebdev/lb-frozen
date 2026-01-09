import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import type BrandModuleService from "../../../modules/brand/services/brand"

/**
 * GET /store/brands
 * List all active brands for storefront (public endpoint)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  // Get only active brands, ordered by rank
  const [brands] = await brandService.listAllBrands({
    is_active: true,
    limit: 100,
    offset: 0,
  })

  res.json({
    brands: brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      handle: brand.handle,
      description: brand.description,
      logo_url: brand.logo_url,
    })),
    count: brands.length,
  })
}

/**
 * OPTIONS /store/brands
 */
export const OPTIONS = async (_req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  res.sendStatus(200)
}
