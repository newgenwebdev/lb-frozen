"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useProductsQuery } from "@/lib/queries";
import { useAuthContext } from "@/lib/AuthContext";
import { useCartContext } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { AddToCartSuccessDialog } from "./AddToCartSuccessDialog";
import { useToast } from "@/components/ui/toast";

interface SimilarItemsProps {
  categoryId?: string;
  currentProductId?: string;
}

export function SimilarItems({
  categoryId,
  currentProductId,
}: SimilarItemsProps) {
  const { addItem } = useCartContext();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Add to cart success dialog state
  const [cartSuccessOpen, setCartSuccessOpen] = useState(false);
  const [addedProduct, setAddedProduct] = useState<{
    name: string;
    price: number;
    image?: string;
    quantity: number;
  } | null>(null);

  // Fetch similar products - either by category or just random products
  const { data: productsData, isLoading: loading } = useProductsQuery({
    category_id: categoryId,
    limit: 10,
  });
  const products = productsData?.products || [];

  // Filter out current product
  const similarProducts =
    products?.filter((p) => p.id !== currentProductId) || [];

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [similarProducts]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  const handleAddToCart = async (
    variantId: string,
    product: { title: string; thumbnail?: string | null; price: number }
  ) => {
    try {
      await addItem(variantId, 1);
      setAddedProduct({
        name: product.title,
        price: product.price,
        image: product.thumbnail || undefined,
        quantity: 1,
      });
      setCartSuccessOpen(true);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      showToast("Failed to add to cart", "error");
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    e.preventDefault();
    const variant = product.variants?.[0];
    const price = variant?.calculated_price;
    
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
      showToast("Removed from wishlist", "info");
    } else if (variant?.id) {
      addToWishlist({
        product_id: product.id,
        title: product.title,
        handle: product.handle || product.id,
        thumbnail: product.thumbnail || undefined,
        price: price?.calculated_amount || 0,
        original_price: price?.original_amount,
        currency: "RM",
        variant_id: variant.id,
        variant_title: variant?.title,
      });
      showToast("Added to wishlist", "success");
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="shrink-0 w-50 lg:w-60">
            <div className="bg-white/20 rounded-2xl aspect-square animate-pulse" />
            <div className="mt-3 space-y-2">
              <div className="h-4 bg-white/20 rounded animate-pulse" />
              <div className="h-4 bg-white/20 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (similarProducts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative">
        {/* Header with Title and Navigation Buttons */}
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-4xl font-bold text-white">
            Similar items
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-full flex items-center justify-center transition-all ${
                canScrollLeft
                  ? "hover:bg-gray-100 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              <svg
                className="w-4 h-4 lg:w-5 lg:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-full flex items-center justify-center transition-all ${
                canScrollRight
                  ? "hover:bg-gray-100 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              <svg
                className="w-4 h-4 lg:w-5 lg:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Products Carousel */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {similarProducts.map((product) => {
            const variant = product.variants?.[0];
            const price = variant?.calculated_price?.calculated_amount || 0;
            let originalPrice =
              variant?.calculated_price?.original_amount || price;
            const metadataDiscount = variant?.metadata?.discount
              ? Number(variant.metadata.discount)
              : 0;
            const discountType =
              (variant?.metadata?.discount_type as string) || "percentage";

            if (metadataDiscount > 0 && originalPrice === price) {
              if (discountType === "percentage") {
                originalPrice = Math.round(
                  price / (1 - metadataDiscount / 100)
                );
              } else {
                originalPrice = price + metadataDiscount * 100;
              }
            }

            const discountPercent =
              originalPrice > price
                ? Math.round(((originalPrice - price) / originalPrice) * 100)
                : 0;

            // Get review stats
            const reviewStats = (product as any).review_stats;
            const rating = reviewStats?.average_rating || null;
            const reviewCount = reviewStats?.total_reviews || 0;
            const soldCount = (product as any).sold_count || 0;

            // Check if trending
            const isTrending = product.metadata?.trending;
            
            // Check if in wishlist
            const isFavorite = isInWishlist(product.id);

            return (
              <div key={product.id} className="shrink-0 w-50 lg:w-60">
                <Link href={`/product/${product.id}`}>
                  <div className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Image Container */}
                    <div className="relative bg-gray-50 aspect-square p-4">
                      {/* Discount Badge */}
                      {discountPercent > 0 && (
                        <div className="absolute top-3 left-3 bg-[#C52129] text-white text-xs font-semibold px-2 py-1 rounded-full z-10">
                          {discountPercent}% OFF
                        </div>
                      )}

                      {/* Trending Badge */}
                      {isTrending && (
                        <div className="absolute top-3 right-12 flex items-center gap-1">
                          <span className="bg-[#23429B] text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                            📈 Trends
                          </span>
                        </div>
                      )}

                      {/* Heart Button */}
                      <button
                        onClick={(e) => handleWishlistToggle(e, product)}
                        className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 z-10 shadow-sm"
                      >
                        <svg
                          className={`w-4 h-4 transition-colors ${
                            isFavorite
                              ? "text-[#C52129] fill-current"
                              : "text-gray-400"
                          }`}
                          fill={isFavorite ? "currentColor" : "none"}
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

                      <Image
                        src={product.thumbnail || "/placeholder-product.png"}
                        alt={product.title}
                        width={180}
                        height={180}
                        className="object-contain w-full h-full"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="p-3 lg:p-4">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 min-h-10 mb-2">
                        {product.title}
                      </h3>

                      {/* Rating */}
                      {rating !== null && rating > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-3 h-3 fill-current ${
                                  i < Math.floor(rating) ? "" : "opacity-30"
                                }`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            {rating.toFixed(1)} (
                            {reviewCount > 1000
                              ? `${(reviewCount / 1000).toFixed(1)}k`
                              : reviewCount}{" "}
                            sold)
                          </span>
                        </div>
                      )}

                      {/* Price Row */}
                      <div className="flex items-end justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-bold text-gray-900">
                            RM{(price / 100).toFixed(2)}
                          </div>
                          {originalPrice > price && (
                            <div className="text-sm text-[#C52129] line-through">
                              RM{(originalPrice / 100).toFixed(2)}
                            </div>
                          )}
                        </div>

                        {/* Add to Cart Button */}
                        {variant && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleAddToCart(variant.id, {
                                title: product.title,
                                thumbnail: product.thumbnail,
                                price: price,
                              });
                            }}
                            className="w-8 h-8 shrink-0 ml-3 border border-gray-200 rounded-full flex items-center justify-center hover:border-[#23429B] hover:text-[#23429B] transition-colors"
                          >
                            <svg
                              className="w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add to Cart Success Dialog */}
      <AddToCartSuccessDialog
        open={cartSuccessOpen}
        onOpenChange={setCartSuccessOpen}
        product={addedProduct}
      />
    </>
  );
}
