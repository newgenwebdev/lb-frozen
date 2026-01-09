"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArticleToolbar,
  ArticleTable,
  ArticlePagination,
} from "@/components/admin/article";
import { useArticles } from "@/lib/api/queries";

export default function ArticlePage(): React.JSX.Element {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<"draft" | "published" | "all">("all");

  // Calculate offset for API
  const offset = (currentPage - 1) * itemsPerPage;

  // Fetch articles from API
  const { data: apiResponse, isLoading, isError, error } = useArticles({
    limit: itemsPerPage,
    offset,
    status: statusFilter,
  });

  const articles = apiResponse?.articles || [];
  const count = apiResponse?.count || 0;
  const totalPages = Math.ceil(count / itemsPerPage);

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

  // Handle filter click
  const handleFilterClick = (): void => {
    // Toggle status filter for now
    const nextStatus = statusFilter === "all" ? "published" : statusFilter === "published" ? "draft" : "all";
    setStatusFilter(nextStatus);
    setCurrentPage(1);
  };

  // Handle add new article click
  const handleAddClick = (): void => {
    router.push("/admin/article/add");
  };

  // Handle edit article
  const handleEdit = (id: string): void => {
    router.push(`/admin/article/edit/${id}`);
  };

  // Handle delete article
  const handleDelete = (id: string): void => {
    // Delete is handled by the ArticleTable component with the modal
    console.log("Article deleted:", id);
  };

  // Error state
  if (isError) {
    return (
      <div className="px-4 md:px-8">
        <div className="mb-6">
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712] mb-6">
            Article List
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-[16px] font-medium text-[#030712]">Failed to load articles</h3>
            <p className="mt-2 text-[14px] text-[#6A7282]">
              {error?.message || "An error occurred while fetching articles."}
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
      <ArticleToolbar onFilterClick={handleFilterClick} onAddClick={handleAddClick} />

      {/* Status Filter Indicator */}
      {statusFilter !== "all" && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-[#6A7282]">Filtered by:</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#374151]">
            {statusFilter}
            <button
              onClick={() => setStatusFilter("all")}
              className="ml-1 text-[#6B7280] hover:text-[#374151]"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </span>
        </div>
      )}

      {/* Table */}
      <ArticleTable
        articles={articles}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 0 && (
        <ArticlePagination
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
