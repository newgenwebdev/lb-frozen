"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProduct } from "@/lib/api/products";
import { addToCart } from "@/lib/api/cart";
import type { Product, ProductVariant } from "@/lib/api/types";

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
function getOriginalPrice(variant: ProductVariant, discountPercent: number): number {
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

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("about");
  const [addingToCart, setAddingToCart] = useState(false);

  // Fetch product data
  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);
        const response = await getProduct(productId);
        setProduct(response.product);
        // Set default selected variant
        if (response.product.variants?.length > 0) {
          setSelectedVariantId(response.product.variants[0].id);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  // Get selected variant
  const selectedVariant = useMemo((): ProductVariant | null => {
    if (!product || !selectedVariantId) return null;
    return product.variants.find((v: ProductVariant) => v.id === selectedVariantId) || product.variants[0];
  }, [product, selectedVariantId]);

  // Extract metadata with defaults
  const metadata = useMemo(() => {
    const m = product?.metadata || {};
    const variantMeta = selectedVariant?.metadata || {};
    
    return {
      rating: Number(m.rating) || 4.5,
      soldCount: Number(m.sold_count) || 0,
      reviewsCount: Number(m.reviews_count) || 0,
      onSale: Boolean(m.on_sale),
      dealsRank: m.deals_rank ? Number(m.deals_rank) : null,
      discount: Number(variantMeta.discount) || Number(m.discount) || 0,
      freeShipping: m.free_shipping !== false, // default true
      shippingDays: String(m.shipping_days || "3-7"),
      shippingMethod: String(m.shipping_method || "Standard"),
      popularChoiceCount: String(m.popular_choice_count || "100+"),
      popularChoiceDescription: String(m.popular_choice_description || "Shoppers love this product"),
      trendingCount: String(m.trending_count || "20"),
      trendingDescription: String(m.trending_description || "Units added this week"),
      shippingConfirmation: String(m.shipping_confirmation_text || "Ships within 24 hours after payment confirmation."),
    };
  }, [product, selectedVariant]);

  // Build variant options for display
  const variantOptions = useMemo((): VariantOption[] => {
    if (!product || !product.variants || product.variants.length <= 1) return [];
    
    // Check if it's a default variant (single variant with title "Default")
    if (product.variants.length === 1 && product.variants[0].title === "Default") {
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
    const nonDefaultOption = product.options.find((o: { title: string }) => o.title !== "Default");
    return nonDefaultOption?.title || "Option";
  }, [product]);

  // Current price and original price
  const currentPrice = selectedVariant ? getVariantPrice(selectedVariant) : 0;
  const originalPrice = selectedVariant ? getOriginalPrice(selectedVariant, metadata.discount) : 0;
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
    if (!selectedVariant) return;
    
    try {
      setAddingToCart(true);
      await addToCart(selectedVariant.id, quantity);
      // Could show a toast notification here
      alert("Added to cart!");
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant) return;
    
    try {
      setAddingToCart(true);
      await addToCart(selectedVariant.id, quantity);
      router.push("/cart");
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert("Failed to proceed to checkout");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return <ProductSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
        <p className="text-gray-600 mb-6">{error || "The product you're looking for doesn't exist."}</p>
        <Button onClick={() => router.push("/products")}>
          Browse Products
        </Button>
      </div>
    );
  }

  const productImage = product.thumbnail || product.images?.[0]?.url || "/placeholder-product.png";
  const displayStock = variantOptions.length > 0 ? variantStock : totalStock;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Left - Image Gallery */}
          <div className="space-y-4">
            <div className="relative bg-gray-50 rounded-2xl lg:rounded-3xl aspect-square flex items-center justify-center p-6 lg:p-12">
              {metadata.discount > 0 && (
                <Badge className="absolute top-2 left-2 lg:top-4 lg:left-4 bg-[#C52129] text-white hover:bg-[#C52129] text-xs">
                  {metadata.discount}% OFF
                </Badge>
              )}
              <button className="absolute top-2 right-2 lg:top-4 lg:right-4 w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100">
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
              <button className="absolute top-2 right-12 lg:top-4 lg:right-16 w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100">
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
              <button className="absolute bottom-2 right-2 lg:bottom-4 lg:right-4 w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100">
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
              <Image
                src={productImage}
                alt={product.title}
                width={400}
                height={400}
                className="object-contain"
              />
            </div>

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
                  <div className="space-y-6 lg:space-y-8">
                    {/* Reviews Overview */}
                    <div>
                      <h3 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">
                        Reviews overview
                      </h3>
                      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
                        {/* Rating Summary */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-yellow-400 rounded-xl flex items-center justify-center mb-2 lg:mb-3">
                            <svg
                              className="w-8 h-8 lg:w-10 lg:h-10 text-white fill-current"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <div className="text-2xl lg:text-3xl font-bold text-gray-900">
                            {metadata.rating.toFixed(1)} of 5.0
                          </div>
                          <div className="text-xs lg:text-sm text-gray-600 mt-1">
                            {metadata.reviewsCount.toLocaleString()} ratings • {metadata.reviewsCount.toLocaleString()} reviews
                          </div>
                        </div>

                        {/* Rating Bars */}
                        <div className="flex-1 space-y-1.5 lg:space-y-2">
                          {[
                            { stars: 5, count: 843, width: "85%" },
                            { stars: 4, count: 351, width: "55%" },
                            { stars: 3, count: 112, width: "20%" },
                            { stars: 2, count: 56, width: "8%" },
                            { stars: 1, count: 42, width: "6%" },
                          ].map((item) => (
                            <div
                              key={item.stars}
                              className="flex items-center gap-3"
                            >
                              <span className="text-sm text-gray-900 w-6">
                                {item.stars}.0
                              </span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#23429B] rounded-full"
                                  style={{ width: item.width }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 w-12 text-right">
                                {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* All Reviews */}
                    <div>
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-0 mb-4 lg:mb-6">
                        <h3 className="text-lg lg:text-xl font-semibold">All reviews</h3>
                        <div className="flex gap-2 lg:gap-4 overflow-x-auto">
                          <select className="px-3 lg:px-4 py-2 border border-gray-200 rounded-lg text-xs lg:text-sm">
                            <option>Rating star</option>
                            <option>5 stars</option>
                            <option>4 stars</option>
                            <option>3 stars</option>
                            <option>2 stars</option>
                            <option>1 star</option>
                          </select>
                          <select className="px-3 lg:px-4 py-2 border border-gray-200 rounded-lg text-xs lg:text-sm">
                            <option>Sort by : recently</option>
                            <option>Most helpful</option>
                            <option>Highest rating</option>
                            <option>Lowest rating</option>
                          </select>
                        </div>
                      </div>

                      {/* Review Items */}
                      <div className="space-y-4 lg:space-y-6">
                        {/* Review 1 */}
                        <div className="flex gap-3 lg:gap-4 pb-4 lg:pb-6 border-b border-gray-100">
                          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-xs lg:text-sm font-semibold text-gray-600">
                              RK
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  Rina Karlos
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                      <svg
                                        key={i}
                                        className="w-4 h-4 fill-current"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-900 font-semibold">
                                    4.9
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 lg:gap-3 text-xs lg:text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                  256 GB
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-[#23429B] rounded-full"></span>
                                  Neptune Blue
                                </span>
                              </div>
                            </div>
                            <p className="text-xs lg:text-sm text-gray-700 leading-relaxed mb-2 lg:mb-3">
                              &quot;These crabs are the freshest I have ever tasted!
                              The meat is so sweet and succulent, and they were
                              cooked perfectly. My family devoured them in
                              minutes. Will definitely be ordering again for our
                              next seafood night!&quot;
                            </p>
                            <div className="flex gap-2 mb-2 lg:mb-3">
                              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 rounded-lg overflow-hidden">
                                <Image
                                  src="/crab.png"
                                  alt="Review photo"
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                />
                              </div>
                              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 rounded-lg overflow-hidden">
                                <Image
                                  src="/product-image.jpg"
                                  alt="Review photo"
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                />
                              </div>
                              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-100 rounded-lg overflow-hidden">
                                <Image
                                  src="/product-image.jpg"
                                  alt="Review photo"
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 lg:gap-4 text-xs lg:text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3 lg:w-4 lg:h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                September 15, 2025
                              </div>
                              <div className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3 lg:w-4 lg:h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Verified buyer
                              </div>
                            </div>
                            <div className="flex items-center gap-3 lg:gap-4 mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-100">
                              <span className="text-xs lg:text-sm text-gray-600">
                                Is this helpful?
                              </span>
                              <button className="flex items-center gap-1 text-xs lg:text-sm text-gray-600 hover:text-gray-900">
                                <svg
                                  className="w-3 h-3 lg:w-4 lg:h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                  />
                                </svg>
                                42
                              </button>
                              <button className="flex items-center gap-1 text-xs lg:text-sm text-gray-600 hover:text-gray-900">
                                <svg
                                  className="w-3 h-3 lg:w-4 lg:h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                                  />
                                </svg>
                                2
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Review 2 */}
                        <div className="flex gap-4 pb-6 border-b border-gray-100">
                          <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden shrink-0">
                            <Image
                              src="/crab.png"
                              alt="User"
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2 mb-2">
                              <div>
                                <div className="text-sm lg:text-base font-semibold text-gray-900">
                                  Ali Zandar
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex text-yellow-400">
                                    {[...Array(5)].map((_, i) => (
                                      <svg
                                        key={i}
                                        className="w-3 h-3 lg:w-4 lg:h-4 fill-current"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ))}
                                  </div>
                                  <span className="text-xs lg:text-sm text-gray-900 font-semibold">
                                    4.6
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 lg:gap-3 text-xs lg:text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                  256 GB
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 bg-gray-900 rounded-full"></span>
                                  Ocean Green
                                </span>
                              </div>
                            </div>
                            <p className="text-xs lg:text-sm text-gray-700 leading-relaxed mb-2 lg:mb-3">
                              &quot;The crabs were incredibly fresh and delicious.
                              They arrived well-packaged and on time. The
                              quality was outstanding, and the taste was
                              amazing. I highly recommend these crabs to anyone
                              looking for a top-notch seafood experience.&quot;
                            </p>
                            <div className="flex items-center gap-3 lg:gap-4 text-xs lg:text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3 lg:w-4 lg:h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                September 12, 2025
                              </div>
                              <div className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3 lg:w-4 lg:h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Verified buyer
                              </div>
                            </div>
                            <div className="flex items-center gap-3 lg:gap-4 mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-100">
                              <span className="text-xs lg:text-sm text-gray-600">
                                Is this helpful?
                              </span>
                              <button className="flex items-center gap-1 text-xs lg:text-sm text-gray-600 hover:text-gray-900">
                                <svg
                                  className="w-3 h-3 lg:w-4 lg:h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                  />
                                </svg>
                                27
                              </button>
                              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                                  />
                                </svg>
                                0
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* View All Button */}
                        <button className="w-full py-3 text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2 border-t border-gray-100">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                          View all
                        </button>
                      </div>
                    </div>
                  </div>
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
                  className="bg-[#C52129] text-white border-0 hover:bg-[#C52129] text-xs">
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

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 lg:w-5 lg:h-5 fill-current ${
                      i < Math.floor(metadata.rating) ? "text-yellow-400" : "text-gray-200"
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {metadata.rating.toFixed(1)} ({metadata.soldCount.toLocaleString()} sold)
              </span>
            </div>

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
                  background: displayStock === 0 ? "#9ca3af" : "linear-gradient(to right, #23429B, #C52129)",
                }}
              >
                {displayStock === 0 ? "Out of Stock" : addingToCart ? "Adding..." : "Buy it now"}
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
                    <div>{metadata.freeShipping ? "Free worldwide delivery" : `${metadata.shippingMethod} shipping`}</div>
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
      </div>
  );
}
