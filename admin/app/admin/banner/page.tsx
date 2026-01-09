"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BannerToolbar,
  BannerTable,
  BannerPagination,
} from "@/components/admin/banner";
import { useBanners } from "@/lib/api/queries";
import { mapBannerListAPIToUI } from "@/lib/utils/banner-mapper";

export default function BannerPage(): React.JSX.Element {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<"active" | "non_active" | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate offset for API
  const offset = (currentPage - 1) * itemsPerPage;

  // Fetch banners from API
  const { data: apiResponse, isLoading, isError, error } = useBanners({
    limit: itemsPerPage,
    offset,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Map API response to UI format and apply client-side search
  const bannerData = useMemo(() => {
    if (!apiResponse) {
      return {
        banners: [],
        count: 0,
        page: 1,
        limit: itemsPerPage,
      };
    }
    const mapped = mapBannerListAPIToUI(apiResponse);

    // Apply client-side search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      const filteredBanners = mapped.banners.filter((banner) =>
        banner.text.toLowerCase().includes(searchLower) ||
        banner.displayId.toLowerCase().includes(searchLower)
      );
      return {
        ...mapped,
        banners: filteredBanners,
        count: filteredBanners.length,
      };
    }

    return mapped;
  }, [apiResponse, itemsPerPage, debouncedSearch]);

  const { banners, count, limit } = bannerData;
  const totalPages = Math.ceil(count / limit);

  // Handle page change
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number): void => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Handle search change
  const handleSearchChange = (value: string): void => {
    setSearchQuery(value);
  };

  // Handle filter change
  const handleFilterChange = (value: "active" | "non_active" | "all"): void => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Handle add new banner click
  const handleAddClick = (): void => {
    router.push("/admin/banner/add");
  };

  // Handle edit banner
  const handleEdit = (id: string): void => {
    router.push(`/admin/banner/edit/${id}`);
  };

  // Handle delete banner (callback after deletion)
  const handleDelete = (_id: string): void => {
    // Delete is handled by the BannerTable component with the modal
    // This function is kept for compatibility but the actual deletion
    // happens in the table component via the mutation
  };

  // Error state
  if (isError) {
    return (
      <div className="px-4 md:px-8">
        <div className="mb-6">
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712] mb-6">
            Banner List
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-[16px] font-medium text-[#030712]">Failed to load banners</h3>
            <p className="mt-2 text-[14px] text-[#6A7282]">
              {error?.message || "An error occurred while fetching banners."}
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

  return (
    <div className="px-4 md:px-8">
      {/* Toolbar */}
      <BannerToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onFilterChange={handleFilterChange}
        onAddClick={handleAddClick}
      />

      {/* Table */}
      <BannerTable
        banners={banners}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 0 && (
        <BannerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );
}

