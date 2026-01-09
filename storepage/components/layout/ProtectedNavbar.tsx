"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCategories } from "@/lib/hooks";
import { useAuthContext } from "@/lib/AuthContext";

export default function ProtectedNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { customer, loading: authLoading, logout } = useAuthContext();

  const isLoggedIn = !!customer;
  const wishlistCount = 4;
  const cartCount = 2;
  
  // Get user info from customer data
  const userName = customer?.first_name || "User";
  const userFullName = customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "User" : "Guest";
  const userEmail = customer?.email || "";
  const userInitials = customer 
    ? `${customer.first_name?.charAt(0) || ''}${customer.last_name?.charAt(0) || ''}`.toUpperCase() || 'U'
    : 'U';
  const profileImage = (customer?.metadata as any)?.profile_image || null;
  const ordersCount = 4;

  const isSearchPage = pathname === "/search";

  const { categories, loading: categoriesLoading } = useCategories();

  const seafoodTrends = [
    { name: "Salmon Fillets", image: "/salmon-fillets.png" },
    { name: "Tuna Fillets", image: "/tuna-fillets.png" },
    { name: "Barramundi Fillets", image: "/barramundi-fillets.png" },
    { name: "Cod Fillets", image: "/cod-fillets.png" },
    { name: "Snapper Fillets", image: "/snapper-fillets.png" },
  ];

  const handleSearchFocus = () => {
    if (!isSearchPage) {
      router.push("/search");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (!isSearchPage && e.target.value.length > 0) {
      router.push(`/search?q=${encodeURIComponent(e.target.value)}`);
    }
  };

  const isLandingPage = pathname === "/";

  return (
    <>
      {/* Top Bar / Breadcrumbs */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 relative py-2 z-100">
        <div className="flex items-center justify-between text-xs lg:text-sm">
          <div className="flex items-center gap-3 lg:gap-6 text-gray-600">
            <>
              <a href="#" className="hover:text-gray-900 underline hidden lg:inline">
                Free shipping
              </a>
              <span className="hidden lg:inline">•</span>
              <a href="#" className="hover:text-gray-900 underline hidden lg:inline">
                Free returns
              </a>
              <span className="lg:hidden">Free shipping & returns</span>
            </>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">EN</span>
          </div>
        </div>
      </div>

      <nav className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 relative z-100">
        <div className="flex items-center justify-between gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Left side - Search */}
          <div className="hidden lg:block max-w-sm flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                placeholder="Search products"
                className="w-full pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
              </button>
            </div>
          </div>

          {/* Center - Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <Image
              src="/lb-logo.png"
              alt="LB Frozen Logo"
              width={60}
              height={60}
              priority
            />
          </Link>

          {/* Right side - Icons and User */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Search Icon - Mobile Only */}
            <button
              onClick={() => router.push("/search")}
              className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Wishlist - Only show when logged in */}
            {isLoggedIn && (
            <button className="relative text-gray-600 hover:text-gray-900 transition-colors hidden lg:block">
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
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#23429B] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>
            )}

            {/* Cart - Only show when logged in */}
            {isLoggedIn && (
            <Link
              href="/cart"
              className="relative text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5 lg:w-6 lg:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#23429B] text-white text-xs font-bold rounded-full w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center text-[10px] lg:text-xs">
                  {cartCount}
                </span>
              )}
            </Link>
            )}

            {/* User Profile / Login */}
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 lg:gap-2.5 hover:bg-gray-50 rounded-full pl-0.5 pr-2 lg:pr-3 py-0.5 transition-colors outline-none">
                    {profileImage ? (
                      <Image
                        src={profileImage}
                        alt={userName}
                        width={36}
                        height={36}
                        className="w-7 h-7 lg:w-9 lg:h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 lg:w-9 lg:h-9 bg-orange-300 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-xs lg:text-sm">{userInitials}</span>
                      </div>
                    )}
                    <span className="text-xs lg:text-sm font-medium text-gray-800 hidden md:inline">
                      {userName}
                    </span>
                    <svg
                      className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500 transition-transform hidden md:block"
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
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-0">
                  {/* User Header */}
                  <div className="px-4 py-3 border-b">
                    <div className="flex items-center gap-3">
                      {profileImage ? (
                        <Image
                          src={profileImage}
                          alt={userFullName}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover border-2 border-dashed border-gray-300"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-orange-300 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                          <span className="text-white font-semibold text-lg">
                            {userInitials}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">
                          {userFullName}
                        </span>
                        <span className="text-xs text-gray-500">{userEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      <svg
                        className="w-4 h-4 mr-2 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span>My account</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/orders")}>
                      <svg
                        className="w-4 h-4 mr-2 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                      <span className="flex-1">My orders</span>
                      <Badge
                        variant="default"
                        className="bg-[#23429B] hover:bg-[#23429B]/90 text-white ml-2"
                      >
                        {ordersCount}
                      </Badge>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/payment-method")}>
                      <svg
                        className="w-4 h-4 mr-2 shrink-0"
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
                      <span>Payment method</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/my-address")}>
                      <svg
                        className="w-4 h-4 mr-2 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>My address</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/help-support")}>
                      <svg
                        className="w-4 h-4 mr-2 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <span>Help and Support</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={async () => {
                        await logout();
                        router.push("/");
                      }}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : authLoading ? (
              // Show placeholder while loading auth state
              <div className="w-7 h-7 lg:w-9 lg:h-9 bg-gray-200 rounded-full animate-pulse" />
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 lg:gap-2.5 bg-[#23429B] hover:bg-[#1a3278] text-white rounded-full px-3 lg:px-4 py-1.5 lg:py-2 transition-colors"
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="text-xs lg:text-sm font-medium">Login</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Navigation Menu */}
      <div className="hidden md:flex justify-center bg-white">
        <div className="inline-flex items-center gap-4 lg:gap-8 px-4 lg:px-8 py-3 lg:py-4 bg-white rounded-b-2xl shadow-sm relative z-100">
          <Link
            href="/products"
            className="text-xs lg:text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            ALL PRODUCTS
          </Link>
          <button
            onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
            className="flex items-center gap-2 text-xs lg:text-sm font-medium text-gray-700 hover:text-gray-900 hover:cursor-pointer"
          >
            CATEGORIES
            <svg
              className={`w-3 h-3 lg:w-4 lg:h-4 transition-transform ${
                isCategoriesOpen ? "rotate-180" : ""
              }`}
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
          </button>
          <a
            href="#"
            className="text-xs lg:text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            FLASH SALE
          </a>
          <a
            href="#"
            className="text-xs lg:text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            TOP SALES
          </a>
          <a
            href="#"
            className="text-xs lg:text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            CONTACT US
          </a>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-200" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <Link
                href="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                ALL PRODUCTS
              </Link>
              <button
                onClick={() => {
                  setIsCategoriesOpen(!isCategoriesOpen);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                CATEGORIES
              </button>
              <a href="#" className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                FLASH SALE
              </a>
              <a href="#" className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                TOP SALES
              </a>
              <a href="#" className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                CONTACT US
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal Overlay */}
      {isCategoriesOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-90"
          onClick={() => setIsCategoriesOpen(false)}
        />
      )}

      {/* Categories Modal Content */}
      {isCategoriesOpen && (
        <div
          className="fixed left-0 right-0 z-90
           flex justify-center px-4 lg:px-6"
          style={{ top: "160px" }}
        >
          <div
            className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col lg:flex-row" style={{ height: "70vh", maxHeight: "600px" }}>
              {/* Left Sidebar - Categories */}
              <div className="w-full lg:w-64 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200 shrink-0 overflow-y-auto max-h-[30vh] lg:max-h-full">
                {categoriesLoading ? (
                  <div className="px-6 py-4 text-sm text-gray-500">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="px-6 py-4 text-sm text-gray-500">No categories available</div>
                ) : (
                  categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.handle}`}
                      onClick={() => setIsCategoriesOpen(false)}
                      className="block w-full text-left px-6 py-4 text-sm lg:text-sm text-gray-700 hover:bg-white hover:text-gray-900 transition-colors border-b border-gray-200 last:border-b-0"
                    >
                      {category.name}
                    </Link>
                  ))
                )}
              </div>

              {/* Right Content - Seafood Showcase */}
              <div className="flex-1 p-6 lg:p-12 overflow-y-auto">
                <h2 className="text-xl lg:text-2xl font-semibold mb-6 lg:mb-8">
                  Discover Seafood on Trends
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">
                  {seafoodTrends.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="bg-gray-50 rounded-xl lg:rounded-2xl mb-3 aspect-square flex items-center justify-center p-4">
                        <div className="w-full h-full relative">
                          {/* Placeholder untuk gambar seafood */}
                          <div className="absolute inset-0 bg-linear-to-br from-orange-200 to-red-300 rounded-lg lg:rounded-xl transform -rotate-12"></div>
                        </div>
                      </div>
                      <p className="text-sm lg:text-sm font-medium text-gray-700">
                        {item.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
