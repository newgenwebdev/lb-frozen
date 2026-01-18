"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";
import { AddToCartSuccessDialog } from "@/components/shared/AddToCartSuccessDialog";
import PhotoReviewCard from "@/components/shared/PhotoReviewCard";
import { useProductsQuery, useCategoriesQuery, useFeaturedReviewsQuery } from "@/lib/queries";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/lib/AuthContext";
import { useCartContext } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { useUIStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";
import type { FeaturedReview } from "@/lib/api/reviews";

export default function LandingPage() {
  const router = useRouter();
  const { role, isVIP } = useAuthContext();
  const { data: featuredProductsData, isLoading: productsLoading } = useProductsQuery({ limit: 12 });
  const featuredProducts = featuredProductsData?.products || [];
  const { data: categoriesData, isLoading: categoriesLoading } = useCategoriesQuery();
  const categories = categoriesData || [];
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
  
  // Fetch trending products
  const { data: trendingData, isLoading: trendingLoading } = useProductsQuery({ 
    trending: true, 
    limit: 8 
  });
  const trendingProducts = trendingData?.products || [];

  // Featured reviews with media - using React Query
  const { data: featuredReviews = [], isLoading: featuredReviewsLoading } = useFeaturedReviewsQuery(12);
  const [featuredReviewsPage, setFeaturedReviewsPage] = useState(0);
  const reviewsPerPage = 3;

  // Categories Pagination
  const [categoriesPage, setCategoriesPage] = useState(0);
  const categoriesPerPage = 7;
  const totalCategoriesPages = Math.ceil((categories?.length || 0) / categoriesPerPage);

  const paginatedCategories = categories?.slice(
    categoriesPage * categoriesPerPage,
    (categoriesPage + 1) * categoriesPerPage
  ) || [];

  const handleCategoriesNext = () => {
    if (categoriesPage < totalCategoriesPages - 1) {
      setCategoriesPage(prev => prev + 1);
    }
  };

  const handleCategoriesPrev = () => {
    if (categoriesPage > 0) {
      setCategoriesPage(prev => prev - 1);
    }
  };

  // State for Top Products by Categories section
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryProductsPage, setCategoryProductsPage] = useState(0);
  const productsPerPage = 3;

  // Set default category when categories load
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Fetch products for selected category
  const { data: categoryProductsData, isLoading: categoryProductsLoading } = useProductsQuery({
    category_id: selectedCategoryId || undefined,
    limit: 10,
  });
  const categoryProducts = categoryProductsData?.products || [];

  // Get the selected category name
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  // Pagination helpers for category products
  const totalCategoryProductsPages = Math.ceil((categoryProducts?.length || 0) / productsPerPage);
  const paginatedCategoryProducts = categoryProducts?.slice(
    categoryProductsPage * productsPerPage,
    (categoryProductsPage + 1) * productsPerPage
  ) || [];

  const handleCategoryProductsNext = () => {
    if (categoryProductsPage < totalCategoryProductsPages - 1) {
      setCategoryProductsPage(prev => prev + 1);
    }
  };

  const handleCategoryProductsPrev = () => {
    if (categoryProductsPage > 0) {
      setCategoryProductsPage(prev => prev - 1);
    }
  };

  // Reset page when category changes
  useEffect(() => {
    setCategoryProductsPage(0);
  }, [selectedCategoryId]);

  // Handle scroll to section on page load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Wait for content to load
      setTimeout(() => {
        const element = document.getElementById(hash.slice(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedNavbar />

      {/* Main Content */}
      <div className="mx-auto px-4 lg:px-6 py-4 lg:py-8 bg-white">
        {/* Hero Banner */}
        <div
          className="relative bg-linear-to-b from-[#23429B] to-[#C52129] rounded-3xl overflow-hidden mb-8 lg:mb-12"
          style={{ height: "480px" }}
        >
          <div className="absolute inset-0">
            {/* Left Content */}
            <div
              className="absolute left-6 lg:left-12 text-white z-10"
              style={{ width: "306px", top: "60px" }}
            >
              <h1
                className="font-semibold"
                style={{
                  fontSize: "48px",
                  lineHeight: "110%",
                  letterSpacing: "0%",
                  fontFamily: "Inter Tight, Inter, sans-serif",
                  marginBottom: "89px",
                }}
              >
                Seafood
                <br />
                shopping is
                <br />
                quicker than
                <br />
                ever!
              </h1>
              <p className="text-sm" style={{ marginBottom: "12px" }}>
                Check Information Now!
              </p>
              <button className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-full backdrop-blur-sm transition-all border border-white/30">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
                Discover more
              </button>
            </div>

            {/* Smoky Effect */}
            <div
              className="absolute z-2"
              style={{
                width: "373px",
                height: "641px",
                top: "-77px",
                left: "680px",
                background:
                  "radial-gradient(ellipse at center, #BFC8FB 0%, transparent 70%)",
                opacity: 1,
              }}
            ></div>

            {/* Blue Background Under Bowl */}
            <div
              className="absolute z-3"
              style={{
                width: "1021px",
                height: "346.64px",
                top: "131px",
                left: "435px",
                background:
                  "radial-gradient(ellipse at center, #203C8D 30%, transparent 70%)",
                opacity: 0.8,
                borderRadius: "50%",
              }}
            ></div>

            {/* Right Image - Seafood Bowl */}
            <div
              className="absolute right-0 bottom-0 overflow-hidden z-5"
              style={{ left: "420px", height: "450px" }}
            >
              <Image
                src="/hero.png"
                alt="Seafood Bowl"
                width={924}
                height={537}
                priority
                className="object-cover object-top"
              />
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            <button className="w-2.5 h-2.5 rounded-full bg-white"></button>
            <button className="w-2.5 h-2.5 rounded-full bg-white/50"></button>
            <button className="w-2.5 h-2.5 rounded-full bg-white/50"></button>
          </div>
        </div>

        {/* Browse Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Browse categories
            </h2>
            <Link
              href="/products"
              className="hidden lg:flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
              <svg
                className="w-5 h-5"
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
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categoriesLoading ? (
              // Loading skeleton
              Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-gray-100 rounded-xl p-4 animate-pulse"
                >
                  <div className="aspect-square mb-3 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                </div>
              ))
            ) : (
              paginatedCategories.map((category) => (
                <div
                  key={category.id}
                  className="bg-gray-100 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/search/results?category=${category.handle}`)}
                >
                  <div className="aspect-square mb-3 flex items-center justify-center relative">
                    <Image
                      src={category.metadata?.image_url as string || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E"}
                      alt={category.name}
                      width={120}
                      height={120}
                      className="object-contain"
                      unoptimized={!(category.metadata?.image_url)}
                    />
                  </div>
                  <p className="text-center text-sm font-medium text-gray-700">
                    {category.name}
                  </p>
                </div>
              ))
            )}
          </div>
          
          {/* Categories Pagination Controls */}
          {totalCategoriesPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button 
                onClick={handleCategoriesPrev}
                disabled={categoriesPage === 0}
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                  categoriesPage === 0 
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex gap-2">
                {[...Array(totalCategoriesPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCategoriesPage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i === categoriesPage ? 'bg-[#23429B]' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>

              <button 
                onClick={handleCategoriesNext}
                disabled={categoriesPage >= totalCategoriesPages - 1}
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                  categoriesPage >= totalCategoriesPages - 1
                    ? 'border-gray-200 text-gray-300 cursor-not-allowed' 
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Mobile View All Button */}
          <div className="lg:hidden mt-4 text-center">
            <a
              href="#"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
              <svg
                className="w-5 h-5"
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
            </a>
          </div>
        </div>
      </div>

      {/* Today's Flash Deals - Full Width Red Section */}
      <div id="flash-sale" className="bg-[#C52129] py-8">
        <div className="mx-auto px-4 lg:px-6">
          <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-2xl lg:text-3xl font-bold text-white">
              Today's flash deals
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
                            {discount}% OFF
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
                              No Image
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
                              {rating ? rating.toFixed(1) : '0'} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                            </span>
                          </div>
                        )}
                        {/* Original price crossed out in red */}
                        {discount > 0 && originalPrice && (
                          <div className="text-[#C52129] line-through text-sm mb-1">
                            RM{(originalPrice / 100).toFixed(2)}
                          </div>
                        )}
                        {/* Current price with VIP/Retail labels */}
                        <div className="flex items-end gap-4">
                          <div>
                            {isVIP && <span className="text-xs text-gray-500 block">VIP Price</span>}
                            <span className="text-2xl font-bold text-gray-900">
                              RM{((salePrice || originalPrice || 0) / 100).toFixed(2)}
                            </span>
                          </div>
                          {isVIP && originalPrice && salePrice && originalPrice !== salePrice && (
                            <div className="border-l border-gray-300 pl-4">
                              <span className="text-xs text-gray-500 block">Retail Price</span>
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
                  <p>No flash deals available at the moment.</p>
                  <Link href="/search/results" className="text-[#C52129] underline hover:no-underline mt-2 inline-block">
                    Browse all products
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

      {/* Products on Trend This Month - Blue Section */}
      <div id="trending" className="bg-[#23429B] py-8 lg:py-12">
        <div className="mx-auto px-4 lg:px-6">
          <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between lg:mb-8">
            <h2 className="text-2xl lg:text-4xl font-bold text-white">
              Products on trend this month
            </h2>
            <div className="hidden lg:flex gap-2">
              <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100">
                <svg
                  className="w-6 h-6"
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
              <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100">
                <svg
                  className="w-6 h-6"
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

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {trendingLoading ? (
              // Loading skeleton
              [...Array(5)].map((_, index) => (
                <div key={index} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                  <div className="bg-gray-200 aspect-square"></div>
                  <div className="p-4">
                    <div className="flex gap-2 mb-3">
                      <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                      <div className="h-4 w-12 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-7 w-24 bg-gray-200 rounded"></div>
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : trendingProducts && trendingProducts.length > 0 ? (
              trendingProducts.slice(0, 5).map((product) => {
                // Get price from calculated_price
                const variant = product.variants?.[0];
                const calculatedPrice = variant?.calculated_price;
                const currentPrice = calculatedPrice?.calculated_amount 
                  ? (calculatedPrice.calculated_amount / 100).toFixed(2)
                  : null;
                const originalPriceVal = calculatedPrice?.original_amount && calculatedPrice.original_amount !== calculatedPrice.calculated_amount
                  ? (calculatedPrice.original_amount / 100).toFixed(2)
                  : null;
                // Always display RM for Malaysian Ringgit
                const currency = 'RM';
                
                // Get review stats
                const reviewStats = (product as any).review_stats;
                const rating = reviewStats?.average_rating || null;
                const reviewCount = reviewStats?.total_reviews || 0;
                const hashtag = product.handle ? `#${product.handle.split('-')[0]}` : '#trending';
                
                // Calculate discount percentage if there's an original price
                const discountPercent = originalPriceVal && currentPrice
                  ? Math.round((1 - parseFloat(currentPrice) / parseFloat(originalPriceVal)) * 100)
                  : null;
                
                const isFavorite = isInWishlist(product.id);

                return (
                  <Link href={`/product/${product.id}`} key={product.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      {/* Discount badge - top left */}
                      {discountPercent && discountPercent > 0 && (
                        <div className="absolute top-4 left-4 bg-[#23429B] text-white text-xs font-semibold px-3 py-1.5 rounded-full z-10">
                          {discountPercent}% OFF
                        </div>
                      )}
                      {/* Heart button - top right */}
                      <button 
                        className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                          isFavorite ? 'bg-[#23429B]' : 'bg-white/80 hover:bg-white'
                        }`}
                        onClick={(e) => handleWishlistToggle(e, product)}
                      >
                        <svg
                          className={`w-5 h-5 ${isFavorite ? 'text-white fill-current' : 'text-gray-400'}`}
                          fill={isFavorite ? 'currentColor' : 'none'}
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
                      <div className="aspect-square">
                        <Image
                          src={product.thumbnail || "/placeholder-product.png"}
                          alt={product.title}
                          width={200}
                          height={200}
                          className="object-cover h-full w-full"
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-white">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-[#23429B] text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                          <span>📈</span> Trends
                        </span>
                        <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                          {hashtag}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-12">
                        {product.title}
                      </h3>
                      {(rating !== null || reviewCount > 0) && (
                        <div className="flex items-center gap-1 mb-4">
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${rating && i < Math.floor(Number(rating)) ? 'fill-current' : 'fill-gray-200'}`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">{rating ? rating.toFixed(1) : '0'} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})</span>
                        </div>
                      )}
                      <div className="flex items-end justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-xl font-bold text-[#1a2b5f]">
                            {currency}{currentPrice || '0.00'}
                          </div>
                          {originalPriceVal && (
                            <div className="text-sm text-[#C52129] line-through">
                              {currency}{originalPriceVal}
                            </div>
                          )}
                        </div>
                        <button 
                          className="w-10 h-10 shrink-0 ml-3 border-2 border-gray-200 rounded-full flex items-center justify-center hover:border-[#23429B] hover:text-[#23429B] transition-colors"
                          onClick={(e) => {
                            e.preventDefault();
                            if (variant) {
                              const price = calculatedPrice?.calculated_amount || 0;
                              handleAddToCart(variant.id, {
                                title: product.title,
                                thumbnail: product.thumbnail || undefined,
                                price: price,
                                variantTitle: variant.title,
                              });
                            }
                          }}
                        >
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
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              // Empty state
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-white">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-lg font-medium">No trending products available</p>
                <p className="text-sm opacity-75 mt-1">Check back later for trending items</p>
              </div>
            )}
          </div>

          {/* Mobile Navigation - Bottom */}
          <div className="flex lg:hidden justify-end gap-2 mt-6">
            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100">
              <svg
                className="w-5 h-5"
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
            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100">
              <svg
                className="w-5 h-5"
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

      {/* Top Products by Categories */}
      <div className="bg-gray-50 py-8 lg:py-12">
        <div className="mx-auto px-4 lg:px-6">
          <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between lg:mb-8">
            <h2 className="text-2xl lg:text-4xl font-bold text-gray-900">
              Top products by categories
            </h2>
            <Link
              href="/products"
              className="hidden lg:flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
              <svg
                className="w-5 h-5"
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
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Promo Card */}
            <div className="bg-linear-to-b from-[#C52129] to-[#203C8D] rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden min-h-75 lg:min-h-0">
              <div className="relative z-10">
                <div className="inline-block bg-[#23429B] px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs font-medium mb-3 lg:mb-4">
                  FRESH SEAFOOD, EXCLUSIVE OFFERS
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold mb-2 lg:mb-3 leading-tight">
                  Enjoy up to 40%
                  <br />
                  OFF on our
                  <br />
                  selection of fresh
                  <br />
                  seafood!
                </h3>
                <p className="text-xs lg:text-sm mb-3 lg:mb-4 opacity-90">
                  Explore the flavors that catch attention
                  <br />
                  before the deal disappears!
                </p>
                <button className="bg-white text-[#23429B] px-4 lg:px-5 py-2 lg:py-2.5 rounded-full text-xs lg:text-sm font-semibold hover:bg-gray-100 flex items-center gap-2">
                  View all
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>

              {/* Blue Elliptical Rings Behind Lobster - Desktop */}
              <div
                className="hidden lg:block absolute rounded-full"
                style={{
                  width: "600px",
                  height: "600px",
                  bottom: "-400px",
                  right: "-200px",
                  border: "60px solid #192F6E",
                  zIndex: 1,
                }}
              ></div>
              <div
                className="hidden lg:block absolute rounded-full"
                style={{
                  width: "420px",
                  height: "420px",
                  bottom: "-315px",
                  right: "-120px",
                  border: "50px solid #192F6E",
                  zIndex: 1,
                }}
              ></div>

              {/* Blue Elliptical Rings Behind Lobster - Mobile */}
              <div
                className="lg:hidden absolute rounded-full"
                style={{
                  width: "300px",
                  height: "300px",
                  bottom: "-200px",
                  right: "-100px",
                  border: "30px solid #192F6E",
                  zIndex: 1,
                }}
              ></div>
              <div
                className="lg:hidden absolute rounded-full"
                style={{
                  width: "210px",
                  height: "210px",
                  bottom: "-157px",
                  right: "-60px",
                  border: "25px solid #192F6E",
                  zIndex: 1,
                }}
              ></div>

              {/* Lobster Image - Desktop */}
              <div
                className="hidden lg:block absolute"
                style={{
                  width: "400px",
                  height: "400px",
                  bottom: "-100px",
                  right: "-60px",
                  zIndex: 2,
                }}
              >
                <Image
                  src="/lobster-bg-removed.png"
                  alt="Lobster"
                  width={400}
                  height={400}
                  className="object-contain"
                  style={{ transform: "rotate(45deg)", opacity: 1 }}
                />
              </div>

              {/* Lobster Image - Mobile */}
              <div
                className="lg:hidden absolute"
                style={{
                  width: "200px",
                  height: "200px",
                  bottom: "-50px",
                  right: "-30px",
                  zIndex: 2,
                }}
              >
                <Image
                  src="/lobster-bg-removed.png"
                  alt="Lobster"
                  width={200}
                  height={200}
                  className="object-contain"
                  style={{ transform: "rotate(45deg)", opacity: 1 }}
                />
              </div>
            </div>

            {/* Right Side - Product Grid */}
            <div>
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categoriesLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                  ))
                ) : (
                  categories.slice(0, 5).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedCategoryId === category.id
                          ? 'bg-[#23429B] text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  Top {selectedCategory?.name || 'Products'}
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={handleCategoryProductsPrev}
                    disabled={categoryProductsPage === 0}
                    className={`w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center transition-colors ${
                      categoryProductsPage === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
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
                    onClick={handleCategoryProductsNext}
                    disabled={categoryProductsPage >= totalCategoryProductsPages - 1}
                    className={`w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center transition-colors ${
                      categoryProductsPage >= totalCategoryProductsPages - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryProductsLoading ? (
                  // Loading skeleton
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                      <div className="bg-gray-200 aspect-square"></div>
                      <div className="p-4">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="flex items-center justify-between">
                          <div className="h-5 bg-gray-200 rounded w-20"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : paginatedCategoryProducts.length > 0 ? (
                  paginatedCategoryProducts.map((product) => {
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
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                      >
                        <div className="relative">
                          {discount > 0 && (
                            <div className="absolute top-3 left-3 bg-[#C52129] text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
                              {discount}% OFF
                            </div>
                          )}
                          <button 
                            className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 z-10"
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
                          <div className="aspect-square">
                            <Image
                              src={product.thumbnail || '/placeholder-product.png'}
                              alt={product.title}
                              width={150}
                              height={150}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                            {product.title}
                          </h4>
                          {(rating !== null || reviewCount > 0) && (
                            <div className="flex items-center gap-1 mb-2">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-3 h-3 fill-current ${rating && i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs text-gray-600">
                                {rating ? rating.toFixed(1) : '0'} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                              </span>
                            </div>
                          )}
                          <div className="flex items-end justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="text-lg font-bold text-gray-900">
                                RM{salePrice ? (salePrice / 100).toFixed(2) : '0.00'}
                              </div>
                              {originalPrice && originalPrice > (salePrice || 0) && (
                                <div className="text-xs text-gray-400 line-through">
                                  RM{(originalPrice / 100).toFixed(2)}
                                </div>
                              )}
                            </div>
                            <button 
                              className="w-8 h-8 shrink-0 ml-3 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                              onClick={(e) => {
                                e.preventDefault();
                                if (variant?.id) {
                                  handleAddToCart(variant.id, {
                                    title: product.title,
                                    thumbnail: product.thumbnail || undefined,
                                    price: salePrice || originalPrice || 0,
                                    variantTitle: variant?.title,
                                  });
                                }
                              }}
                            >
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
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  // Empty state
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    <p>No products found in this category.</p>
                  </div>
                )}
              </div>

              {/* Page indicator */}
              {totalCategoryProductsPages > 1 && (
                <div className="flex justify-center gap-1 mt-4">
                  {[...Array(totalCategoryProductsPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCategoryProductsPage(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === categoryProductsPage ? 'bg-[#23429B]' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Check out the seafood buyer Section - Photo Reviews */}
      <div className="mx-auto px-4 lg:px-6 py-8 lg:py-12 bg-[#F9F9F9]">
        <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between lg:mb-6">
          <h2 className="text-xl lg:text-3xl font-bold text-gray-900">
            Check out the seafood buyer, then dive into purchasing online.
          </h2>
          <div className="hidden lg:flex gap-2">
            <button 
              onClick={() => setFeaturedReviewsPage(prev => Math.max(0, prev - 1))}
              disabled={featuredReviewsPage === 0}
              className={`w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center transition-colors ${
                featuredReviewsPage === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
              }`}
            >
              <svg
                className="w-5 h-5"
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
              onClick={() => setFeaturedReviewsPage(prev => Math.min(Math.ceil(featuredReviews.length / reviewsPerPage) - 1, prev + 1))}
              disabled={featuredReviewsPage >= Math.ceil(featuredReviews.length / reviewsPerPage) - 1}
              className={`w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center transition-colors ${
                featuredReviewsPage >= Math.ceil(featuredReviews.length / reviewsPerPage) - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
              }`}
            >
              <svg
                className="w-5 h-5"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredReviewsLoading ? (
            // Loading skeleton
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-3 w-1/2"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 bg-gray-200 rounded"></div>
                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))
          ) : featuredReviews.length > 0 ? (
            featuredReviews
              .slice(featuredReviewsPage * reviewsPerPage, (featuredReviewsPage + 1) * reviewsPerPage)
              .map((review: FeaturedReview) => (
                <PhotoReviewCard key={review.id} review={review as FeaturedReview} />
              ))
          ) : (
            // Empty state - show placeholder cards
            <div className="col-span-3 text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">No photo reviews yet</p>
              <p className="text-sm mt-1">Be the first to share your seafood experience!</p>
            </div>
          )}
        </div>

        {/* Mobile Navigation - Bottom */}
        <div className="flex lg:hidden justify-end gap-2 mt-6">
          <button 
            onClick={() => setFeaturedReviewsPage(prev => Math.max(0, prev - 1))}
            disabled={featuredReviewsPage === 0}
            className={`w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center transition-colors ${
              featuredReviewsPage === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
            }`}
          >
            <svg
              className="w-5 h-5"
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
            onClick={() => setFeaturedReviewsPage(prev => Math.min(Math.ceil(featuredReviews.length / reviewsPerPage) - 1, prev + 1))}
            disabled={featuredReviewsPage >= Math.ceil(featuredReviews.length / reviewsPerPage) - 1}
            className={`w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center transition-colors ${
              featuredReviewsPage >= Math.ceil(featuredReviews.length / reviewsPerPage) - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
            }`}
          >
            <svg
              className="w-5 h-5"
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

        {/* Page indicator */}
        {featuredReviews.length > reviewsPerPage && (
          <div className="flex justify-center gap-1 mt-4">
            {[...Array(Math.ceil(featuredReviews.length / reviewsPerPage))].map((_, i) => (
              <button
                key={i}
                onClick={() => setFeaturedReviewsPage(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === featuredReviewsPage ? 'bg-[#23429B]' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div id="contact-us">
        <NewsletterFooter />
      </div>

      {/* Add to Cart Success Dialog */}
      <AddToCartSuccessDialog
        open={cartSuccessDialog.open}
        onOpenChange={(open) => !open && hideCartSuccess()}
        product={cartSuccessDialog.product}
      />
    </div>
  );
}
