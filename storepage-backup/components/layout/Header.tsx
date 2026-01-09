"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Logo from "@/public/logo.svg";
import { useCart } from "@/lib/context/CartContext";
import {
  Banner,
  getBanners,
  HeroContent,
  searchProductsClient,
} from "@/lib/api/medusa";
import { medusaProductsToProducts, type Product } from "@/lib/api/adapter";
import { TopBanner } from "../home/TopBanner";

function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

export const Header = (): React.JSX.Element => {
  const { itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  // Fetch search results when debounced query changes
  const performSearch = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const medusaProducts = await searchProductsClient(query, 4);
      const products = medusaProductsToProducts(medusaProducts);
      setSearchResults(products);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const [banners, setBanners] = useState<HeroContent[]>([]);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    (async () => {
      const [bannersResponse] = await Promise.all([getBanners()]);
      setBanners(bannersResponse);
    })();
  }, []);

  // Close search on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    };

    if (isSearchOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Handle search - you can redirect to search results page
      window.location.href = `/search?q=${encodeURIComponent(
        searchQuery.trim()
      )}`;
    }
  };

  const closeSearch = (): void => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <>
      <TopBanner contents={banners} />
      <header
        className={`fixed z-50 w-full border-b border-[#E3E3E3] bg-white ${
          banners?.length > 0 ? "top-6" : "top-0"
        }`}
      >
        <div className="mx-auto flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          {/* Hamburger Menu Button - Mobile Only */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center justify-center text-black sm:hidden"
            aria-label="Open menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Left Navigation - Desktop Only (empty placeholder for layout balance) */}
          <div className="hidden sm:block sm:w-[200px] lg:w-[250px]" />

          {/* Center Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <Image
              src={Logo}
              alt="KINGJESS"
              className="h-6 w-auto sm:h-8"
              priority
            />
          </Link>

          {/* Right Navigation - Desktop Only */}
          <nav className="hidden items-center gap-6 sm:flex lg:gap-8">
            <Link
              href="/products"
              className="text-base font-medium text-black hover:opacity-70"
            >
              Shop
            </Link>
            <Link
              href="/account"
              className="text-base font-medium text-black hover:opacity-70"
            >
              Account
            </Link>
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`text-base cursor-pointer font-medium text-black hover:opacity-70 ${
                isSearchOpen ? "underline underline-offset-4" : ""
              }`}
            >
              Search
            </button>
            <Link
              href="/bag"
              className="text-base font-medium text-black hover:opacity-70"
            >
              Bag ({itemCount})
            </Link>
          </nav>

          {/* Mobile Menu Icons */}
          <div className="flex items-center gap-4 sm:hidden">
            <Link
              href="/account"
              className="text-xs font-medium text-black hover:opacity-70"
            >
              Account
            </Link>
          </div>
        </div>

        {/* Search Overlay - Slides down from header */}
        <div
          className={`overflow-hidden border-t border-[#E3E3E3] bg-white transition-all duration-300 ease-in-out ${
            isSearchOpen
              ? searchQuery.trim() && searchResults.length > 0
                ? "max-h-[100vh] opacity-100"
                : searchQuery.trim() &&
                  searchResults.length === 0 &&
                  !isSearching
                ? "max-h-40 opacity-100"
                : "max-h-20 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-xl">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  id="search"
                  name="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full border-0 border-b border-black bg-transparent pb-2 text-base text-black placeholder:text-black/60 focus:border-black focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  className="absolute cursor-pointer right-0 top-0 p-1 text-black/60 transition-colors hover:text-black"
                  aria-label="Close search"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </form>
            </div>

            {/* Search Results */}
            {searchQuery.trim() && (
              <div className="mt-4">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {/* Product Grid */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
                      {searchResults.slice(0, 4).map((product) => (
                        <Link
                          key={product.id}
                          href={`/products/${product.handle || product.id}`}
                          onClick={closeSearch}
                          className="group"
                        >
                          {/* Product Image */}
                          <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F5F5]">
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Badge */}
                            {product.badge && (
                              <span className="absolute right-3 top-3 rounded-full bg-[#C84B4B] px-3 py-1 text-xs font-medium text-white">
                                {product.badge}
                              </span>
                            )}
                            {product.discount && !product.badge && (
                              <span className="absolute right-3 top-3 rounded-full bg-[#E01715] px-3 py-1 text-xs font-medium text-white">
                                {product.discount}
                              </span>
                            )}
                          </div>
                          {/* Product Info */}
                          <div className="mt-3 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-black">
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              {product.originalPrice && (
                                <span className="text-sm text-black/50 line-through">
                                  ${product.originalPrice.toFixed(2)}
                                </span>
                              )}
                              <span className="text-sm font-medium text-black">
                                ${product.price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* View All Button */}
                    <div className="mt-6 flex justify-center pb-2">
                      <Link
                        href={`/search?q=${encodeURIComponent(
                          searchQuery.trim()
                        )}`}
                        onClick={closeSearch}
                        className="rounded-full border border-black bg-white px-8 py-3 text-sm font-medium text-black transition-colors hover:bg-black hover:text-white"
                      >
                        View all
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-center text-sm text-black/60">
                    No products found for &quot;{searchQuery}&quot;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Backdrop - Click to close */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[45] bg-black/10"
          onClick={closeSearch}
        />
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/5 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Slide-in */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 transform bg-white px-8 py-6 transition-transform duration-300 sm:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute right-4 top-4 text-2xl text-black"
          aria-label="Close menu"
        >
          ×
        </button>

        {/* Mobile Navigation Links */}
        <nav className="mt-12 flex flex-col gap-6">
          <Link
            href="/products"
            className="text-base font-medium text-black hover:opacity-70"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Shop
          </Link>
          <Link
            href="/account"
            className="text-base font-medium text-black hover:opacity-70"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Account
          </Link>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsSearchOpen(true);
            }}
            className="text-left text-base font-medium text-black hover:opacity-70"
          >
            Search
          </button>
          <Link
            href="/bag"
            className="text-base font-medium text-black hover:opacity-70"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Bag ({itemCount})
          </Link>
        </nav>
      </aside>
    </>
  );
};
