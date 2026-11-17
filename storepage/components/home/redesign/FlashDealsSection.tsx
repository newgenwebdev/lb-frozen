"use client";

// Flash deals block, copied from components/home/legacy/LegacyHomePage.tsx so the legacy
// homepage stays untouched and can be restored as-is. Keep the two in sync if behaviour changes.
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AddToCartSuccessDialog } from "@/components/shared/AddToCartSuccessDialog";
import { useProductsQuery } from "@/lib/queries";
import { useAuthContext } from "@/lib/AuthContext";
import { useCartContext } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { useUIStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";
import { CONTAINER, SECTION_IDS } from "./layout";

export default function FlashDealsSection() {
  const t = useTranslations("Home");
  const router = useRouter();
  const { isVIP, isSupplier } = useAuthContext();
  const showRolePrice = isVIP || isSupplier;
  const rolePriceLabel = isVIP ? t("vipPrice") : isSupplier ? t("supplierPrice") : "";
  const { addItem } = useCartContext();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showToast } = useToast();

  // Zustand UI store for cart success dialog
  const { cartSuccessDialog, showCartSuccess, hideCartSuccess } = useUIStore();

  // Fetch flash sale products
  const { data: flashSaleData, isLoading: flashSaleLoading } = useProductsQuery({
    flash_sale: true,
    limit: 8
  });
  const flashSaleProducts = flashSaleData?.products || [];

  // Countdown timer state
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    // Set end of day as countdown target
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ hours, minutes, seconds });
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddToCart = async (variantId: string, product?: { title: string; thumbnail?: string; price?: number; variantTitle?: string }) => {
    try {
      await addItem(variantId, 1);
      // Show success dialog with product info using Zustand
      showCartSuccess({
        name: product?.title || "Product",
        price: product?.price || 0,
        image: product?.thumbnail,
        quantity: 1,
        variantTitle: product?.variantTitle,
      });
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  // Helper function to toggle wishlist for a product
  const handleWishlistToggle = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    e.preventDefault();
    const variant = product.variants?.[0];
    const price = variant?.calculated_price;
    
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
      showToast(t("removedFromWishlist"), "info");
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
      showToast(t("addedToWishlist"), "success");
    }
  };

  return (
    <>
        {/* Today's Flash Deals - Full Width Red Section */}
        <div id={SECTION_IDS.flashSale} className="scroll-mt-20 bg-[#C52129] py-8">
          <div className={CONTAINER}>
            <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-2xl lg:text-3xl font-bold text-white">
                {t("flashDeals")}
              </h2>
              <div className="flex gap-2 overflow-x-auto">
                <div className="bg-white rounded-lg px-3 py-2 text-center min-w-12.5 lg:min-w-15 lg:px-4">
                  <span className="text-xl lg:text-2xl font-bold text-gray-900">00</span>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-center min-w-12.5 lg:min-w-15 lg:px-4">
                  <span className="text-xl lg:text-2xl font-bold text-gray-900">{String(countdown.hours).padStart(2, '0')}</span>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-center min-w-12.5 lg:min-w-15 lg:px-4">
                  <span className="text-xl lg:text-2xl font-bold text-gray-900">{String(countdown.minutes).padStart(2, '0')}</span>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 text-center min-w-12.5 lg:min-w-15 lg:px-4">
                  <span className="text-xl lg:text-2xl font-bold text-gray-900">{String(countdown.seconds).padStart(2, '0')}</span>
                </div>
              </div>
            </div>
  
            {/* White container for products */}
            <div className="bg-white rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {flashSaleLoading ? (
                  // Loading skeleton
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))
                ) : flashSaleProducts && flashSaleProducts.length > 0 ? (
                  flashSaleProducts.slice(0, 4).map((product) => {
                    const variant = product.variants?.[0];
                    const price = variant?.calculated_price;
                    const originalPrice = price?.original_amount;
                    const salePrice = price?.calculated_amount;
                    const discount = originalPrice && salePrice && originalPrice > salePrice 
                      ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) 
                      : 0;
                    const reviewStats = (product as any).review_stats;
                    const rating = reviewStats?.average_rating || null;
                    const reviewCount = reviewStats?.total_reviews || 0;
                    const isFavorite = isInWishlist(product.id);
  
                    return (
                      <div 
                        key={product.id} 
                        className="cursor-pointer group"
                        onClick={() => handleProductClick(product.id)}
                      >
                        <div className="relative">
                          {discount > 0 && (
                            <div className="absolute top-3 left-3 bg-[#C52129] text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
                              {t("percentOff", { percent: discount })}
                            </div>
                          )}
                          <button 
                            className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 z-10 shadow-sm"
                            onClick={(e) => handleWishlistToggle(e, product)}
                          >
                            {isFavorite ? (
                              <svg
                                className="w-5 h-5 text-red-500 fill-current"
                                viewBox="0 0 20 20"
                              >
                                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5 text-gray-400"
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
                            )}
                          </button>
                          <div className="aspect-square rounded-lg">
                            {product.thumbnail ? (
                              <Image
                                src={product.thumbnail}
                                alt={product.title || "Product"}
                                width={200}
                                height={200}
                                className="object-cover w-full h-full rounded-2xl lg:rounded-3xl"
  
                              />
                            ) : (
                              <div className="w-48 h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                                {t("noImage")}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="pt-4">
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                            {product.title}
                          </h3>
                          {(rating !== null || reviewCount > 0) && (
                            <div className="flex items-center gap-1 mb-2">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-4 h-4 ${rating && i < Math.floor(Number(rating)) ? 'fill-current' : 'fill-gray-300'}`}
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-sm text-gray-600">
                                {rating ? rating.toFixed(1) : '0'} ({t("reviewCount", { count: reviewCount })})
                              </span>
                            </div>
                          )}
                          {/* Original price crossed out in red */}
                          {discount > 0 && originalPrice && (
                            <div className="text-[#C52129] line-through text-sm mb-1">
                              RM{(originalPrice / 100).toFixed(2)}
                            </div>
                          )}
                          {/* Current price with role/Retail labels */}
                          <div className="flex items-end gap-4">
                            <div>
                              {showRolePrice && (
                                <span className="text-xs text-gray-500 block">{rolePriceLabel}</span>
                              )}
                              <span className="text-2xl font-bold text-gray-900">
                                RM{((salePrice || originalPrice || 0) / 100).toFixed(2)}
                              </span>
                            </div>
                            {showRolePrice && originalPrice && salePrice && originalPrice !== salePrice && (
                              <div className="border-l border-gray-300 pl-4">
                                <span className="text-xs text-gray-500 block">{t("retailPrice")}</span>
                                <span className="text-sm text-gray-600">
                                  RM{(originalPrice / 100).toFixed(2)}
                                </span>
                              </div>
                            )}
                            <button 
                              className="ml-auto w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-medium text-xl"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (variant?.id) handleAddToCart(variant.id, {
                                  title: product.title,
                                  thumbnail: product.thumbnail || undefined,
                                  price: salePrice || originalPrice || 0,
                                  variantTitle: variant.title,
                                });
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // No flash sale products
                  <div className="col-span-4 text-center py-8 text-gray-500">
                    <p>{t("noFlashDeals")}</p>
                    <Link href="/search/results" className="text-[#C52129] underline hover:no-underline mt-2 inline-block">
                      {t("browseAllProducts")}
                    </Link>
                  </div>
                )}
              </div>
  
              {/* Progress bar and Navigation */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex-1 flex justify-start mr-6">
                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-1/3 h-full bg-gray-800 rounded-full"></div>
                  </div>
                </div>
                {/* Navigation Arrows */}
                <div className="flex gap-2">
                  <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                    <svg
                      className="w-5 h-5 text-gray-600"
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
                  <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">
                    <svg
                      className="w-5 h-5 text-gray-600"
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
            </div>
          </div>
        </div>

      {/* Add to Cart Success Dialog */}
      <AddToCartSuccessDialog
        open={cartSuccessDialog.open}
        onOpenChange={(open) => !open && hideCartSuccess()}
        product={cartSuccessDialog.product}
      />
    </>
  );
}
