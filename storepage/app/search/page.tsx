"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import { useCategoriesQuery, useProductsQuery } from "@/lib/queries";

// LocalStorage key for recent searches
const RECENT_SEARCHES_KEY = "lb-frozen-recent-searches";
const MAX_RECENT_SEARCHES = 5;

// Helper functions for recent searches
function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const searches = getRecentSearches();
    // Remove if already exists, then add to front
    const filtered = searches.filter(
      (s) => s.toLowerCase() !== query.toLowerCase()
    );
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

function removeRecentSearch(query: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const searches = getRecentSearches();
    const updated = searches.filter(
      (s) => s.toLowerCase() !== query.toLowerCase()
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

function clearAllRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategoriesQuery();
  const categories = categoriesData || [];

  // Fetch some products for popular searches (random product titles)
  const { data: productsData } = useProductsQuery({ limit: 20 });
  const allProducts = productsData?.products || [];

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();

    // Add search query if provided
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
      params.set("q", searchQuery.trim());
    }

    // Add category filter if selected
    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    // Navigate to products page (with or without filters)
    const queryString = params.toString();
    router.push(`/products${queryString ? `?${queryString}` : ""}`);
  };

  const handleQuickSearch = (query: string, category?: string) => {
    addRecentSearch(query);
    setRecentSearches(getRecentSearches());
    const params = new URLSearchParams();
    params.set("q", query);
    if (category) {
      params.set("category", category);
    }
    router.push(`/products?${params.toString()}`);
  };

  const handleRemoveRecent = (query: string) => {
    const updated = removeRecentSearch(query);
    setRecentSearches(updated);
  };

  const handleClearAll = () => {
    clearAllRecentSearches();
    setRecentSearches([]);
  };

  // Get popular searches from actual product titles (pick 7 random ones)
  // This makes more sense because search filters by product title/description
  const popularSearches = allProducts
    .slice(0, 7)
    .map((product: any) => product.title)
    .filter((title: string) => title && title.length > 0);

  return (
    <div className="min-h-screen bg-white">
      <ProtectedNavbar />

      {/* Main Search Content */}
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        <h1 className="text-2xl lg:text-4xl font-bold text-center mb-8 lg:mb-12">
          Find what you want...
        </h1>

        {/* Search Bar - Unified pill style */}
        <div className="flex items-center gap-3 mb-8">
          {/* Input + Dropdown Container */}
          <div className="flex-1 flex items-center border border-gray-200 rounded-full overflow-hidden shadow-sm bg-white">
            {/* Search Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search your seafood here"
                className="w-full pl-5 lg:pl-6 pr-4 py-3 lg:py-4 text-sm lg:text-base text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
              />
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200"></div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 lg:py-4 text-sm lg:text-base text-gray-600 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="">All categories</option>
                {categoriesLoading ? (
                  <option disabled>Loading...</option>
                ) : (
                  categories.map((category: any) => (
                    <option key={category.id} value={category.handle}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
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
            </div>
          </div>

          {/* Search Button - Separate pill with gradient */}
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-5 lg:px-6 py-3 lg:py-4 text-white text-sm lg:text-base font-medium transition-opacity hover:opacity-90 rounded-full shadow-sm"
            style={{
              background: "linear-gradient(to right, #23429B, #C52129)",
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search
          </button>
        </div>

        {/* Popular Searches - from categories */}
        {popularSearches.length > 0 && (
          <div className="mb-8 lg:mb-12">
            <h2 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4">
              Popular searches
            </h2>
            <div className="flex flex-wrap gap-2 lg:gap-3">
              {popularSearches.map((search: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(search)}
                  className="px-4 lg:px-6 py-2 lg:py-2.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm lg:text-base text-gray-700 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches - from localStorage */}
        {recentSearches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <h2 className="text-lg lg:text-xl font-semibold">
                Recent searches
              </h2>
              <button
                onClick={handleClearAll}
                className="text-xs lg:text-sm text-red-400 hover:text-red-700"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-2 lg:space-y-3">
              {recentSearches.map((search, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 lg:py-3 border-b border-gray-200"
                >
                  <button
                    onClick={() => handleQuickSearch(search)}
                    className="flex items-center gap-2 lg:gap-3 flex-1 text-left hover:text-gray-900"
                  >
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm lg:text-base text-gray-700">
                      {search}
                    </span>
                  </button>
                  <button
                    onClick={() => handleRemoveRecent(search)}
                    className="text-gray-400 hover:text-gray-600"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no recent searches */}
        {recentSearches.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-sm lg:text-base">No recent searches yet</p>
            <p className="text-xs lg:text-sm mt-1">
              Start searching for your favorite seafood!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <ProtectedNavbar />
          <div className="max-w-4xl mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold text-center mb-12">
              Find what you want...
            </h1>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
