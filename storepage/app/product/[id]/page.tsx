"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddToCartSuccessDialog } from "@/components/shared/AddToCartSuccessDialog";
import { ProductReviews } from "@/components/shared/ProductReviews";
import { ProductImageGallery } from "@/components/shared/ProductImageGallery";
import { ShareDialog } from "@/components/shared/ShareDialog";
import { useAuthContext } from "@/lib/AuthContext";
import { useWishlist } from "@/lib/WishlistContext";
import { useToast } from "@/components/ui/toast";
import { useUIStore } from "@/lib/stores";
import { useProductQuery, useAddToCartMutation } from "@/lib/queries";
import type { ProductVariant } from "@/lib/api/types";

// Type for variant option display
type VariantOption = {
  id: string;
  title: string;
  price: number;
  label: string;
  stock: number;
};

// Helper function to format price from cents to RM
function formatPrice(amountInCents: number): string {
  return (amountInCents / 100).toFixed(2);
}

// Helper to get the arrival date range (e.g., "Nov 5 - Nov 12")
function getArrivalDateRange(shippingDays: string = "3-7"): string {
  const today = new Date();
  const [minDays, maxDays] = shippingDays.split("-").map(Number);

  const minDate = new Date(today);
  minDate.setDate(today.getDate() + (minDays || 3));

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + (maxDays || 7));

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return `Arrives between ${formatDate(minDate)} - ${formatDate(maxDate)}`;
}

// Helper to get variant price
function getVariantPrice(variant: ProductVariant): number {
  // First check calculated_price (from region)
  if (variant.calculated_price?.calculated_amount) {
    return variant.calculated_price.calculated_amount;
  }
  // Fallback to prices array - get first price
  const price = variant.prices?.[0];
  return price?.amount || 0;
}

// Helper to get original price (before discount)
function getOriginalPrice(
  variant: ProductVariant,
  discountPercent: number
): number {
  const currentPrice = getVariantPrice(variant);
  if (discountPercent > 0) {
    // Calculate original price from discount
    return Math.round(currentPrice / (1 - discountPercent / 100));
  }
  return currentPrice;
}

// Helper to get total stock across all variants
function getTotalStock(variants: ProductVariant[]): number {
  return variants.reduce((total, v) => total + (v.inventory_quantity || 0), 0);
}

