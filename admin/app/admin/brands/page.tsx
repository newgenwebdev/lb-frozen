"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  BrandStatsCards,
  BrandToolbar,
  BrandTable,
} from "@/components/admin"
import type { SortField, SortDirection } from "@/components/admin/brands"
import { useBrands, useBrandStats } from "@/lib/api/queries"
import { useToast } from "@/contexts/ToastContext"
import { useQueryClient } from "@tanstack/react-query"
import { deleteBrand } from "@/lib/api/brands"
import type { Brand, BrandFilter } from "@/lib/validators/brand"

const BRANDS_PER_PAGE = 10

export default function BrandsPage(): React.JSX.Element {
  const router = useRouter()
  const { showToast, confirm } = useToast()
  const queryClient = useQueryClient()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [filterBy, setFilterBy] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(BRANDS_PER_PAGE)
  const [tableSortField, setTableSortField] = useState<SortField | null>(null)
  const [tableSortDirection, setTableSortDirection] = useState<SortDirection>("asc")

  // Calculate offset for pagination
  const offset = (currentPage - 1) * perPage

  // Convert table column sort to API sort_by format
  const getEffectiveSortBy = (): BrandFilter["sort_by"] => {
    if (tableSortField) {
      const fieldToSortMap: Record<SortField, { asc: BrandFilter["sort_by"]; desc: BrandFilter["sort_by"] }> = {
        id: { asc: "oldest", desc: "newest" }, // ID correlates with creation time
        name: { asc: "name_asc", desc: "name_desc" },
        handle: { asc: "handle_asc", desc: "handle_desc" },
        status: { asc: "status_asc", desc: "status_desc" },
      }
      return fieldToSortMap[tableSortField][tableSortDirection]
    }
    return sortBy as BrandFilter["sort_by"]
  }

  // Build filter object
  const filters: BrandFilter = {
    search: searchQuery || undefined,
    sort_by: getEffectiveSortBy(),
    status: filterBy !== "all" ? (filterBy as "active" | "non_active") : undefined,
    limit: perPage,
    offset,
  }

  // Fetch data
  const { data: statsData, isLoading: isLoadingStats } = useBrandStats()
  const { data: brandsData, isLoading: isLoadingBrands } =
    useBrands(filters)

  // Calculate pagination
  const brands = brandsData?.brands || []
  const totalBrands = brandsData?.count || 0
  const totalPages = Math.ceil(totalBrands / perPage) || 1

  // Handlers
  const handleSearchChange = (value: string): void => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleSortChange = (value: string): void => {
    setSortBy(value)
    // Clear table column sort when using toolbar sort dropdown
    setTableSortField(null)
    setCurrentPage(1)
  }

  const handleColumnSort = (field: SortField, direction: SortDirection): void => {
    setTableSortField(field)
    setTableSortDirection(direction)
    setCurrentPage(1)
  }

  const handleFilterChange = (value: string): void => {
    setFilterBy(value)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number): void => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePerPageChange = (value: number): void => {
    setPerPage(value)
    setCurrentPage(1)
  }

  const handleAddBrand = (): void => {
    router.push("/admin/brands/add-brand")
  }

  const handleEditBrand = (brand: Brand): void => {
    router.push(`/admin/brands/edit/${brand.id}`)
  }

  // Generate display ID for brand (last 4 digits for modal)
  const getBrandDisplayId = (id: string): string => {
    if (id.length > 4) {
      return id.slice(-4)
    }
    return id
  }

  const handleDeleteBrand = async (
    brand: Brand
  ): Promise<void> => {
    const confirmed = await confirm({
      title: "Delete Brand",
      message: "Are you sure you want to delete this brand?",
      confirmText: "Delete",
      cancelText: "Cancel",
      categoryDetails: {
        categoryId: getBrandDisplayId(brand.id),
        categoryName: brand.name,
      },
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteBrand(brand.id)
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      showToast(`Brand "${brand.name}" deleted successfully.`, "success")
    } catch (error) {
      console.error("Failed to delete brand:", error)
      showToast("Failed to delete brand. Please try again.", "error")
    }
  }

  return (
    <div className="px-4 md:px-8">
      {/* Stats Cards */}
      <BrandStatsCards stats={statsData} isLoading={isLoadingStats} />

      {/* Toolbar */}
      <BrandToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        filterBy={filterBy}
        onFilterChange={handleFilterChange}
        onAddBrand={handleAddBrand}
      />

      {/* Brands Table */}
      <BrandTable
        brands={brands}
        isLoading={isLoadingBrands}
        currentPage={currentPage}
        totalPages={totalPages}
        totalBrands={totalBrands}
        brandsPerPage={perPage}
        sortField={tableSortField}
        sortDirection={tableSortDirection}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
        onSort={handleColumnSort}
        onEdit={handleEditBrand}
        onDelete={handleDeleteBrand}
      />
    </div>
  )
}
