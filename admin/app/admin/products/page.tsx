"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useProducts, useDeleteProduct, useUpdateProductStatus, useDuplicateProduct, useCategories, useInventoryQuantities, useProductSales } from "@/lib/api/queries";
import { useQueryClient } from "@tanstack/react-query";
import { mapMedusaProductsToAdmin } from "@/lib/utils/product-mapper";
import { CSVImportModal } from "@/components/admin/products";
import type { AdminProduct, ProductSortOption } from "@/lib/types/product";

// Product type definition (matches AdminProduct from types)
type Product = AdminProduct;

// Sort option type (uses server-side sorting - sold options removed as not supported)
type SortOption = ProductSortOption;

export default function ProductsPage(): React.JSX.Element {
  // State management
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState<boolean>(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(8);
  const [isRowsDropdownOpen, setIsRowsDropdownOpen] = useState<boolean>(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  // Modal state for duplicate confirmation
  const [duplicateModal, setDuplicateModal] = useState<{ isOpen: boolean; productId: string | null; productName: string }>({
    isOpen: false,
    productId: null,
    productName: "",
  });

  // Modal state for delete confirmation
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; productId: string | null; productName: string }>({
    isOpen: false,
    productId: null,
    productName: "",
  });

  // Toast notification state
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: "success" | "error" }>({
    isVisible: false,
    message: "",
    type: "error",
  });

  // CSV Import modal state
  const [isCSVImportModalOpen, setIsCSVImportModalOpen] = useState(false);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.isVisible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, isVisible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.isVisible]);

  // API Integration - Fetch products from Medusa backend with server-side sorting
  const { data: productsResponse, isLoading, isError, error } = useProducts({
    q: debouncedSearch,
    limit: rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
    status: selectedStatuses.length > 0
      ? selectedStatuses.map(s => s === "active" ? "published" : "draft") as ("published" | "draft")[]
      : undefined,
    category_id: selectedCategories.length > 0 ? selectedCategories : undefined,
    sort_by: sortBy,
  });

  // API Integration - Fetch categories separately
  const { data: categoriesResponse } = useCategories();

  // API Integration - Fetch inventory quantities for all products
  const { data: inventoryMap } = useInventoryQuantities();

  // API Integration - Fetch product sales data (quantity sold per product)
  const { data: salesMap } = useProductSales();

  // Query client for cache invalidation (used by CSV import)
  const queryClient = useQueryClient();

  // Mutations
  const deleteProductMutation = useDeleteProduct();
  const updateStatusMutation = useUpdateProductStatus();
  const duplicateProductMutation = useDuplicateProduct();

  // Transform Medusa products to Admin UI format
  const productsData = useMemo(() => {
    if (!productsResponse?.products) return [];
    return mapMedusaProductsToAdmin(productsResponse.products, inventoryMap, salesMap);
  }, [productsResponse, inventoryMap, salesMap]);

  // Local state for debounced toggle - tracks products being toggled
  const [localProductStates, setLocalProductStates] = useState<Record<string, boolean>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  // Get effective product state (local override or server state)
  const getProductState = (productId: string, serverActive: boolean): boolean => {
    return localProductStates[productId] ?? serverActive;
  };

  // Refs for dropdowns
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const categoryFilterRef = useRef<HTMLDivElement>(null);
  const priceFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const storeFilterRef = useRef<HTMLDivElement>(null);
  const rowsDropdownRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(event.target as Node)) {
        if (openFilterDropdown === "category") setOpenFilterDropdown(null);
      }
      if (priceFilterRef.current && !priceFilterRef.current.contains(event.target as Node)) {
        if (openFilterDropdown === "price") setOpenFilterDropdown(null);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        if (openFilterDropdown === "status") setOpenFilterDropdown(null);
      }
      if (storeFilterRef.current && !storeFilterRef.current.contains(event.target as Node)) {
        if (openFilterDropdown === "store") setOpenFilterDropdown(null);
      }
      if (rowsDropdownRef.current && !rowsDropdownRef.current.contains(event.target as Node)) {
        setIsRowsDropdownOpen(false);
      }
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openFilterDropdown]);

  // Get all categories from separate API call (not from current page products)
  const allCategories = useMemo(() => {
    if (!categoriesResponse?.product_categories) return [];
    return categoriesResponse.product_categories
      .filter((cat) => cat.is_active) // Only show active categories
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        handle: cat.handle,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoriesResponse]);

  // Parse price to number for filtering
  const parsePrice = (price: string): number => {
    return parseFloat(price.replace("$", "").trim());
  };

  // Client-side filtering only (sorting is now handled server-side)
  const filteredProducts = useMemo(() => {
    let filtered = [...productsData];

    // Apply price range filter (client-side only - Medusa doesn't support this)
    if (selectedPriceRange) {
      filtered = filtered.filter((product) => {
        const price = parsePrice(product.price);
        switch (selectedPriceRange) {
          case "$0-$50":
            return price >= 0 && price <= 50;
          case "$51-$100":
            return price >= 51 && price <= 100;
          case "$101-$250":
            return price >= 101 && price <= 250;
          case "$251-$500":
            return price >= 251 && price <= 500;
          case "$500+":
            return price > 500;
          default:
            return true;
        }
      });
    }

    // Sorting is now handled server-side via sort_by parameter
    return filtered;
  }, [productsData, selectedPriceRange]);

  // Pagination - use server-side count
  const totalCount = productsResponse?.count ?? 0;
  const totalPages = Math.ceil(totalCount / rowsPerPage);

  // For display purposes (already paginated by server, sorted server-side)
  const paginatedProducts = filteredProducts;

  // Toggle product active status with debounce
  const toggleProductActive = (productId: string): void => {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    // Get current local state (or server state if no local override)
    const currentLocal = getProductState(productId, product.active);
    const newLocal = !currentLocal;

    // Update local state immediately (instant UI feedback)
    setLocalProductStates(prev => ({
      ...prev,
      [productId]: newLocal,
    }));

    // Clear existing debounce timer for this product
    if (debounceTimers.current[productId]) {
      clearTimeout(debounceTimers.current[productId]);
    }

    // Set new debounce timer (500ms)
    debounceTimers.current[productId] = setTimeout(() => {
      // Compare final local state with server state
      const serverState = product.active;

      // Only send API request if state actually changed
      if (newLocal !== serverState) {
        const newStatus = newLocal ? "published" : "draft";

        // Clear local state immediately - cache will be updated optimistically
        setLocalProductStates(prev => {
          const updated = { ...prev };
          delete updated[productId];
          return updated;
        });

        updateStatusMutation.mutate(
          { id: productId, status: newStatus },
          {
            onError: (error) => {
              console.error("Failed to update product status:", error);
              setToast({
                isVisible: true,
                message: "Failed to update product status. Please try again.",
                type: "error",
              });

              // Revert to opposite state on error (undo the optimistic update)
              setLocalProductStates(prev => ({
                ...prev,
                [productId]: serverState,
              }));

              // Clear the error state after a brief delay
              setTimeout(() => {
                setLocalProductStates(prev => {
                  const updated = { ...prev };
                  delete updated[productId];
                  return updated;
                });
              }, 100);
            },
          }
        );
      } else {
        // State didn't change from server - just clean up local state
        setLocalProductStates(prev => {
          const updated = { ...prev };
          delete updated[productId];
          return updated;
        });
      }

      // Clean up timer reference
      delete debounceTimers.current[productId];
    }, 500); // 500ms debounce delay
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      setSelectedProducts(paginatedProducts.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Handle individual checkbox
  const handleSelectProduct = (productId: string, checked: boolean): void => {
    if (checked) {
      setSelectedProducts((prev) => [...prev, productId]);
    } else {
      setSelectedProducts((prev) => prev.filter((id) => id !== productId));
    }
  };

  // Check if all visible products are selected
  const isAllSelected = paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedProducts.includes(p.id));

  // Handle category filter toggle
  const toggleCategory = (category: string): void => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
    setCurrentPage(1);
  };

  // Handle status filter toggle
  const toggleStatus = (status: string): void => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = (): void => {
    setSelectedCategories([]);
    setSelectedPriceRange("");
    setSelectedStatuses([]);
    setSelectedStore("");
    setCurrentPage(1);
  };

  // Handle delete product - opens confirmation modal
  const handleDeleteProduct = (productId: string): void => {
    const product = paginatedProducts.find(p => p.id === productId);
    setDeleteModal({
      isOpen: true,
      productId,
      productName: product?.name || "this product",
    });
  };

  // Confirm delete product
  const confirmDeleteProduct = (): void => {
    if (deleteModal.productId) {
      deleteProductMutation.mutate(deleteModal.productId, {
        onSuccess: () => {
          // Remove from selected products
          setSelectedProducts((prev) => prev.filter((id) => id !== deleteModal.productId));
          setDeleteModal({ isOpen: false, productId: null, productName: "" });
          setToast({
            isVisible: true,
            message: "Product deleted successfully.",
            type: "success",
          });
        },
        onError: (error) => {
          console.error("Failed to delete product:", error);
          setToast({
            isVisible: true,
            message: "Failed to delete product. Please try again.",
            type: "error",
          });
        },
      });
    }
  };

  // Handle sort change - reset to page 1 when sort changes
  const handleSortChange = (newSort: SortOption): void => {
    setSortBy(newSort);
    setCurrentPage(1);
    setIsSortDropdownOpen(false);
  };

  // Get sort label
  const getSortLabel = (): string => {
    switch (sortBy) {
      case "name-asc":
        return "Name (A-Z)";
      case "name-desc":
        return "Name (Z-A)";
      case "price-asc":
        return "Price (Low to High)";
      case "price-desc":
        return "Price (High to Low)";
      case "stock-asc":
        return "Stock (Low to High)";
      case "stock-desc":
        return "Stock (High to Low)";
      case "created-asc":
        return "Oldest First";
      case "created-desc":
        return "Newest First";
      default:
        return "Sort by";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="px-4 md:px-8">
        <div className="mb-6">
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712] mb-6">
            Products
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
            <p className="mt-4 text-[14px] text-[#6A7282]">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="px-4 md:px-8">
        <div className="mb-6">
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712] mb-6">
            Products
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-[16px] font-medium text-[#030712]">Failed to load products</h3>
            <p className="mt-2 text-[14px] text-[#6A7282]">
              {error?.message || "An error occurred while fetching products."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - only show when database is truly empty (no filters applied)
  const hasNoFiltersApplied = !debouncedSearch && selectedCategories.length === 0 && !selectedPriceRange && selectedStatuses.length === 0;
  const isDatabaseEmpty = !productsData || productsData.length === 0;

  if (isDatabaseEmpty && hasNoFiltersApplied) {
    return (
      <div className="px-4 md:px-8">
        <div className="mb-6">
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712] mb-6">
            Products
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <svg className="mx-auto h-12 w-12 text-[#99A1AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-4 text-[16px] font-medium text-[#030712]">No products found</h3>
            <p className="mt-2 text-[14px] text-[#6A7282]">
              Get started by adding your first product.
            </p>
            <button
              onClick={() => window.location.href = "/admin/products/add-product"}
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Add Product
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712] mb-6">
          Products
        </h1>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search and View Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Search data"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-[280px] px-4 py-2 pl-10 rounded-lg border border-[#E5E5E5] font-public text-[14px] font-medium tracking-[-0.14px] outline-none focus:border-black transition-colors placeholder:text-[#99A1AF]"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="7.37593" cy="7.37495" r="4.70796" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.3376 13.3385L10.7031 10.7041" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>

            {/* View Toggle Buttons */}
            <div className="flex items-center gap-2 bg-[#F9FAFB] p-1 rounded-lg border border-[#E5E7EB]">
              {/* Grid View Button */}
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded cursor-pointer transition-colors border ${
                  viewMode === "grid"
                    ? "bg-white border-[#E5E7EB] shadow-sm"
                    : "border-transparent hover:bg-white hover:border-[#99A1AF]"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.16667 6.5H3.33333C2.59667 6.5 2 5.90333 2 5.16667V3.33333C2 2.59667 2.59667 2 3.33333 2H5.16667C5.90333 2 6.5 2.59667 6.5 3.33333V5.16667C6.5 5.90333 5.90333 6.5 5.16667 6.5Z" stroke={viewMode === "grid" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12.6667 6.5H10.8333C10.0967 6.5 9.5 5.90333 9.5 5.16667V3.33333C9.5 2.59667 10.0967 2 10.8333 2H12.6667C13.4033 2 14 2.59667 14 3.33333V5.16667C14 5.90333 13.4033 6.5 12.6667 6.5Z" stroke={viewMode === "grid" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.16667 14H3.33333C2.59667 14 2 13.4033 2 12.6667V10.8333C2 10.0967 2.59667 9.5 3.33333 9.5H5.16667C5.90333 9.5 6.5 10.0967 6.5 10.8333V12.6667C6.5 13.4033 5.90333 14 5.16667 14Z" stroke={viewMode === "grid" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12.6667 14H10.8333C10.0967 14 9.5 13.4033 9.5 12.6667V10.8333C9.5 10.0967 10.0967 9.5 10.8333 9.5H12.6667C13.4033 9.5 14 10.0967 14 10.8333V12.6667C14 13.4033 13.4033 14 12.6667 14Z" stroke={viewMode === "grid" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {/* List View Button */}
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded cursor-pointer transition-colors border ${
                  viewMode === "list"
                    ? "bg-white border-[#E5E7EB] shadow-sm"
                    : "border-transparent hover:bg-white hover:border-[#99A1AF]"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6.00195 4.2949H13.3383" stroke={viewMode === "list" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.3383 8.00339H6.00195" stroke={viewMode === "list" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.00195 11.7124H13.3383" stroke={viewMode === "list" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.00046 3.96143C2.81629 3.96143 2.66699 4.11073 2.66699 4.2949C2.66699 4.47907 2.81629 4.62837 3.00046 4.62837C3.18464 4.62837 3.33394 4.47907 3.33394 4.2949C3.33394 4.11073 3.18464 3.96143 3.00046 3.96143" stroke={viewMode === "list" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.00046 7.66992C2.81629 7.66992 2.66699 7.81922 2.66699 8.00339C2.66699 8.18757 2.81629 8.33687 3.00046 8.33687C3.18464 8.33687 3.33394 8.18757 3.33394 8.00339C3.33394 7.81922 3.18464 7.66992 3.00046 7.66992" stroke={viewMode === "list" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.00046 11.3789C2.81629 11.3789 2.66699 11.5282 2.66699 11.7124C2.66699 11.8965 2.81629 12.0459 3.00046 12.0459C3.18464 12.0459 3.33394 11.8965 3.33394 11.7124C3.33394 11.5282 3.18464 11.3789 3.00046 11.3789" stroke={viewMode === "list" ? "#030712" : "#99A1AF"} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Sort By */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="flex items-center justify-between sm:justify-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] bg-white font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors w-full sm:w-auto"
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10.9297 9.66602H13.737L10.9297 12.9993H13.737" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.0013 6.33333L12.3346 3L10.668 6.33333" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.9453 5.77474H13.72" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 13.0003H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 9.66732H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 6.33333H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 3.00033H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{getSortLabel()}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform ${isSortDropdownOpen ? "rotate-180" : ""}`}>
                  <path d="M4 6L8 10L12 6" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Sort Dropdown */}
              {isSortDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-[220px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleSortChange("name-asc")}
                      className="w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      Name (A-Z)
                    </button>
                    <button
                      onClick={() => handleSortChange("name-desc")}
                      className="w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      Name (Z-A)
                    </button>
                    <button
                      onClick={() => handleSortChange("price-asc")}
                      className="w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      Price (Low to High)
                    </button>
                    <button
                      onClick={() => handleSortChange("price-desc")}
                      className="w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      Price (High to Low)
                    </button>
                    <button
                      onClick={() => handleSortChange("stock-asc")}
                      className="w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      Stock (Low to High)
                    </button>
                    <button
                      onClick={() => handleSortChange("stock-desc")}
                      className="w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      Stock (High to Low)
                    </button>
                    <button
                      onClick={() => handleSortChange("created-desc")}
                      className="w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      Newest First
                    </button>
                    <button
                      onClick={() => handleSortChange("created-asc")}
                      className="w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      Oldest First
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filter */}
            <button
              onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border font-geist text-[14px] font-medium tracking-[-0.14px] cursor-pointer transition-colors w-full sm:w-auto ${
                isFilterBarOpen
                  ? "border-[#030712] bg-[#030712] text-white"
                  : "border-[#E5E5E5] bg-white text-[#030712] hover:bg-[#F9FAFB]"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 3.33333H14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 3.33333H9.33333" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.66602 8.00033H13.9993" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 8.00033H4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12.6663H14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12.6663H9.33333" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.6082 2.39052C12.1289 2.91122 12.1289 3.75544 11.6082 4.27614C11.0875 4.79684 10.2433 4.79684 9.72256 4.27614C9.20186 3.75545 9.20186 2.91122 9.72256 2.39052C10.2433 1.86983 11.0875 1.86983 11.6082 2.39052" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.27614 7.05752C6.79684 7.57822 6.79684 8.42244 6.27614 8.94314C5.75545 9.46384 4.91122 9.46384 4.39052 8.94314C3.86983 8.42244 3.86983 7.57822 4.39052 7.05752C4.91122 6.53682 5.75544 6.53682 6.27614 7.05752" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.6082 11.7235C12.1289 12.2442 12.1289 13.0885 11.6082 13.6092C11.0875 14.1299 10.2433 14.1299 9.72256 13.6092C9.20186 13.0885 9.20186 12.2442 9.72256 11.7235C10.2433 11.2028 11.0875 11.2028 11.6082 11.7235" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Filter</span>
            </button>

            {/* Import CSV */}
            <button
              onClick={() => setIsCSVImportModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] bg-white font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M7.99935 11.3333V2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.3327 13.9998H2.66602" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.3333 8L7.99935 11.334L4.66602 8" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Import data CSV</span>
            </button>

            {/* Add New Product */}
            <a href="/admin/products/add-product" className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-black text-white font-geist text-[14px] font-medium tracking-[-0.14px] cursor-pointer hover:bg-[#333] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.33333V12.6667" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.33398 8H12.6673" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Add new product</span>
            </a>
          </div>
        </div>

        {/* Inline Filter Bar */}
        {isFilterBarOpen && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="relative" ref={categoryFilterRef}>
              <button
                onClick={() => setOpenFilterDropdown(openFilterDropdown === "category" ? null : "category")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] bg-white font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.16667 6.5H3.33333C2.59667 6.5 2 5.90333 2 5.16667V3.33333C2 2.59667 2.59667 2 3.33333 2H5.16667C5.90333 2 6.5 2.59667 6.5 3.33333V5.16667C6.5 5.90333 5.90333 6.5 5.16667 6.5Z" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12.6667 6.5H10.8333C10.0967 6.5 9.5 5.90333 9.5 5.16667V3.33333C9.5 2.59667 10.0967 2 10.8333 2H12.6667C13.4033 2 14 2.59667 14 3.33333V5.16667C14 5.90333 13.4033 6.5 12.6667 6.5Z" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.16667 14H3.33333C2.59667 14 2 13.4033 2 12.6667V10.8333C2 10.0967 2.59667 9.5 3.33333 9.5H5.16667C5.90333 9.5 6.5 10.0967 6.5 10.8333V12.6667C6.5 13.4033 5.90333 14 5.16667 14Z" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12.6667 14H10.8333C10.0967 14 9.5 13.4033 9.5 12.6667V10.8333C9.5 10.0967 10.0967 9.5 10.8333 9.5H12.6667C13.4033 9.5 14 10.0967 14 10.8333V12.6667C14 13.4033 13.4033 14 12.6667 14Z" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>
                  {selectedCategories.length > 0
                    ? allCategories
                        .filter(cat => selectedCategories.includes(cat.id))
                        .map(cat => cat.name)
                        .join(", ")
                    : "All Categories"}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform ${openFilterDropdown === "category" ? "rotate-180" : ""}`}>
                  <path d="M4 6L8 10L12 6" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Category Dropdown */}
              {openFilterDropdown === "category" && (
                <div className="absolute top-full left-0 mt-2 w-[200px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    {allCategories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#F9FAFB] rounded">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="w-4 h-4 rounded border-[#E5E5E5] cursor-pointer"
                        />
                        <span className="font-public text-[14px] text-[#030712]">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Price Filter */}
            <div className="relative" ref={priceFilterRef}>
              <button
                onClick={() => setOpenFilterDropdown(openFilterDropdown === "price" ? null : "price")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] bg-white font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3.33359 10.6666H4.66693" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M11.3336 5.33333H12.667" stroke="#030712" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M13.3336 12.6666H2.66693C1.93026 12.6666 1.33359 12.0698 1.33359 11.3332V4.66659C1.33359 3.92992 1.93026 3.33325 2.66693 3.33325H13.3336C14.0703 3.33325 14.667 3.92992 14.667 4.66659V11.3332C14.667 12.0698 14.0703 12.6666 13.3336 12.6666Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.17879 6.82136C10.0297 7.67223 10.0297 9.0475 9.17879 9.89837C8.32791 10.7492 6.95264 10.7492 6.10177 9.89837C5.2509 9.0475 5.2509 7.67223 6.10177 6.82136C6.95264 5.97048 8.32791 5.97048 9.17879 6.82136" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{selectedPriceRange || "$0-$250"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform ${openFilterDropdown === "price" ? "rotate-180" : ""}`}>
                  <path d="M4 6L8 10L12 6" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Price Dropdown */}
              {openFilterDropdown === "price" && (
                <div className="absolute top-full left-0 mt-2 w-[180px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSelectedPriceRange("");
                        setOpenFilterDropdown(null);
                        setCurrentPage(1);
                      }}
                      className={`w-full px-3 py-2 text-left font-public text-[14px] cursor-pointer hover:bg-[#F9FAFB] rounded transition-colors ${
                        !selectedPriceRange ? "bg-[#F9FAFB] text-[#030712] font-medium" : "text-[#030712]"
                      }`}
                    >
                      None
                    </button>
                    {["$0-$50", "$51-$100", "$101-$250", "$251-$500", "$500+"].map((range) => (
                      <button
                        key={range}
                        onClick={() => {
                          setSelectedPriceRange(range);
                          setOpenFilterDropdown(null);
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-left font-public text-[14px] cursor-pointer hover:bg-[#F9FAFB] rounded transition-colors ${
                          selectedPriceRange === range ? "bg-[#F9FAFB] text-[#030712] font-medium" : "text-[#030712]"
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative" ref={statusFilterRef}>
              <button
                onClick={() => setOpenFilterDropdown(openFilterDropdown === "status" ? null : "status")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] bg-white font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 8L8 4.66667" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 11.3333C8.36819 11.3333 8.66667 11.0349 8.66667 10.6667C8.66667 10.2985 8.36819 10 8 10C7.63181 10 7.33333 10.2985 7.33333 10.6667C7.33333 11.0349 7.63181 11.3333 8 11.3333Z" fill="#030712"/>
                </svg>
                <span>{selectedStatuses.length > 0 ? selectedStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ") : "Active"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform ${openFilterDropdown === "status" ? "rotate-180" : ""}`}>
                  <path d="M4 6L8 10L12 6" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Status Dropdown */}
              {openFilterDropdown === "status" && (
                <div className="absolute top-full left-0 mt-2 w-[160px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#F9FAFB] rounded">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes("active")}
                        onChange={() => toggleStatus("active")}
                        className="w-4 h-4 rounded border-[#E5E5E5] cursor-pointer"
                      />
                      <span className="font-public text-[14px] text-[#030712]">Active</span>
                    </label>
                    <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#F9FAFB] rounded">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes("inactive")}
                        onChange={() => toggleStatus("inactive")}
                        className="w-4 h-4 rounded border-[#E5E5E5] cursor-pointer"
                      />
                      <span className="font-public text-[14px] text-[#030712]">Inactive</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Store Filter */}
            <div className="relative" ref={storeFilterRef}>
              <button
                onClick={() => setOpenFilterDropdown(openFilterDropdown === "store" ? null : "store")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] bg-white font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2.66602 6.00033V12.667C2.66602 13.0206 2.80649 13.3597 3.05654 13.6098C3.30659 13.8598 3.64573 14.0003 3.99935 14.0003H11.9993C12.353 14.0003 12.6921 13.8598 12.9422 13.6098C13.1922 13.3597 13.3327 13.0206 13.3327 12.667V6.00033" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.6673 3.33301H1.33398L3.33398 6.66634H12.6673L14.6673 3.33301Z" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.66602 9.33301H9.33268" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{selectedStore || "Chan Store"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M7.99935 10.6667C9.47211 10.6667 10.666 9.47284 10.666 8.00008C10.666 6.52732 9.47211 5.33341 7.99935 5.33341C6.52659 5.33341 5.33268 6.52732 5.33268 8.00008C5.33268 9.47284 6.52659 10.6667 7.99935 10.6667Z" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 2V2.66667" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.28662 3.28662L3.75329 3.75329" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 8H2.66667" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.28662 12.7134L3.75329 12.2467" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 13.333V13.9997" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12.7134 12.7134L12.2467 12.2467" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.333 8H13.9997" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12.7134 3.28662L12.2467 3.75329" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Store Dropdown */}
              {openFilterDropdown === "store" && (
                <div className="absolute top-full left-0 mt-2 w-[180px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    {["Chan Store", "Main Store", "Online Store", "Warehouse"].map((store) => (
                      <button
                        key={store}
                        onClick={() => {
                          setSelectedStore(store);
                          setOpenFilterDropdown(null);
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-left font-public text-[14px] cursor-pointer hover:bg-[#F9FAFB] rounded transition-colors ${
                          selectedStore === store ? "bg-[#F9FAFB] text-[#030712] font-medium" : "text-[#030712]"
                        }`}
                      >
                        {store}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Products Table or Grid */}
      {viewMode === "list" ? (
        <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="text-left py-3 pl-6 pr-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E5E5E5] cursor-pointer"
                  />
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors"
                    onClick={() => handleSortChange(sortBy === "name-asc" ? "name-desc" : "name-asc")}
                  >
                    <span>Product Info</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`transition-transform ${(sortBy === "name-asc" || sortBy === "name-desc") ? "text-[#030712]" : ""} ${sortBy === "name-desc" ? "rotate-180" : ""}`}
                    >
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors"
                    onClick={() => handleSortChange(sortBy === "price-asc" ? "price-desc" : "price-asc")}
                  >
                    <span>Price</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`transition-transform ${(sortBy === "price-asc" || sortBy === "price-desc") ? "text-[#030712]" : ""} ${sortBy === "price-desc" ? "rotate-180" : ""}`}
                    >
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div className="flex items-center gap-2">
                    <span>Sold</span>
                  </div>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors"
                    onClick={() => handleSortChange(sortBy === "stock-asc" ? "stock-desc" : "stock-asc")}
                  >
                    <span>Stock</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`transition-transform ${(sortBy === "stock-asc" || sortBy === "stock-desc") ? "text-[#030712]" : ""} ${sortBy === "stock-desc" ? "rotate-180" : ""}`}
                    >
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div className="flex items-center gap-2">
                    <span>Category</span>
                  </div>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div className="flex items-center gap-2">
                    <span>Active</span>
                  </div>
                </th>
                <th className="text-left py-3 pl-3 pr-6 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="h-12 w-12 text-[#99A1AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <div>
                        <p className="font-public text-[14px] font-medium text-[#030712]">No products match your current filters</p>
                        <p className="font-public text-[13px] text-[#6A7282] mt-1">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                      <button
                        onClick={clearFilters}
                        className="mt-2 px-4 py-2 text-[14px] font-medium text-black border border-[#E5E5E5] rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const isSelected = selectedProducts.includes(product.id);

                  return (
                    <tr key={product.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-4 pl-6 pr-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                          className="w-4 h-4 rounded border-[#E5E5E5] cursor-pointer"
                        />
                      </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-[#F5F5F5] flex items-center justify-center shrink-0 overflow-hidden">
                          {product.image && product.image !== "/placeholder-product.png" ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[20px]">📦</span>
                          )}
                        </div>
                        <div>
                          <p className="font-public text-[14px] font-medium text-[#030712]">
                            {product.name}
                          </p>
                          <p className="font-public text-[12px] text-[#6A7282]">
                            ID: {product.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 font-public text-[14px] font-medium text-[#030712]">
                      {product.price}
                    </td>
                    <td className="py-4 px-3 font-public text-[14px] font-medium text-[#030712]">
                      {product.sold}
                    </td>
                    <td className="py-4 px-3">
                      <span className="font-public text-[14px] font-medium text-[#030712]">
                        {product.stock.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-3 font-public text-[14px] text-[#030712]">
                      {product.category}
                    </td>
                    <td className="py-4 px-3">
                      {(() => {
                        const isActive = getProductState(product.id, product.active);
                        const isPending = localProductStates[product.id] !== undefined;
                        return (
                          <button
                            onClick={() => toggleProductActive(product.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                              isActive ? "bg-[#2563EB]" : "bg-[#E5E7EB]"
                            } ${isPending ? "opacity-75" : ""}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                isActive ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        );
                      })()}
                    </td>
                    <td className="py-4 pl-3 pr-6 text-center">
                      <button
                        onClick={(e) => {
                          if (openMenuId === product.id) {
                            setOpenMenuId(null);
                            setMenuPosition(null);
                          } else {
                            const buttonRect = e.currentTarget.getBoundingClientRect();
                            const viewportHeight = window.innerHeight;
                            const openUp = buttonRect.bottom > viewportHeight - 200;
                            setMenuPosition({
                              top: openUp ? buttonRect.top : buttonRect.bottom + 4,
                              left: buttonRect.right - 160, // 160px is menu width
                              openUp,
                            });
                            setOpenMenuId(product.id);
                          }
                        }}
                        className="text-[#030712] hover:text-[#6A7282] cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M12.3388 8.00339C12.3388 8.18757 12.1895 8.33687 12.0053 8.33687C11.8212 8.33687 11.6719 8.18757 11.6719 8.00339C11.6719 7.81922 11.8212 7.66992 12.0053 7.66992C12.1895 7.66992 12.3388 7.81922 12.3388 8.00339" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8.33687 8.00339C8.33687 8.18757 8.18757 8.33687 8.00339 8.33687C7.81922 8.33687 7.66992 8.18757 7.66992 8.00339C7.66992 7.81922 7.81922 7.66992 8.00339 7.66992C8.18757 7.66992 8.33687 7.81922 8.33687 8.00339" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M4.33491 8.00339C4.33491 8.18757 4.18561 8.33687 4.00144 8.33687C3.81727 8.33687 3.66797 8.18757 3.66797 8.00339C3.66797 7.81922 3.81727 7.66992 4.00144 7.66992C4.18561 7.66992 4.33491 7.81922 4.33491 8.00339" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedProducts.length === 0 ? (
            <div className="col-span-full py-12 bg-white rounded-lg border border-[#E5E7EB]">
              <div className="flex flex-col items-center gap-3">
                <svg className="h-12 w-12 text-[#99A1AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <div className="text-center">
                  <p className="font-public text-[14px] font-medium text-[#030712]">No products match your current filters</p>
                  <p className="font-public text-[13px] text-[#6A7282] mt-1">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
                <button
                  onClick={clearFilters}
                  className="mt-2 px-4 py-2 text-[14px] font-medium text-black border border-[#E5E5E5] rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          ) : (
            paginatedProducts.map((product) => {
              const isSelected = selectedProducts.includes(product.id);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg border border-[#E5E7EB] p-4 hover:shadow-md transition-shadow"
                >
                  {/* Checkbox */}
                  <div className="flex items-start justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                      className="w-4 h-4 rounded border-[#E5E5E5] cursor-pointer"
                    />
                    <button
                      onClick={(e) => {
                        if (openMenuId === product.id) {
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        } else {
                          const buttonRect = e.currentTarget.getBoundingClientRect();
                          const viewportHeight = window.innerHeight;
                          const openUp = buttonRect.bottom > viewportHeight - 200;
                          setMenuPosition({
                            top: openUp ? buttonRect.top : buttonRect.bottom + 4,
                            left: buttonRect.right - 160, // 160px is menu width
                            openUp,
                          });
                          setOpenMenuId(product.id);
                        }
                      }}
                      className="text-[#030712] hover:text-[#6A7282] cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M12.3388 8.00339C12.3388 8.18757 12.1895 8.33687 12.0053 8.33687C11.8212 8.33687 11.6719 8.18757 11.6719 8.00339C11.6719 7.81922 11.8212 7.66992 12.0053 7.66992C12.1895 7.66992 12.3388 7.81922 12.3388 8.00339" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8.33687 8.00339C8.33687 8.18757 8.18757 8.33687 8.00339 8.33687C7.81922 8.33687 7.66992 8.18757 7.66992 8.00339C7.66992 7.81922 7.81922 7.66992 8.00339 7.66992C8.18757 7.66992 8.33687 7.81922 8.33687 8.00339" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4.33491 8.00339C4.33491 8.18757 4.18561 8.33687 4.00144 8.33687C3.81727 8.33687 3.66797 8.18757 3.66797 8.00339C3.66797 7.81922 3.81727 7.66992 4.00144 7.66992C4.18561 7.66992 4.33491 7.81922 4.33491 8.00339" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Product Image */}
                  <div className="w-full aspect-square rounded-lg bg-[#F5F5F5] flex items-center justify-center mb-3 overflow-hidden">
                    {product.image && product.image !== "/placeholder-product.png" ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[48px]">📦</span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="mb-3">
                    <h3 className="font-public text-[14px] font-medium text-[#030712] mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="font-public text-[12px] text-[#6A7282]">ID: {product.id}</p>
                  </div>

                  {/* Price and Category */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-public text-[16px] font-medium text-[#030712]">{product.price}</span>
                    <span className="px-2 py-1 bg-[#F9FAFB] rounded text-[12px] font-public text-[#6A7282]">
                      {product.category}
                    </span>
                  </div>

                  {/* Stock */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-public text-[12px] text-[#6A7282]">Stock</span>
                      <span className="font-public text-[12px] font-medium text-[#030712]">
                        {product.stock.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Footer: Sold and Active Toggle */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
                    <div>
                      <span className="font-public text-[12px] text-[#6A7282]">Sold: </span>
                      <span className="font-public text-[12px] font-medium text-[#030712]">{product.sold}</span>
                    </div>
                    {(() => {
                      const isActive = getProductState(product.id, product.active);
                      const isPending = localProductStates[product.id] !== undefined;
                      return (
                        <button
                          onClick={() => toggleProductActive(product.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                            isActive ? "bg-[#2563EB]" : "bg-[#E5E7EB]"
                          } ${isPending ? "opacity-75" : ""}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                              isActive ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination for both views */}
      {paginatedProducts.length > 0 && (
        <div className="mt-6 bg-white rounded-lg border border-[#E5E7EB]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4">
            <div className="font-public text-[14px] text-[#6A7282]">
              Page {currentPage} of {totalPages || 1}
            </div>

            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg font-public text-[14px] font-medium ${
                  currentPage === 1
                    ? "bg-[#F9FAFB] text-[#D1D5DB] cursor-not-allowed"
                    : "bg-white border border-[#E5E7EB] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                }`}
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-public text-[14px] font-medium cursor-pointer transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#030712] text-white"
                          : "bg-white border border-[#E5E7EB] text-[#030712] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg font-public text-[14px] font-medium ${
                  currentPage === totalPages
                    ? "bg-[#F9FAFB] text-[#D1D5DB] cursor-not-allowed"
                    : "bg-white border border-[#E5E7EB] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                }`}
              >
                Next
              </button>
            </div>

            {/* Rows Per Page */}
            <div className="relative flex items-center gap-2" ref={rowsDropdownRef}>
              <span className="font-public text-[14px] text-[#6A7282]">{rowsPerPage} data per row</span>
              <button
                onClick={() => setIsRowsDropdownOpen(!isRowsDropdownOpen)}
                className="p-2 rounded cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform ${isRowsDropdownOpen ? "rotate-180" : ""}`}>
                  <path d="M4 6L8 10L12 6" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Rows Per Page Dropdown */}
              {isRowsDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-[120px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    {[8, 16, 24, 50, 100].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          setRowsPerPage(num);
                          setCurrentPage(1);
                          setIsRowsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left font-public text-[14px] cursor-pointer transition-colors ${
                          rowsPerPage === num
                            ? "bg-[#F9FAFB] text-[#030712] font-medium"
                            : "text-[#030712] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        {num} per page
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Portal-rendered dropdown menu - floats outside table */}
      {openMenuId && menuPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={menuDropdownRef}
          className="fixed w-40 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-[9999]"
          style={{
            top: menuPosition.openUp ? "auto" : menuPosition.top,
            bottom: menuPosition.openUp ? `${window.innerHeight - menuPosition.top + 4}px` : "auto",
            left: menuPosition.left,
          }}
        >
          <div className="py-1">
            <a
              href={`/admin/products/edit/${openMenuId}`}
              onClick={() => {
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
              className="block w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
            >
              Edit
            </a>
            <button
              onClick={() => {
                const product = paginatedProducts.find(p => p.id === openMenuId);
                if (product && openMenuId) {
                  setDuplicateModal({
                    isOpen: true,
                    productId: openMenuId,
                    productName: product.name,
                  });
                }
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
              className="w-full px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
            >
              Duplicate
            </button>
            <div className="border-t border-[#E5E7EB] my-1"></div>
            <button
              onClick={() => {
                if (openMenuId) {
                  handleDeleteProduct(openMenuId);
                }
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
              className="w-full px-4 py-2 text-left font-public text-[14px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Duplicate Confirmation Modal */}
      {duplicateModal.isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDuplicateModal({ isOpen: false, productId: null, productName: "" })}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-geist text-[18px] font-semibold text-[#030712]">
                Duplicate Product
              </h3>
              <button
                onClick={() => setDuplicateModal({ isOpen: false, productId: null, productName: "" })}
                className="text-[#6A7282] hover:text-[#030712] transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <p className="font-public text-[14px] text-[#6A7282] mb-6">
              Are you sure you want to duplicate <span className="font-medium text-[#030712]">&quot;{duplicateModal.productName}&quot;</span>?
              A copy will be created as a draft.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDuplicateModal({ isOpen: false, productId: null, productName: "" })}
                disabled={duplicateProductMutation.isPending}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] font-public text-[14px] font-medium text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (duplicateModal.productId) {
                    duplicateProductMutation.mutate(duplicateModal.productId, {
                      onSuccess: () => {
                        setDuplicateModal({ isOpen: false, productId: null, productName: "" });
                        setToast({
                          isVisible: true,
                          message: "Product duplicated successfully.",
                          type: "success",
                        });
                      },
                      onError: (error) => {
                        console.error("Failed to duplicate product:", error);
                        setToast({
                          isVisible: true,
                          message: "Failed to duplicate product. Please try again.",
                          type: "error",
                        });
                      },
                    });
                  }
                }}
                disabled={duplicateProductMutation.isPending}
                className="px-4 py-2 rounded-lg bg-[#2F2F2F] font-public text-[14px] font-medium text-white hover:bg-[#3D3D3D] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {duplicateProductMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Duplicating...
                  </>
                ) : (
                  "Duplicate"
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleteProductMutation.isPending && setDeleteModal({ isOpen: false, productId: null, productName: "" })}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-geist text-[18px] font-semibold text-[#DC2626]">
                Delete Product
              </h3>
              <button
                onClick={() => !deleteProductMutation.isPending && setDeleteModal({ isOpen: false, productId: null, productName: "" })}
                disabled={deleteProductMutation.isPending}
                className="text-[#6A7282] hover:text-[#030712] transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <p className="font-public text-[14px] text-[#6A7282] mb-6">
              Are you sure you want to delete <span className="font-medium text-[#030712]">&quot;{deleteModal.productName}&quot;</span>?
              This action cannot be undone.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, productId: null, productName: "" })}
                disabled={deleteProductMutation.isPending}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] font-public text-[14px] font-medium text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                disabled={deleteProductMutation.isPending}
                className="px-4 py-2 rounded-lg bg-[#DC2626] font-public text-[14px] font-medium text-white hover:bg-[#B91C1C] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {deleteProductMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      {toast.isVisible && typeof document !== "undefined" && createPortal(
        <div className={`fixed top-4 right-4 z-[10001] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === "success" ? "bg-[#10B981] text-white" : "bg-[#DC2626] text-white"
        }`}>
          {toast.type === "success" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.6667 5L7.50001 14.1667L3.33334 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 6V10M10 14H10.01M18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          <span className="font-public text-[14px] font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(prev => ({ ...prev, isVisible: false }))}
            className="ml-2 hover:opacity-80 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>,
        document.body
      )}

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isCSVImportModalOpen}
        onClose={() => setIsCSVImportModalOpen(false)}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
          setToast({ isVisible: true, message: "Products imported successfully!", type: "success" });
        }}
      />
    </div>
  );
}
