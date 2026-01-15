import { z } from "zod";

/**
 * Variant Price Schema - Base price without quantity limits
 */
export const VariantPriceSchema = z.object({
  currency_code: z.string().default("myr"),
  amount: z.number().int().nonnegative("Price must be zero or positive"),
  min_quantity: z.number().int().positive().optional(),
  max_quantity: z.number().int().positive().optional(),
});

/**
 * Wholesale Price Schema - Price with quantity range for wholesale tiers
 */
export const WholesalePriceSchema = z.object({
  currency_code: z.string().default("myr"),
  amount: z.number().int().nonnegative("Price must be zero or positive"),
  min_quantity: z.number().int().positive(),
  max_quantity: z.number().int().positive().nullable(),
});

/**
 * Wholesale Tier Schema - For variant-level tier pricing
 */
export const WholesaleTierSchema = z.object({
  minQty: z.number().int().positive("Minimum quantity must be at least 1"),
  price: z.number().int().nonnegative("Price must be zero or positive"), // in cents
});

/**
 * Product Variant Schema
 */
export const ProductVariantSchema = z.object({
  title: z.string().min(1, "Variant title is required"),
  sku: z.string().optional(),
  prices: z.array(VariantPriceSchema).min(1, "At least one price is required"),
  options: z.record(z.string(), z.string()).optional(), // { Color: "Red", Size: "M" }
  manage_inventory: z.boolean().default(true),
  allow_backorder: z.boolean().default(false),
  inventory_quantity: z.number().int().nonnegative().default(0),
  min_stock_alert: z.number().int().nonnegative().optional(),
  discount: z.number().nonnegative().optional(), // Discount amount
  weight: z.number().nonnegative().optional(),
  length: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  width: z.number().nonnegative().optional(),
  image: z.instanceof(File).optional(), // For UI only, not sent to API
  imageUrl: z.string().optional(), // Uploaded image URL
  // Variant-level wholesale pricing
  wholesaleEnabled: z.boolean().default(false),
  wholesaleTiers: z.array(WholesaleTierSchema).default([]),
});

/**
 * Product Option Schema
 */
export const ProductOptionSchema = z.object({
  title: z.string().min(1, "Option title is required"), // e.g., "Color", "Size"
  values: z.array(z.string()).min(1, "At least one option value is required"), // e.g., ["Red", "Blue"]
});

/**
 * Form validation schema matching current UI
 */
export const ProductSchema = z
  .object({
    // Basic Product Information
    productName: z.string().min(1, "Product name is required"),
    handle: z.string().optional(), // Auto-generated from productName if empty
    category: z.string().min(1, "Category is required"), // Will be category ID
    brand: z.string().optional(), // Brand ID (optional)
    status: z.enum(["draft", "proposed", "published", "rejected"]),
    description: z.string().min(1, "Description is required"),
    productImage: z.instanceof(File).optional(),
    // Gallery images (additional product images beyond thumbnail)
    galleryImages: z.array(z.instanceof(File)).optional(),

    // Inventory (used when variants are disabled)
    availableQuantity: z.string().optional(),
    minimumStockAlert: z.string().optional(),
    inventoryLocation: z.string().optional(),

    // Pricing (used when variants are disabled)
    basePrice: z.string().optional(),
    discountPercentage: z.string().optional(),
    discountType: z.string().optional(),

    // Variant Management
    hasVariants: z.boolean(),
    options: z.array(ProductOptionSchema).optional(),
    variants: z.array(ProductVariantSchema).optional(),

    // Global Discount
    hasGlobalDiscount: z.boolean(),
    globalDiscountType: z.enum(["percentage", "fixed"]).optional(),
    globalDiscountValue: z.number().nonnegative().optional(),

    // Metadata
    weight: z.number().nonnegative().optional(),
    length: z.number().nonnegative().optional(),
    height: z.number().nonnegative().optional(),
    width: z.number().nonnegative().optional(),

    // Usage Guide (for "Your daily glow ritual" section)
    usageGuideTitle: z.string().optional(),
    usageGuideDescription: z.string().optional(),
    usageGuideImage: z.instanceof(File).optional(),
  })
  .refine(
    (data) => {
      // If variants are enabled, options and variants are required
      if (data.hasVariants) {
        return (
          data.options &&
          data.options.length > 0 &&
          data.variants &&
          data.variants.length > 0
        );
      }
      // If variants are disabled, basic pricing and inventory are required
      return (
        data.basePrice &&
        data.basePrice.length > 0 &&
        data.availableQuantity &&
        data.availableQuantity.length > 0
      );
    },
    {
      message:
        "Either provide variant options or basic pricing and inventory information",
      path: ["hasVariants"],
    }
  );

export type ProductFormData = z.infer<typeof ProductSchema>;
export type ProductVariantFormData = z.infer<typeof ProductVariantSchema>;
export type ProductOptionFormData = z.infer<typeof ProductOptionSchema>;
export type VariantPriceFormData = z.infer<typeof VariantPriceSchema>;
export type WholesalePriceFormData = z.infer<typeof WholesalePriceSchema>;
export type WholesaleTierFormData = z.infer<typeof WholesaleTierSchema>;

/**
 * Combined price type that can be either a base price or wholesale price
 */
export type CombinedPriceFormData = VariantPriceFormData | WholesalePriceFormData;

/**
 * Helper function to convert form price string to cents
 * @param priceString - Price as string (e.g., "59.00", "$150", "$99.99")
 * @returns Price in cents (e.g., 5900, 15000, 9999)
 */
export function convertPriceToCents(priceString: string): number {
  // Remove currency symbols and spaces
  const cleanPrice = priceString.replace(/[^0-9.]/g, "");
  const price = parseFloat(cleanPrice);

  if (isNaN(price)) {
    throw new Error(`Invalid price: ${priceString}`);
  }

  // Convert to cents (multiply by 100 and round)
  return Math.round(price * 100);
}

/**
 * Helper function to generate URL-friendly handle from product name
 * @param name - Product name
 * @returns URL-friendly handle
 */
export function generateHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate SKU from product handle and variant title
 * @param handle - Product handle (URL slug)
 * @param variantTitle - Variant title
 * @returns Generated SKU
 */
export function generateVariantSku(handle: string, variantTitle: string): string {
  const slug = variantTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${handle}-${slug}`;
}
