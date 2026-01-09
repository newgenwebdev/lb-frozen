import Medusa from "@medusajs/js-sdk";
import type {
  MedusaProduct,
  MedusaProductCategory,
  BulkDealProduct,
  StoreBrand,
} from "./types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY;

// Initialize Medusa SDK
export const medusa = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_API_KEY,
});

/**
 * Get the default region ID
 */
async function getDefaultRegionId(): Promise<string | undefined> {
  try {
    const response = await medusa.store.region.list();
    return response.regions?.[0]?.id;
  } catch {
    return undefined;
  }
}

/**
 * Product filter parameters
 */
export type ProductFilters = {
  category_id?: string[];
  q?: string;
};

/**
 * Fetch all products from Medusa API with optional filters
 */
export async function getProducts(
  filters?: ProductFilters
): Promise<MedusaProduct[]> {
  try {
    const regionId = await getDefaultRegionId();

    const response = await medusa.store.product.list({
      fields:
        "*variants,*variants.calculated_price,*variants.prices,*variants.options,*variants.options.option,*variants.inventory_quantity,*categories,*images,*options,+metadata",
      region_id: regionId,
      limit: 100, // Fetch up to 100 products (adjust if you have more)
      ...(filters?.category_id && { category_id: filters.category_id }),
      ...(filters?.q && { q: filters.q }),
    });

    return response.products as MedusaProduct[];
  } catch {
    // Return empty array instead of throwing during build
    return [];
  }
}

/**
 * Fetch a single product by handle
 */
