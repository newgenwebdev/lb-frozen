import { MedusaService } from "@medusajs/framework/utils"
import type { InferTypeOf } from "@medusajs/framework/types"
import Brand from "../models/brand"

// Infer the type from the model
type BrandType = InferTypeOf<typeof Brand>

type CreateBrandInput = {
  name: string
  handle: string
  description?: string | null
  logo_url?: string | null
  is_active?: boolean
  rank?: number
}

type UpdateBrandInput = {
  id: string
  name?: string
  handle?: string
  description?: string | null
  logo_url?: string | null
  is_active?: boolean
  rank?: number
}

/**
 * BrandModuleService
 * Handles brand CRUD operations
 *
 * MedusaService auto-generates methods based on the model passed.
 * For { Brand }, it generates: listBrands, createBrands, etc.
 *
 * IMPORTANT: Service class should NOT be named BrandService
 * (e.g., BrandService) because it would conflict with the internal service
 * Medusa generates for the Brand model. Use BrandModuleService instead.
 */
class BrandModuleService extends MedusaService({
  Brand,
}) {
  /**
   * Create a new brand
   */
  async createBrand(data: CreateBrandInput): Promise<BrandType> {
    // Use type assertion for auto-generated method
    const brand = await (this as any).createBrands({
      name: data.name,
      handle: data.handle,
      description: data.description ?? null,
      logo_url: data.logo_url ?? null,
      is_active: data.is_active ?? true,
      rank: data.rank ?? 0,
    })

    return brand as BrandType
  }

  /**
   * Update a brand
   */
  async updateBrand(data: UpdateBrandInput): Promise<BrandType> {
    const updateData: Record<string, unknown> = { id: data.id }

    if (data.name !== undefined) updateData.name = data.name
    if (data.handle !== undefined) updateData.handle = data.handle
    if (data.description !== undefined) updateData.description = data.description
    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (data.rank !== undefined) updateData.rank = data.rank

    // Use type assertion for auto-generated method
    const brand = await (this as any).updateBrands(updateData)

    return brand as BrandType
  }

  /**
   * Get brand by handle
   */
  async getBrandByHandle(handle: string): Promise<BrandType | null> {
    // Use type assertion for auto-generated method
    const brands = await (this as any).listBrands(
      { handle },
      { take: 1 }
    ) as BrandType[]
    return brands[0] || null
  }

  /**
   * Get brand by ID
   */
  async getBrandById(id: string): Promise<BrandType> {
    // Use type assertion for auto-generated method
    const brand = await (this as any).retrieveBrand(id)
    return brand as BrandType
  }

  /**
   * List all brands with pagination
   */
  async listAllBrands(filters?: {
    is_active?: boolean
    limit?: number
    offset?: number
  }): Promise<readonly [BrandType[], number]> {
    const queryFilters: Record<string, unknown> = {}

    if (filters?.is_active !== undefined) {
      queryFilters.is_active = filters.is_active
    }

    // Use type assertion for auto-generated method
    const brands = await (this as any).listBrands(
      queryFilters,
      {
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
        order: { rank: "ASC", name: "ASC" },
      }
    ) as BrandType[]

    // Return as tuple [brands, count] to maintain compatibility
    return [brands, brands.length] as const
  }

  /**
   * Delete a brand
   */
  async deleteBrand(id: string): Promise<void> {
    // Use type assertion for auto-generated method
    await (this as any).deleteBrands(id)
  }
}

export default BrandModuleService