// Loading skeleton component
function ProductSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
        <div className="space-y-4">
          <div className="bg-gray-200 rounded-2xl lg:rounded-3xl aspect-square"></div>
          <div className="bg-gray-200 rounded-2xl lg:rounded-3xl h-64"></div>
        </div>
        <div className="space-y-4 lg:space-y-6">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-3/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-14 bg-gray-200 rounded"></div>
          <div className="h-14 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { customer, isAuthenticated } = useAuthContext();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { showToast } = useToast();

  // Use React Query for product data fetching
  const { 
    data: product, 
    isLoading: loading, 
    error: queryError 
  } = useProductQuery(productId);
  const error = queryError ? "Failed to load product" : null;

  // Local UI state (kept as useState - these are component-local)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("about");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Zustand UI store for cart success dialog
  const { cartSuccessDialog, showCartSuccess, hideCartSuccess } = useUIStore();
  
  // React Query mutation for add to cart
  const addToCartMutation = useAddToCartMutation();
  const addingToCart = addToCartMutation.isPending;

  // Set default selected variant when product loads
  useEffect(() => {
    if (product?.variants?.length && !selectedVariantId) {
      setSelectedVariantId(product.variants[0].id);
    }
  }, [product, selectedVariantId]);

  // Get selected variant
  const selectedVariant = useMemo((): ProductVariant | null => {
    if (!product || !selectedVariantId) return null;
    return (
      product.variants.find(
        (v: ProductVariant) => v.id === selectedVariantId
      ) || product.variants[0]
    );
  }, [product, selectedVariantId]);

  // Extract metadata with defaults
  const metadata = useMemo(() => {
    const m = product?.metadata || {};
    const variantMeta = selectedVariant?.metadata || {};
    const reviewStats = (product as any)?.review_stats;
    // Use calculated sold_count from completed orders (not from metadata)
    const soldCount = (product as any)?.sold_count || 0;
    const recentSoldCount = (product as any)?.recent_sold_count || 0;

    // Format sold count for display (e.g., 150 -> "100+", 1500 -> "1.5K+")
    const formatCount = (count: number): string => {
      if (count >= 1000) {
        return `${(Math.floor(count / 100) / 10).toFixed(1).replace(/\.0$/, '')}K+`;
      }
      if (count >= 100) {
        return `${Math.floor(count / 100) * 100}+`;
      }
      if (count >= 10) {
        return `${Math.floor(count / 10) * 10}+`;
      }
      return count > 0 ? `${count}` : "0";
    };

    return {
      // Use real review stats from review module
      rating: reviewStats?.average_rating || 0,
      reviewsCount: reviewStats?.total_reviews || 0,
      // Use sold count from completed orders
      soldCount: soldCount,
      onSale: Boolean(m.on_sale),
      dealsRank: m.deals_rank ? Number(m.deals_rank) : null,
      discount: Number(variantMeta.discount) || Number(m.discount) || 0,
      freeShipping: m.free_shipping !== false, // default true
      shippingDays: String(m.shipping_days || "3-7"),
      shippingMethod: String(m.shipping_method || "Standard"),
      // Use soldCount for popular choice (from completed orders), fallback to default if no data
      popularChoiceCount: soldCount > 0 ? formatCount(soldCount) : "100+",
      popularChoiceDescription: String(
        m.popular_choice_description || "Shoppers love this product"
      ),
      // Use recentSoldCount for trending (from completed orders in last 7 days), fallback to default
      trendingCount: recentSoldCount > 0 ? String(recentSoldCount) : "20",
      trendingDescription: String(
        m.trending_description || "Units added this week"
      ),
      shippingConfirmation: String(
        m.shipping_confirmation_text ||
          "Ships within 24 hours after payment confirmation."
      ),
    };
  }, [product, selectedVariant]);

  // Build variant options for display
  const variantOptions = useMemo((): VariantOption[] => {
    if (!product || !product.variants || product.variants.length <= 1)
      return [];

    // Check if it's a default variant (single variant with title "Default")
    if (
      product.variants.length === 1 &&
      product.variants[0].title === "Default"
    ) {
      return [];
    }

    return product.variants.map((variant: ProductVariant): VariantOption => {
      const price = getVariantPrice(variant);
      return {
        id: variant.id,
        title: variant.title,
        price,
        label: `${variant.title} (RM${formatPrice(price)})`,
        stock: variant.inventory_quantity || 0,
      };
    });
  }, [product]);

  // Get option type name (e.g., "Weight", "Size", etc.)
  const optionTypeName = useMemo(() => {
    if (!product?.options || product.options.length === 0) return "Option";
    // Filter out "Default" option
    const nonDefaultOption = product.options.find(
      (o: { title: string }) => o.title !== "Default"
    );
    return nonDefaultOption?.title || "Option";
  }, [product]);

  // Current price and original price
  const currentPrice = selectedVariant ? getVariantPrice(selectedVariant) : 0;
  const originalPrice = selectedVariant
    ? getOriginalPrice(selectedVariant, metadata.discount)
    : 0;
  const totalStock = product ? getTotalStock(product.variants) : 0;
  const variantStock = selectedVariant?.inventory_quantity || 0;

  const incrementQuantity = () => {
    const maxStock = variantOptions.length > 0 ? variantStock : totalStock;
    if (quantity < maxStock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariant || !product) return;

    try {
      await addToCartMutation.mutateAsync({
        variantId: selectedVariant.id,
        quantity,
      });

      // Get variant price and product image for dialog
      const variantPrice = getVariantPrice(selectedVariant);
      const productImage = product.thumbnail || product.images?.[0]?.url;

      // Show success dialog using Zustand
      showCartSuccess({
        name: product.title,
        price: variantPrice,
        image: productImage,
        quantity: quantity,
        variantTitle: selectedVariant.title,
      });
    } catch (err) {
      console.error("Error adding to cart:", err);
      showToast("Failed to add to cart", "error");
    }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant) return;

    try {
      await addToCartMutation.mutateAsync({
        variantId: selectedVariant.id,
        quantity,
      });
      router.push("/cart");
    } catch (err) {
      console.error("Error adding to cart:", err);
      showToast("Failed to proceed to checkout", "error");
    }
  };

  if (loading) {
    return <ProductSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="mx-auto px-4 lg:px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Product Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          {error || "The product you're looking for doesn't exist."}
        </p>
        <Button onClick={() => router.push("/products")}>
          Browse Products
        </Button>
      </div>
    );
  }

  const displayStock = variantOptions.length > 0 ? variantStock : totalStock;

  // Wishlist handler
  const handleWishlistClick = () => {
    if (isInWishlist(productId)) {
      removeFromWishlist(productId);
      showToast("Removed from wishlist", "success");
    } else {
      // addToWishlist needs full product info, not just productId
      addToWishlist({
        product_id: productId,
        variant_id: selectedVariant?.id || product.variants?.[0]?.id || "",
        title: product.title,
        handle: product.handle || productId,
        thumbnail: product.thumbnail,
        price: currentPrice,
        original_price: metadata.discount > 0 ? originalPrice : undefined,
        currency: "myr",
      });
      showToast("Added to wishlist", "success");
    }
  };

  // Share handler
  const handleShareClick = () => {
    setShareDialogOpen(true);
  };

  return (
    <div className="mx-auto px-4 lg:px-6 py-4 lg:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
        {/* Left - Image Gallery */}
        <div className="space-y-4">
          <ProductImageGallery
            images={product.images || []}
            thumbnail={product.thumbnail}
            productTitle={product.title}
            discount={metadata.discount}
            isInWishlist={isInWishlist(productId)}
            onWishlistClick={handleWishlistClick}
            onShareClick={handleShareClick}
          />

          {/* Tabs Section */}
          <div className="mt-4 lg:mt-6 border border-gray-200 rounded-2xl lg:rounded-3xl">
            <div className="flex justify-evenly border-b border-gray-200">
              <button
                onClick={() => setActiveTab("about")}
                className={`py-3 lg:py-4 px-2 text-sm lg:text-base font-medium border-b-2 transition-colors ${
                  activeTab === "about"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                About
              </button>
              <button
                onClick={() => setActiveTab("reviews")}
                className={`py-4 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === "reviews"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Reviews
              </button>
            </div>

            <div className="py-4 px-4 lg:py-8 lg:px-8">
              {activeTab === "about" && (
                <div>
                  <h3 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4">
                    About this product
                  </h3>
                  <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
                    {product.description || "No description available."}
                  </p>
                </div>
              )}
              {activeTab === "reviews" && (
                <ProductReviews
                  productId={productId}
                  productName={product.title}
                  isAuthenticated={isAuthenticated}
                  customerName={customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : undefined}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right - Product Info */}
        <div className="space-y-4 lg:space-y-6">
          {/* Delivery Badge */}
          <div className="flex flex-wrap items-center gap-2">
            {metadata.onSale && (
              <Badge
                variant="outline"
                className="bg-[#C52129] text-white border-0 hover:bg-[#C52129] text-xs"
              >
                <svg
                  className="w-3 h-3 lg:w-4 lg:h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
                On Sale
              </Badge>
            )}
            {metadata.dealsRank && (
              <span className="text-xs lg:text-sm text-gray-600">
                No-{metadata.dealsRank} on Today Deals
              </span>
            )}
          </div>

          {/* Product Title */}
          <h1 className="text-xl lg:text-3xl font-bold text-gray-900">
            {product.title}
          </h1>

          {/* Price */}
          <div className="flex items-center gap-2 lg:gap-3">
            <span className="text-2xl lg:text-3xl font-bold text-gray-900">
              RM{formatPrice(currentPrice)}
            </span>
            {metadata.discount > 0 && (
              <span className="text-base lg:text-lg text-[#C52129] line-through">
                RM{formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {/* Rating and Sold Count */}
          {(metadata.rating > 0 || metadata.soldCount > 0) && (
            <div className="flex items-center gap-2">
              {metadata.rating > 0 && (
                <>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 lg:w-5 lg:h-5 fill-current ${
                          i < Math.floor(metadata.rating)
                            ? "text-yellow-400"
                            : "text-gray-200"
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {metadata.rating.toFixed(1)} ({metadata.reviewsCount} {metadata.reviewsCount === 1 ? 'review' : 'reviews'})
                  </span>
                </>
              )}
              {metadata.soldCount > 0 && (
                <span className="text-sm text-gray-500">
                  {metadata.rating > 0 && ' · '}
                  {metadata.soldCount.toLocaleString()} sold
                </span>
              )}
            </div>
          )}

          {/* Variant Options (Weight, Size, etc.) */}
          {variantOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs lg:text-sm font-semibold text-gray-900">
                {optionTypeName}
              </label>
              <div className="flex flex-wrap gap-2 lg:gap-3">
                {variantOptions.map((option: VariantOption) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedVariantId(option.id);
                      setQuantity(1); // Reset quantity when variant changes
                    }}
                    disabled={option.stock === 0}
                    className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg border-2 transition-colors text-xs lg:text-sm ${
                      selectedVariantId === option.id
                        ? "border-gray-900 bg-gray-50"
                        : option.stock === 0
                        ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Stock */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 lg:gap-4">
              <button
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-base lg:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="text-base lg:text-lg font-semibold w-10 lg:w-12 text-center">
                {quantity}
              </span>
              <button
                onClick={incrementQuantity}
                disabled={quantity >= displayStock}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-base lg:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            <span className="text-xs lg:text-sm text-gray-600">
              {displayStock} items in stock
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 lg:space-y-3">
            <Button
              onClick={handleBuyNow}
              disabled={addingToCart || displayStock === 0}
              className="w-full py-4 lg:py-6 text-base lg:text-lg disabled:opacity-50"
              style={{
                background:
                  displayStock === 0
                    ? "#9ca3af"
                    : "linear-gradient(to right, #23429B, #C52129)",
              }}
            >
              {displayStock === 0
                ? "Out of Stock"
                : addingToCart
                ? "Adding..."
                : "Buy it now"}
            </Button>
            <Button
              variant="outline"
              onClick={handleAddToCart}
              disabled={addingToCart || displayStock === 0}
              className="w-full py-4 lg:py-6 text-base lg:text-lg disabled:opacity-50"
            >
              {addingToCart ? "Adding..." : "Add to cart"}
            </Button>
          </div>

          {/* Product Insights */}
          <div className="grid grid-cols-2 gap-3 lg:gap-4 pt-3 lg:pt-4 border-t">
            <div className="flex items-start gap-2 lg:gap-3">
              <svg
                className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 mt-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <div>
                <div className="text-xs lg:text-sm font-semibold text-gray-900">
                  Popular choice
                </div>
                <div className="text-xl lg:text-2xl font-bold text-gray-900">
                  {metadata.popularChoiceCount}
                </div>
                <div className="text-[10px] lg:text-xs text-gray-600">
                  {metadata.popularChoiceDescription}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-gray-600 mt-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Trending item
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {metadata.trendingCount}
                </div>
                <div className="text-xs text-gray-600">
                  {metadata.trendingDescription}
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="space-y-3 pt-3 lg:pt-4 border-t">
            <div className="flex items-start gap-2 lg:gap-3">
              <svg
                className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-xs lg:text-sm text-gray-900 mb-1">
                  Shipping & Delivery
                </div>
                <div className="text-xs lg:text-sm text-gray-600 space-y-1">
                  <div>
                    {metadata.freeShipping
                      ? "Free worldwide delivery"
                      : `${metadata.shippingMethod} shipping`}
                  </div>
                  <div>{getArrivalDateRange(metadata.shippingDays)}</div>
                  <div>{metadata.shippingConfirmation}</div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 lg:gap-3">
              <svg
                className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-xs lg:text-sm text-gray-900 mb-2">
                  Payment options
                </div>
                <div className="flex gap-2">
                  <div className="w-10 h-7 lg:w-12 lg:h-8 bg-white border border-gray-200 rounded flex items-center justify-center">
                    <svg
                      className="h-4"
                      viewBox="0 0 48 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="48" height="32" rx="4" fill="#00579F" />
                      <path
                        d="M16 11h-4v10h4V11zM22 11h-4l4 10h4l-4-10z"
                        fill="white"
                      />
                    </svg>
                  </div>
                  <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center">
                    <svg
                      className="h-4"
                      viewBox="0 0 48 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="48" height="32" rx="4" fill="#EB001B" />
                      <circle cx="20" cy="16" r="8" fill="#FF5F00" />
                      <circle cx="28" cy="16" r="8" fill="#F79E1B" />
                    </svg>
                  </div>
                  <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center">
                    <svg
                      className="h-4"
                      viewBox="0 0 48 32"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="48" height="32" rx="4" fill="#1434CB" />
                      <path
                        d="M20 11h8v10h-8V11z"
                        fill="white"
                        fillOpacity="0.8"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <AddToCartSuccessDialog
        open={cartSuccessDialog.open}
        onOpenChange={(open) => !open && hideCartSuccess()}
        product={cartSuccessDialog.product}
      />

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        productTitle={product.title}
        productUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />
    </div>
  );
}