export async function getProductByHandle(
  handle: string
): Promise<MedusaProduct | null> {
  try {
    const regionId = await getDefaultRegionId();

    const response = await medusa.store.product.list({
      fields:
        "*variants,*variants.calculated_price,*variants.prices,*variants.options,*variants.options.option,*variants.inventory_quantity,*categories,*images,*options,+metadata",
      region_id: regionId,
      handle,
    });

    return (response.products[0] as MedusaProduct) || null;
  } catch {
    return null;
  }
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(
  id: string
): Promise<MedusaProduct | null> {
  try {
    const regionId = await getDefaultRegionId();

    const response = await medusa.store.product.retrieve(id, {
      fields:
        "*variants,*variants.calculated_price,*variants.prices,*variants.options,*variants.options.option,*variants.inventory_quantity,*categories,*images,*options,+metadata",
      region_id: regionId,
    });

    return (response.product as MedusaProduct) || null;
  } catch {
    return null;
  }
}

/**
 * Fetch all product categories
 */
export async function getCategories(): Promise<MedusaProductCategory[]> {
  try {
    const response = await medusa.store.category.list({
      fields: "+parent_category,+category_children",
    });

    return response.product_categories as unknown as MedusaProductCategory[];
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch products by category handle
 */
export async function getProductsByCategory(
  categoryHandle: string
): Promise<MedusaProduct[]> {
  try {
    const regionId = await getDefaultRegionId();
    const categories = await getCategories();
    const category = categories.find((c) => c.handle === categoryHandle);

    if (!category) {
      return [];
    }

    const response = await medusa.store.product.list({
      fields:
        "+variants,+variants.calculated_price,+categories,+images,+options,+metadata",
      region_id: regionId,
      category_id: [category.id],
    });

    return response.products as MedusaProduct[];
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch bestseller products from custom endpoint
 * Uses server-side filtering for efficiency
 */
export async function getBestsellerProducts(
  limit: number = 4
): Promise<MedusaProduct[]> {
  try {
    const regionId = await getDefaultRegionId();
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    if (regionId) {
      params.set("region_id", regionId);
    }

    const response = await fetch(
      `${BACKEND_URL}/store/products/bestsellers?${params}`,
      {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.products as MedusaProduct[];
  } catch {
    return [];
  }
}

/**
 * Fetch featured products from custom endpoint
 * Uses server-side filtering for efficiency
 */
export async function getFeaturedProducts(
  limit: number = 4
): Promise<MedusaProduct[]> {
  try {
    const regionId = await getDefaultRegionId();
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    if (regionId) {
      params.set("region_id", regionId);
    }

    const response = await fetch(
      `${BACKEND_URL}/store/products/featured?${params}`,
      {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.products as MedusaProduct[];
  } catch {
    return [];
  }
}

/**
 * Get default region ID client-side (cached in memory)
 */
let cachedRegionId: string | null = null;

async function getDefaultRegionIdClient(): Promise<string | undefined> {
  if (cachedRegionId) return cachedRegionId;

  try {
    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
      },
    });

    if (!response.ok) return undefined;

    const data = await response.json();
    cachedRegionId = data.regions?.[0]?.id || null;
    return cachedRegionId || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetch products client-side (for use in client components)
 * Uses fetch directly to work in browser context
 */
export async function getProductsClient(
  limit: number = 10
): Promise<MedusaProduct[]> {
  try {
    const regionId = await getDefaultRegionIdClient();

    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    params.set(
      "fields",
      "*variants,*variants.calculated_price,*variants.prices,*categories,*images,+metadata"
    );
    if (regionId) {
      params.set("region_id", regionId);
    }

    const response = await fetch(`${BACKEND_URL}/store/products?${params}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.products as MedusaProduct[];
  } catch {
    return [];
  }
}

/**
 * Search products client-side (for use in client components like Header)
 * Uses fetch directly to work in browser context
 */
export async function searchProductsClient(
  query: string,
  limit: number = 4
): Promise<MedusaProduct[]> {
  if (!query.trim()) return [];

  try {
    // Get region ID for pricing (required for calculated_price)
    const regionId = await getDefaultRegionIdClient();

    const params = new URLSearchParams();
    params.set("q", query.trim());
    params.set("limit", limit.toString());
    params.set(
      "fields",
      "*variants,*variants.calculated_price,*variants.prices,*categories,+metadata"
    );
    if (regionId) {
      params.set("region_id", regionId);
    }

    const response = await fetch(`${BACKEND_URL}/store/products?${params}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.products as MedusaProduct[];
  } catch {
    return [];
  }
}

/**
 * Fetch products with bulk/wholesale pricing tiers from custom endpoint
 * Returns products that have quantity-based discounts (min_quantity > 1)
 * For use in Server Components
 */
export async function getBulkDealProducts(
  limit: number = 4
): Promise<BulkDealProduct[]> {
  try {
    const regionId = await getDefaultRegionId();
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    if (regionId) {
      params.set("region_id", regionId);
    }

    const response = await fetch(
      `${BACKEND_URL}/store/products/bulk-deals?${params}`,
      {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.products as BulkDealProduct[];
  } catch {
    return [];
  }
}

/**
 * Fetch products with bulk/wholesale pricing tiers (client-side version)
 * For use in Client Components
 */
export async function getBulkDealProductsClient(
  limit: number = 4
): Promise<BulkDealProduct[]> {
  try {
    const regionId = await getDefaultRegionIdClient();
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    if (regionId) {
      params.set("region_id", regionId);
    }

    const response = await fetch(
      `${BACKEND_URL}/store/products/bulk-deals?${params}`,
      {
        headers: {
          "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.products as BulkDealProduct[];
  } catch {
    return [];
  }
}

/**
 * Banner type from the backend
 */
export type Banner = {
  id: string;
  announcement_text: string;
  link: string;
  start_date: string;
  end_date: string;
  background_color: string;
  text_color: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Active banner response type
 */
export type ActiveBannerResponse = {
  banner: Banner | null;
};

/**
 * Hero section content type (transformed from banner)
 */
export type HeroContent = {
  id: string;
  subheading: string;
  heading: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  backgroundColor: string;
  textColor: string;
};

/**
 * Fetch the active/enabled banner from the backend
 * Returns the single banner that has the "Show" toggle enabled
 */
export async function getBanners(): Promise<HeroContent[]> {
  try {
    const url = `${BACKEND_URL}/banner/active`;

    const response = await fetch(url, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
      },
      cache: "no-store", // Force fresh fetch on each request
    });

    if (!response.ok) {
      console.error("[getBanners] Failed to fetch active banner:", response.status);
      return [];
    }

    const data = (await response.json()) as ActiveBannerResponse;

    // If no banner is enabled, return empty array
    if (!data.banner) {
      return [];
    }

    // Transform the single banner to HeroContent format
    return [
      {
        id: data.banner.id,
        subheading: "",
        heading: data.banner.announcement_text,
        description: "",
        buttonText: "Shop Now",
        buttonUrl: data.banner.link || "/products",
        backgroundColor: data.banner.background_color || "#000000",
        textColor: data.banner.text_color || "#ffffff",
      },
    ];
  } catch (error) {
    console.error("[getBanners] Error fetching banners:", error);
    return [];
  }
}

/**
 * Brands API response type
 */
type BrandsResponse = {
  brands: StoreBrand[];
  count: number;
};

/**
 * Fetch all active brands from the store API
 */
export async function getBrands(): Promise<StoreBrand[]> {
  try {
    const url = `${BACKEND_URL}/store/brands`;

    const response = await fetch(url, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[getBrands] Failed to fetch brands:", response.status);
      return [];
    }

    const data = (await response.json()) as BrandsResponse;
    return data.brands || [];
  } catch (error) {
    console.error("[getBrands] Error fetching brands:", error);
    return [];
  }
}

/**
 * Fetch a single brand by ID
 * Uses the brands list endpoint and filters client-side
 */
export async function getBrandById(brandId: string): Promise<StoreBrand | null> {
  try {
    const brands = await getBrands();
    return brands.find(brand => brand.id === brandId) || null;
  } catch (error) {
    console.error("[getBrandById] Error fetching brand:", error);
    return null;
  }
}
