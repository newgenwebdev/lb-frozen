"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCategoriesQuery, useProductsQuery } from "@/lib/queries";
import { useAuthContext } from "@/lib/AuthContext";
import { useCartContext } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { AddToCartSuccessDialog } from "@/components/shared/AddToCartSuccessDialog";
import { useUIStore } from "@/lib/stores";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/lib/api/types";

// Sort options
const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "created_at", label: "Newest" },
  { value: "-created_at", label: "Oldest" },
  { value: "title", label: "Name A-Z" },
  { value: "-title", label: "Name Z-A" },
] as const;

// Items per page
const ITEMS_PER_PAGE = 12;

// Delivery speed options
const DELIVERY_OPTIONS = [
  { value: 0, label: "Today", apiValue: "today" as const },
  { value: 1, label: "Tomorrow", apiValue: "tomorrow" as const },
  { value: 2, label: "Few days", apiValue: "few_days" as const },
  { value: 3, label: "Anytime", apiValue: "anytime" as const },
] as const;

export function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem: addToCart } = useCartContext();
  const { showToast } = useToast();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  // Zustand UI store for cart success dialog
  const { cartSuccessDialog, showCartSuccess, hideCartSuccess } = useUIStore();

  const searchQuery = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "";
  const sortParam = searchParams.get("sort") || "recommended";
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const ratingParam = searchParams.get("rating");
  const deliveryParam = searchParams.get("delivery");
  const flashSaleParam = searchParams.get("flash_sale") === "true";
  const trendingParam = searchParams.get("trending") === "true";
  const onBrandParam = searchParams.get("on_brand") === "true";

  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategoriesQuery();
  const categories = categoriesData || [];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [deliverySpeed, setDeliverySpeed] = useState<[number, number]>([0, 3]);
  const [flashSaleFilter, setFlashSaleFilter] = useState(flashSaleParam);
  const [trendingFilter, setTrendingFilter] = useState(trendingParam);
  const [onBrandFilter, setOnBrandFilter] = useState(onBrandParam);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [deliveryOpen, setDeliveryOpen] = useState(true);
  const [ratingsOpen, setRatingsOpen] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [sortBy, setSortBy] = useState(sortParam);
  const [currentPage, setCurrentPage] = useState(pageParam);

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (ratingParam) {
      setSelectedRating(parseInt(ratingParam, 10));
    }
    if (deliveryParam) {
      const deliveryIdx = DELIVERY_OPTIONS.findIndex(
        (opt) => opt.apiValue === deliveryParam
      );
      if (deliveryIdx >= 0) {
        setDeliverySpeed([0, deliveryIdx]);
      }
    }
    setFlashSaleFilter(flashSaleParam);
    setTrendingFilter(trendingParam);
    setOnBrandFilter(onBrandParam);
  }, [
    categoryParam,
    ratingParam,
    deliveryParam,
    flashSaleParam,
    trendingParam,
    onBrandParam,
  ]);

  const selectedCategoryId = selectedCategory
    ? categories?.find(
        (cat: { handle: string; id: string }) => cat.handle === selectedCategory
      )?.id
    : undefined;

  const getDeliverySpeedFilter = ():
    | "today"
    | "tomorrow"
    | "few_days"
    | "anytime"
    | undefined => {
    const maxIdx = deliverySpeed[1];
    if (maxIdx >= 3) return undefined;
    return DELIVERY_OPTIONS[maxIdx]?.apiValue;
  };

  const productFilters = useMemo(() => {
    const filters: {
      q?: string;
      category_id?: string;
      order?: string;
      limit?: number;
      offset?: number;
      min_rating?: number;
      delivery_speed?: "today" | "tomorrow" | "few_days" | "anytime";
      flash_sale?: boolean;
      trending?: boolean;
      on_brand?: boolean;
    } = {
      limit: ITEMS_PER_PAGE,
      offset: (currentPage - 1) * ITEMS_PER_PAGE,
    };

    if (searchQuery) filters.q = searchQuery;
    if (selectedCategoryId) filters.category_id = selectedCategoryId;
    if (sortBy && sortBy !== "recommended") filters.order = sortBy;
    if (selectedRating) filters.min_rating = selectedRating;

    const deliverySpeedValue = getDeliverySpeedFilter();
    if (deliverySpeedValue) filters.delivery_speed = deliverySpeedValue;
    if (flashSaleFilter) filters.flash_sale = true;
    if (trendingFilter) filters.trending = true;
    if (onBrandFilter) filters.on_brand = true;

    return filters;
  }, [
    searchQuery,
    selectedCategoryId,
    sortBy,
    currentPage,
    selectedRating,
    deliverySpeed,
    flashSaleFilter,
    trendingFilter,
    onBrandFilter,
  ]);

  const { data: productsData, isLoading: productsLoading } =
    useProductsQuery(productFilters);
  const products = productsData?.products || [];
  const totalProducts = productsData?.count || 0;
  const ratingCounts = productsData?.ratingCounts || null;
  const { data: allProductsData } = useProductsQuery({ limit: 100 });
  const allProducts = allProductsData?.products || [];

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (categories && categories.length > 0 && allProducts) {
      categories.forEach((category: { id: string; handle: string }) => {
        const count = allProducts.filter(
          (product: { categories?: Array<{ id: string; handle: string }> }) =>
            product.categories &&
            product.categories.length > 0 &&
            product.categories.some(
              (cat) => cat.id === category.id || cat.handle === category.handle
            )
        ).length;
        counts[category.id] = count;
      });
    }
    return counts;
  }, [categories, allProducts]);

  const totalPages = Math.ceil((totalProducts || 0) / ITEMS_PER_PAGE);

  const updateUrlParams = (params: {
    sort?: string;
    page?: number;
    category?: string | null;
    rating?: number | null;
    delivery?: string | null;
    flash_sale?: boolean;
    trending?: boolean;
    on_brand?: boolean;
  }) => {
    const newParams = new URLSearchParams(searchParams.toString());

    if (params.sort !== undefined) {
      if (params.sort === "recommended") newParams.delete("sort");
      else newParams.set("sort", params.sort);
    }
    if (params.page !== undefined) {
      if (params.page === 1) newParams.delete("page");
      else newParams.set("page", params.page.toString());
    }
    if (params.category !== undefined) {
      if (params.category === null) newParams.delete("category");
      else newParams.set("category", params.category);
    }
    if (params.rating !== undefined) {
      if (params.rating === null) newParams.delete("rating");
      else newParams.set("rating", params.rating.toString());
    }
    if (params.delivery !== undefined) {
      if (params.delivery === null || params.delivery === "anytime")
        newParams.delete("delivery");
      else newParams.set("delivery", params.delivery);
    }
    if (params.flash_sale !== undefined) {
      if (params.flash_sale) newParams.set("flash_sale", "true");
      else newParams.delete("flash_sale");
    }
    if (params.trending !== undefined) {
      if (params.trending) newParams.set("trending", "true");
      else newParams.delete("trending");
    }
    if (params.on_brand !== undefined) {
      if (params.on_brand) newParams.set("on_brand", "true");
      else newParams.delete("on_brand");
    }

    router.push(`/search/results?${newParams.toString()}`);
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setCurrentPage(1);
    updateUrlParams({ sort: newSort, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateUrlParams({ page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategoryChange = (categoryHandle: string | null) => {
    setSelectedCategory(categoryHandle);
    setCurrentPage(1);
    updateUrlParams({ category: categoryHandle, page: 1 });
  };

  const handleRatingChange = (rating: number | null) => {
    const newRating = selectedRating === rating ? null : rating;
    setSelectedRating(newRating);
    setCurrentPage(1);
    updateUrlParams({ rating: newRating, page: 1 });
  };

  const handleDeliverySpeedChange = (value: number[]) => {
    setDeliverySpeed([value[0], value[1]]);
    setCurrentPage(1);
    const deliveryValue =
      value[1] >= 3 ? null : DELIVERY_OPTIONS[value[1]]?.apiValue || null;
    updateUrlParams({ delivery: deliveryValue, page: 1 });
  };

  const handleFlashSaleToggle = () => {
    const newValue = !flashSaleFilter;
    setFlashSaleFilter(newValue);
    setCurrentPage(1);
    updateUrlParams({ flash_sale: newValue, page: 1 });
  };

  const handleTrendingToggle = () => {
    const newValue = !trendingFilter;
    setTrendingFilter(newValue);
    setCurrentPage(1);
    updateUrlParams({ trending: newValue, page: 1 });
  };

  const handleOnBrandToggle = () => {
    const newValue = !onBrandFilter;
    setOnBrandFilter(newValue);
    setCurrentPage(1);
    updateUrlParams({ on_brand: newValue, page: 1 });
  };

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedRating(null);
    setDeliverySpeed([0, 3]);
    setFlashSaleFilter(false);
    setTrendingFilter(false);
    setOnBrandFilter(false);
    setCurrentPage(1);
    // Clear all filters and go to products page (optionally keep search query)
    router.push("/products");
  };

  const hasActiveFilters =
    selectedCategory ||
    selectedRating ||
    deliverySpeed[1] < 3 ||
    flashSaleFilter ||
    trendingFilter ||
    onBrandFilter ||
    searchQuery;

  const filteredCategories = (categories || []).filter(
    (cat: { name: string }) =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || "Recommended";

  return (
    <div className="min-h-screen bg-white">
      <ProtectedNavbar />

      <div className="flex flex-col lg:flex-row">
        {/* Mobile Filter Toggle Button */}
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="lg:hidden sticky top-0 z-10 flex items-center justify-center gap-2 px-4 py-3 bg-white border-b border-gray-200 text-sm font-medium"
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
        </button>

        {/* Left Sidebar - Filters */}
        <div
          className={`${
            mobileFiltersOpen
              ? "fixed inset-0 z-300 bg-white overflow-y-auto"
              : "hidden"
          } lg:block lg:relative lg:w-72 lg:p-6 min-h-screen`}
        >
          {/* Mobile Close Button */}
          <div className="lg:hidden sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold">Filters</h2>
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-4 lg:p-0">
            <div className="space-y-2 mb-4">
              <h1 className="text-base lg:text-lg font-bold hidden lg:block">
                Filter
              </h1>
              <div className="border-b-2 border-gray-200 border-dotted hidden lg:block" />
            </div>

            {/* Categories */}
            <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
              <div className="mb-6">
                <CollapsibleTrigger className="flex items-center justify-between mb-3 w-full">
                  <h3 className="text-sm lg:text-base font-semibold">
                    Categories
                  </h3>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      categoriesOpen ? "" : "rotate-180"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Find categories"
                      className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-xs lg:text-sm"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                    />
                    <svg
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    {categoriesLoading ? (
                      <div className="text-sm text-gray-400 py-2">
                        Loading categories...
                      </div>
                    ) : filteredCategories.length === 0 ? (
                      <div className="text-sm text-gray-400 py-2">
                        No categories found
                      </div>
                    ) : (
                      filteredCategories.map(
                        (category: {
                          id: string;
                          handle: string;
                          name: string;
                        }) => (
                          <label
                            key={category.id}
                            className="flex items-center justify-between w-full py-1 text-sm cursor-pointer hover:text-gray-900"
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedCategory === category.handle}
                                onCheckedChange={() =>
                                  handleCategoryChange(
                                    selectedCategory === category.handle
                                      ? null
                                      : category.handle
                                  )
                                }
                              />
                              <span
                                className={
                                  selectedCategory === category.handle
                                    ? "font-semibold"
                                    : "text-gray-600"
                                }
                              >
                                {category.name}
                              </span>
                            </div>
                            <span className="text-gray-400">
                              {categoryCounts[category.id] || 0}
                            </span>
                          </label>
                        )
                      )
                    )}
                  </div>
                </CollapsibleContent>
                <div className="border-b-2 border-gray-200 border-dotted py-2" />
              </div>
            </Collapsible>

            {/* Delivery Speed */}
            <Collapsible open={deliveryOpen} onOpenChange={setDeliveryOpen}>
              <div className="mb-6">
                <CollapsibleTrigger className="flex items-center justify-between mb-3 w-full">
                  <h3 className="text-sm lg:text-base font-semibold">
                    Delivery speed
                  </h3>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      deliveryOpen ? "" : "rotate-180"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-4">
                    <div className="relative">
                      <Slider
                        value={deliverySpeed}
                        onValueChange={handleDeliverySpeedChange}
                        min={0}
                        max={3}
                        step={1}
                        className="w-full"
                      />
                      <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-0.5 pointer-events-none z-0">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i <= deliverySpeed[1]
                                ? "bg-[#203C8D]"
                                : "bg-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span
                        className={
                          deliverySpeed[1] >= 0
                            ? "font-medium text-gray-900"
                            : ""
                        }
                      >
                        Today
                      </span>
                      <span
                        className={
                          deliverySpeed[1] >= 1
                            ? "font-medium text-gray-900"
                            : ""
                        }
                      >
                        Tomorrow
                      </span>
                      <span
                        className={
                          deliverySpeed[1] >= 2
                            ? "font-medium text-gray-900"
                            : ""
                        }
                      >
                        Few days
                      </span>
                      <span
                        className={
                          deliverySpeed[1] >= 3
                            ? "font-medium text-gray-900"
                            : ""
                        }
                      >
                        Anytime
                      </span>
                    </div>
                  </div>
                </CollapsibleContent>
                <div className="border-b-2 border-gray-200 border-dotted mt-6" />
              </div>
            </Collapsible>

            {/* Ratings */}
            <Collapsible open={ratingsOpen} onOpenChange={setRatingsOpen}>
              <div className="mb-6">
                <CollapsibleTrigger className="flex items-center justify-between mb-3 w-full">
                  <h3 className="text-sm lg:text-base font-semibold">
                    Ratings
                  </h3>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      ratingsOpen ? "" : "rotate-180"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <label
                        key={rating}
                        className="flex items-center justify-between w-full cursor-pointer hover:bg-gray-50 py-1 px-1 rounded"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedRating === rating}
                            onCheckedChange={() => handleRatingChange(rating)}
                          />
                          <div className="flex text-gray-900">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${
                                  i < rating
                                    ? "fill-current text-yellow-400"
                                    : "fill-gray-200"
                                }`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm">
                          {ratingCounts
                            ? ratingCounts[
                                rating as keyof typeof ratingCounts
                              ] || 0
                            : "-"}
                        </span>
                      </label>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="lg:hidden w-full py-3 bg-[#23429B] text-white rounded-lg font-medium hover:bg-[#1a3278] transition-colors mt-6 sticky bottom-4"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Right Content - Products Grid */}
        <div className="flex-1 p-4 lg:p-6">
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-4">
              <h2 className="text-2xl lg:text-3xl font-bold">
                {productsLoading
                  ? "..."
                  : totalProducts?.toLocaleString() || "0"}
              </h2>
              <span className="text-xs lg:text-sm text-gray-400">
                {searchQuery ? `Products for "${searchQuery}"` : "Products"}
                {selectedCategory &&
                  ` in ${
                    categories?.find((c: any) => c.handle === selectedCategory)
                      ?.name || selectedCategory
                  }`}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={handleFlashSaleToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  flashSaleFilter
                    ? "bg-[#C52129] text-white border-[#C52129]"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 23c-5.5 0-10-4.5-10-10 0-3.7 2.1-7.2 5.2-9L8 2h8l.8 2c3.1 1.8 5.2 5.3 5.2 9 0 5.5-4.5 10-10 10zm0-18c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm2 10.5l-4-2V8h1.5v4.7l3.5 1.8-.5 1z" />
                </svg>
                Flash sale
              </button>
              <button
                onClick={handleTrendingToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  trendingFilter
                    ? "bg-[#F59E0B] text-white border-[#F59E0B]"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                Trends
              </button>
              <button
                onClick={handleOnBrandToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                  onBrandFilter
                    ? "bg-[#23429B] text-white border-[#23429B]"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                On brand
              </button>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {selectedCategory && (
                  <Badge
                    variant="outline"
                    className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm cursor-pointer hover:bg-gray-50 bg-blue-50"
                    onClick={() => handleCategoryChange(null)}
                  >
                    {categories?.find((c: any) => c.handle === selectedCategory)
                      ?.name || selectedCategory}
                    <svg
                      className="w-3 h-3 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Badge>
                )}
                {selectedRating && (
                  <Badge
                    variant="outline"
                    className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm cursor-pointer hover:bg-gray-50 bg-yellow-50"
                    onClick={() => handleRatingChange(null)}
                  >
                    {selectedRating}+ Stars
                    <svg
                      className="w-3 h-3 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Badge>
                )}
                {deliverySpeed[1] < 3 && (
                  <Badge
                    variant="outline"
                    className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm cursor-pointer hover:bg-gray-50 bg-green-50"
                    onClick={() => handleDeliverySpeedChange([0, 3])}
                  >
                    {DELIVERY_OPTIONS[deliverySpeed[1]]?.label}
                    <svg
                      className="w-3 h-3 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </Badge>
                )}
                {searchQuery && (
                  <Badge
                    variant="outline"
                    className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm bg-gray-50"
                  >
                    Search: {searchQuery}
                  </Badge>
                )}
                {/* Clear All Filters Button - visible when any filter is active */}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full border border-red-200 font-medium transition-colors flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Clear all
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge
                      variant="outline"
                      className="px-3 lg:px-4 py-2 lg:py-2.5 text-xs lg:text-sm cursor-pointer hover:bg-gray-50 font-medium"
                    >
                      Sort by: {currentSortLabel}
                      <svg
                        className="w-4 h-4 text-gray-600 ml-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {SORT_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleSortChange(option.value)}
                        className={sortBy === option.value ? "bg-gray-100" : ""}
                      >
                        {option.label}
                        {sortBy === option.value && (
                          <svg
                            className="w-4 h-4 ml-auto"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            {productsLoading ? (
              [...Array(ITEMS_PER_PAGE)].map((_, idx) => (
                <Card
                  key={idx}
                  className="overflow-hidden border-0 shadow-none bg-white p-0"
                >
                  <div className="bg-gray-200 animate-pulse aspect-square rounded-2xl lg:rounded-3xl" />
                  <CardContent className="p-2 lg:p-4 space-y-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded" />
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-2/3" />
                  </CardContent>
                </Card>
              ))
            ) : products && products.length > 0 ? (
              products.map((product: Product) => {
                const isFavorite = isInWishlist(product.id);
                const variant = product.variants?.[0];
                const price = variant?.calculated_price?.calculated_amount || 0;

                const handleWishlistToggle = (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isFavorite) {
                    removeFromWishlist(product.id);
                    showToast("Removed from wishlist", "info");
                  } else if (variant?.id) {
                    // Only add to wishlist if variant exists
                    addToWishlist({
                      product_id: product.id,
                      title: product.title,
                      handle: product.handle || product.id,
                      thumbnail: product.thumbnail || undefined,
                      price: price,
                      original_price:
                        variant?.calculated_price?.original_amount || price,
                      currency: "RM",
                      variant_id: variant.id,
                      variant_title: variant?.title,
                    });
                    showToast("Added to wishlist", "success");
                  } else {
                    showToast("Product variant not available", "error");
                  }
                };

                return (
                  <Card
                    key={product.id}
                    className="overflow-hidden border-0 shadow-none bg-white p-0"
                  >
                    <div className="relative bg-gray-50 rounded-2xl lg:rounded-3xl">
                      {/* Heart Button - separate from Link */}
                      <button
                        className="absolute top-2 right-2 lg:top-3 lg:right-3 w-7 h-7 lg:w-8 lg:h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 z-20 shadow-sm"
                        onClick={handleWishlistToggle}
                      >
                        {isFavorite ? (
                          <svg
                            className="w-4 h-4 lg:w-5 lg:h-5 text-red-500 fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                          </svg>
                        ) : (
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
                        )}
                      </button>

                      <Link href={`/product/${product.id}`}>
                        {(() => {
                          const discount =
                            product.variants?.[0]?.metadata?.discount;
                          const discountNum = discount ? Number(discount) : 0;
                          if (discountNum > 0) {
                            return (
                              <div className="absolute top-2 left-2 lg:top-3 lg:left-3 bg-[#C52129] text-white text-[10px] lg:text-xs font-semibold px-2 lg:px-3 py-0.5 lg:py-1 rounded-full z-10">
                                {discountNum}% OFF
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <div className="absolute top-10 right-2 lg:top-12 lg:right-3 flex flex-col gap-1 z-10">
                          {product.metadata?.flash_sale && (
                            <div className="bg-[#C52129] text-white text-[8px] lg:text-[10px] font-semibold px-1.5 lg:px-2 py-0.5 rounded-full">
                              Flash Sale
                            </div>
                          )}
                          {product.metadata?.trending && (
                            <div className="bg-[#F59E0B] text-white text-[8px] lg:text-[10px] font-semibold px-1.5 lg:px-2 py-0.5 rounded-full">
                              Trending
                            </div>
                          )}
                          {product.metadata?.on_brand && (
                            <div className="bg-[#23429B] text-white text-[8px] lg:text-[10px] font-semibold px-1.5 lg:px-2 py-0.5 rounded-full">
                              On Brand
                            </div>
                          )}
                        </div>
                        <div className="aspect-square flex items-center justify-center p-4 lg:p-6 cursor-pointer">
                          <Image
                            src={
                              product.thumbnail ||
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="24"%3ENo Image%3C/text%3E%3C/svg%3E'
                            }
                            alt={product.title}
                            width={200}
                            height={200}
                            className="object-contain"
                            unoptimized={!product.thumbnail}
                          />
                        </div>
                      </Link>
                    </div>
                    <CardContent className="p-2 lg:p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 lg:mb-2 text-xs lg:text-sm line-clamp-2">
                        {product.title}
                      </h3>
                      {product.subtitle && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                          {product.subtitle}
                        </p>
                      )}
                      {/* Rating from review_stats - only show if product has real reviews */}
                      {(() => {
                        const reviewStats = (product as any).review_stats;
                        const rating = reviewStats?.average_rating || null;
                        const reviewCount = reviewStats?.total_reviews || 0;

                        if (rating && rating > 0) {
                          return (
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
                              <span className="text-[10px] lg:text-xs text-gray-600">
                                {rating.toFixed(1)} ({reviewCount}{" "}
                                {reviewCount === 1 ? "review" : "reviews"})
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-2">
                          {product.variants && product.variants.length > 0 ? (
                            (() => {
                              const variant = product.variants[0];
                              const price =
                                variant.calculated_price?.calculated_amount ||
                                0;
                              let originalPrice =
                                variant.calculated_price?.original_amount ||
                                price;
                              const metadataDiscount = variant.metadata
                                ?.discount
                                ? Number(variant.metadata.discount)
                                : 0;
                              const discountType =
                                (variant.metadata?.discount_type as string) ||
                                "percentage";

                              if (
                                metadataDiscount > 0 &&
                                originalPrice === price
                              ) {
                                if (discountType === "percentage") {
                                  originalPrice = Math.round(
                                    price / (1 - metadataDiscount / 100)
                                  );
                                } else {
                                  originalPrice =
                                    price + metadataDiscount * 100;
                                }
                              }

                              return (
                                <>
                                  <span className="text-sm lg:text-xl font-bold text-black">
                                    RM{(price / 100).toFixed(2)}
                                  </span>
                                  {originalPrice > price && (
                                    <span className="text-xs lg:text-sm text-[#C52129] line-through">
                                      RM{(originalPrice / 100).toFixed(2)}
                                    </span>
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            <span className="text-sm lg:text-base text-gray-600">
                              No variants
                            </span>
                          )}
                        </div>
                        {/* Add to cart button - available for both guests and logged-in users */}
                        {product.variants && product.variants.length > 0 && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full w-8 h-8 lg:w-10 lg:h-10"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const variant = product.variants![0];
                              const price =
                                variant.calculated_price?.calculated_amount ||
                                0;
                              addToCart(variant.id, 1)
                                .then(() => {
                                  showCartSuccess({
                                    name: product.title,
                                    price: price,
                                    image: product.thumbnail || undefined,
                                    quantity: 1,
                                  });
                                })
                                .catch((err) => {
                                  console.error("Failed to add to cart:", err);
                                  showToast("Failed to add to cart", "error");
                                });
                            }}
                          >
                            <span className="text-base lg:text-lg">+</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-2 lg:col-span-4 flex flex-col items-center justify-center py-12 lg:py-16">
                <div className="rounded-full bg-[#E9ECF5] items-center flex justify-center m-4 p-10">
                  <Image
                    src="/illustration-no-products-found.png"
                    alt="No products found"
                    width={200}
                    height={200}
                    className="mb-6"
                  />
                </div>
                <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-2">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : "No products found"}
                </h3>
                <p className="text-sm lg:text-base text-gray-500 text-center mb-6 max-w-md">
                  Try checking the spelling or using different keywords.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => (window.location.href = "/")}
                    className="px-6 py-2.5 text-white rounded-full text-sm font-medium hover:bg-[#1a3278] transition-colors cursor-pointer"
                    style={{
                      background: "linear-gradient(to right, #23429B, #C52129)",
                    }}
                  >
                    Back to home
                  </Button>
                  <Button
                    onClick={handleClearFilters}
                    className="px-6 py-2.5 text-[#23429B] border border-[#23429B] rounded-full text-sm font-medium hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    Show all products
                  </Button>
                </div>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 mt-6 lg:mt-8">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 border border-gray-200 rounded-full text-xs lg:text-sm hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="hidden lg:inline">Prev</span>
              </Button>
              <div className="flex flex-row gap-x-1 lg:gap-x-2">
                {(() => {
                  const pages: (number | string)[] = [];
                  const showPages = 5;

                  if (totalPages <= showPages) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    if (currentPage <= 3)
                      pages.push(1, 2, 3, "...", totalPages);
                    else if (currentPage >= totalPages - 2)
                      pages.push(
                        1,
                        "...",
                        totalPages - 2,
                        totalPages - 1,
                        totalPages
                      );
                    else
                      pages.push(
                        1,
                        "...",
                        currentPage - 1,
                        currentPage,
                        currentPage + 1,
                        "...",
                        totalPages
                      );
                  }

                  return pages.map((page, idx) => {
                    if (page === "...")
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 lg:px-2 text-gray-400 text-xs lg:text-sm"
                        >
                          ...
                        </span>
                      );
                    const pageNum = page as number;
                    const isActive = pageNum === currentPage;
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-full text-xs lg:text-sm ${
                          isActive
                            ? "font-medium text-white"
                            : "border border-gray-200 hover:bg-gray-50"
                        }`}
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(to bottom, #23429B, #C52129)",
                              }
                            : undefined
                        }
                      >
                        {pageNum}
                      </Button>
                    );
                  });
                })()}
              </div>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 border border-gray-200 rounded-full text-xs lg:text-sm hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="hidden lg:inline">Next</span>
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
              </Button>
            </div>
          )}
        </div>
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

export default SearchResultsContent;
