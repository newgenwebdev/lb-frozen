// Medusa API types
export type MedusaProduct = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  thumbnail: string | null;
  images?: Array<{
    id: string;
    url: string;
  }>;
  variants?: MedusaProductVariant[];
  options?: Array<{
    id: string;
    title: string;
    values: Array<{
      id: string;
      value: string;
    }>;
  }>;
  categories?: Array<{
    id: string;
    name: string;
    handle: string;
  }>;
  metadata?: {
    badge?: string;
    bestseller?: boolean;
    featured?: boolean;
    originalPrice?: number;
    details?: string;
    howToUse?: string;
    usageGuide?: {
      title?: string;
      description?: string;
      image?: string;
    };
    brand_id?: string;
  };
  status: string;
  created_at: string;
  updated_at: string;
}

export type MedusaVariantPrice = {
  id?: string;
  amount: number;
  currency_code: string;
  min_quantity?: number | null;
  max_quantity?: number | null;
};

export type MedusaProductVariant = {
  id: string;
  title: string;
  sku: string | null;
  calculated_price?: {
    calculated_amount: number;
    currency_code: string;
  };
  // Raw prices array (includes wholesale tiers with min_quantity/max_quantity)
  prices?: MedusaVariantPrice[];
  inventory_quantity?: number;
  // Medusa 2.x returns options as array with nested option object
  options?: Array<{
    value: string;
    option?: {
      id: string;
      title: string;
    };
  }>;
  // Variant metadata (includes discount settings from admin)
  metadata?: {
    discount?: number;
    discount_type?: "percentage" | "fixed";
    imageUrl?: string;
    min_stock_alert?: number;
    [key: string]: unknown;
  };
}

export type MedusaProductCategory = {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  is_active: boolean;
  parent_category_id: string | null;
  parent_category: MedusaProductCategory | null;
  category_children: MedusaProductCategory[];
  created_at: string;
  updated_at: string;
}

// Bulk deal types
export type BulkTier = {
  min_quantity: number | null;
  max_quantity: number | null;
  amount: number;
  currency_code: string;
  savings_percent: number;
}

export type BulkDealVariant = {
  id: string;
  title: string;
  sku: string | null;
  prices: MedusaVariantPrice[];
  base_price: {
    amount: number;
    currency_code: string;
  } | null;
  bulk_tiers: BulkTier[];
  options?: Array<{
    value: string;
    option?: {
      id: string;
      title: string;
    };
  }>;
}

export type BulkDealProduct = Omit<MedusaProduct, 'variants'> & {
  variants: BulkDealVariant[];
}

/**
 * Store brand type - returned from /store/brands endpoint
 */
export type StoreBrand = {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  logo_url: string | null;
}
