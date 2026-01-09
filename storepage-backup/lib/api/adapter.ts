import type { MedusaProduct, MedusaProductVariant } from "./types";

/**
 * Product category type for filtering
 */
export type ProductCategory = {
  id: string;
  name: string;
  handle: string;
};

/**
 * Frontend Product type (matches ProductCard props)
 */
export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: "New" | "Sale";
  discount?: string;
  handle?: string;
  categories?: ProductCategory[];
  inStock?: boolean;
};

/**
 * Get base price from variant with fallback logic
 * Priority: prices array base price (no min_quantity) > calculated_price > first price
 * This ensures we show the base price, not wholesale tier prices
 */
function getVariantBasePrice(variant: MedusaProductVariant | undefined): number {
  if (!variant) return 0;

  // First, check prices array for base price (no min_quantity or min_quantity <= 1)
  // This is more reliable when wholesale tiers are set up
  if (variant.prices && variant.prices.length > 0) {
    const basePrice = variant.prices.find(
      (p) => !p.min_quantity || p.min_quantity <= 1
    );
    if (basePrice) return basePrice.amount / 100;
  }

  // Fallback to calculated_price (region-specific) when no explicit base price
  // Note: calculated_price might return the lowest tier price, so we only use it as fallback
  if (variant.calculated_price?.calculated_amount) {
    return variant.calculated_price.calculated_amount / 100;
  }

  // Last resort: use first price from array
  if (variant.prices && variant.prices.length > 0) {
    return variant.prices[0].amount / 100;
  }

  return 0;
}

/**
 * Get variant discount info from metadata
 * Returns { discountedPrice, originalPrice, discountPercent } if discount exists
 */
function getVariantDiscount(variant: MedusaProductVariant | undefined): {
  hasDiscount: boolean;
  discountedPrice: number;
  originalPrice: number;
  discountPercent: number;
} {
  const basePrice = getVariantBasePrice(variant);
  const result = {
    hasDiscount: false,
    discountedPrice: basePrice,
    originalPrice: basePrice,
    discountPercent: 0,
  };

  if (!variant) return result;

  // Check for variant metadata discount (Set Discount Global from admin)
  const metadata = variant.metadata;
  const discountValue = Number(metadata?.discount) || 0;
  const discountType = metadata?.discount_type;

  if (discountValue > 0 && discountType && basePrice > 0) {
    let discountedPrice: number;

    if (discountType === "percentage") {
      // Percentage discount (e.g., 15 means 15% off)
      const discountPercent = Math.min(discountValue, 100);
      discountedPrice = basePrice * (1 - discountPercent / 100);
      result.discountPercent = discountPercent;
    } else {
      // Fixed discount (value is in cents, convert to dollars)
      const fixedDiscount = discountValue / 100;
      discountedPrice = Math.max(0, basePrice - fixedDiscount);
      result.discountPercent = basePrice > 0 ? Math.round((fixedDiscount / basePrice) * 100) : 0;
    }

    if (discountedPrice < basePrice) {
      result.hasDiscount = true;
      result.discountedPrice = discountedPrice;
      result.originalPrice = basePrice;
    }
  }

  return result;
}

/**
 * Convert Medusa Product to Frontend Product
 */
export function medusaProductToProduct(medusaProduct: MedusaProduct): Product {
  // Get the first variant's price and check for variant discount
  const firstVariant = medusaProduct.variants?.[0];
  const variantDiscountInfo = getVariantDiscount(firstVariant);

  // Get badge from metadata
  let badge = medusaProduct.metadata?.badge as "New" | "Sale" | undefined;

  // Determine price, originalPrice, and discount
  let price: number;
  let originalPrice: number | undefined;
  let discount: string | undefined;

  if (variantDiscountInfo.hasDiscount) {
    // Variant has a discount set from admin (Set Discount Global)
    price = variantDiscountInfo.discountedPrice;
    originalPrice = variantDiscountInfo.originalPrice;
    discount = `-${Math.round(variantDiscountInfo.discountPercent)}%`;
    // Set badge to Sale if there's a discount
    if (!badge) badge = "Sale";
  } else {
    // Check for product-level original price from metadata (legacy approach)
    price = variantDiscountInfo.discountedPrice; // This is just base price when no discount
    const metadataOriginalPrice = medusaProduct.metadata?.originalPrice
      ? (medusaProduct.metadata.originalPrice as number) / 100
      : undefined;

    if (metadataOriginalPrice && price < metadataOriginalPrice) {
      originalPrice = metadataOriginalPrice;
      discount = `-${Math.round((1 - price / metadataOriginalPrice) * 100)}%`;
    }
  }

  // Get image
  const image = medusaProduct.thumbnail ||
    medusaProduct.images?.[0]?.url ||
    "/product.png"; // Fallback to default

  // Map categories
  const categories = medusaProduct.categories?.map((cat) => ({
    id: cat.id,
    name: cat.name,
    handle: cat.handle,
  }));

  // Check stock - product is in stock if any variant has inventory > 0
  // If no variants or no inventory info, assume in stock
  const inStock = medusaProduct.variants?.length
    ? medusaProduct.variants.some((v) => (v.inventory_quantity ?? 1) > 0)
    : true;

  return {
    id: medusaProduct.id,
    name: medusaProduct.title,
    price,
    originalPrice,
    image,
    badge,
    discount,
    handle: medusaProduct.handle,
    categories,
    inStock,
  };
}

/**
 * Convert array of Medusa Products to Frontend Products
 */
export function medusaProductsToProducts(medusaProducts: MedusaProduct[]): Product[] {
  return medusaProducts.map(medusaProductToProduct);
}
