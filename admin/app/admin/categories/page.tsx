"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CategoryStatsCards,
  CategoryToolbar,
  CategoryTable,
} from "@/components/admin"
import type { SortField, SortDirection } from "@/components/admin/categories"
import { useCategories, useCategoryStats } from "@/lib/api/queries"
import { useToast } from "@/contexts/ToastContext"
import { useQueryClient } from "@tanstack/react-query"
import { deleteCategory } from "@/lib/api/categories"
import type { MedusaProductCategory } from "@/lib/types/product"
import type { CategoryFilter } from "@/lib/validators/category"

const CATEGORIES_PER_PAGE = 10

export default function CategoriesPage(): React.JSX.Element {
  const router = useRouter()
  const { showToast, confirm } = useToast()
  const queryClient = useQueryClient()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [filterBy, setFilterBy] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(CATEGORIES_PER_PAGE)
  const [tableSortField, setTableSortField] = useState<SortField | null>(null)
  const [tableSortDirection, setTableSortDirection] = useState<SortDirection>("asc")

  // Calculate offset for pagination
  const offset = (currentPage - 1) * perPage

  // Convert table column sort to API sort_by format
  const getEffectiveSortBy = (): CategoryFilter["sort_by"] => {
    if (tableSortField) {
      const fieldToSortMap: Record<SortField, { asc: CategoryFilter["sort_by"]; desc: CategoryFilter["sort_by"] }> = {
        id: { asc: "oldest", desc: "newest" }, // ID correlates with creation time
        name: { asc: "name_asc", desc: "name_desc" },
        handle: { asc: "handle_asc", desc: "handle_desc" },
        parent: { asc: "parent_asc", desc: "parent_desc" },
        status: { asc: "status_asc", desc: "status_desc" },
      }
      return fieldToSortMap[tableSortField][tableSortDirection]
    }
    return sortBy as CategoryFilter["sort_by"]
  }

  // Build filter object
  const filters: CategoryFilter = {
    search: searchQuery || undefined,
    sort_by: getEffectiveSortBy(),
    status: filterBy !== "all" ? (filterBy as "active" | "non_active") : undefined,
    limit: perPage,
    offset,
  }

  // Fetch data
  const { data: statsData, isLoading: isLoadingStats } = useCategoryStats()
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategories(filters)

  // Calculate pagination
  const categories = categoriesData?.product_categories || []
  const totalCategories = categoriesData?.count || 0
  const totalPages = Math.ceil(totalCategories / perPage) || 1

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

  const handleAddCategory = (): void => {
    router.push("/admin/categories/add-category")
  }

  const handleEditCategory = (category: MedusaProductCategory): void => {
    router.push(`/admin/categories/edit/${category.id}`)
  }

  // Generate display ID for category (last 4 digits for modal)
  const getCategoryDisplayId = (id: string): string => {
    if (id.length > 4) {
      return id.slice(-4)
    }
    return id
  }

  const handleDeleteCategory = async (
    category: MedusaProductCategory
  ): Promise<void> => {
    const confirmed = await confirm({
      title: "Delete Category",
      message: "Are you sure you want to delete this category?",
      confirmText: "Delete",
      cancelText: "Cancel",
      categoryDetails: {
        categoryId: getCategoryDisplayId(category.id),
        categoryName: category.name,
      },
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteCategory(category.id)
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      showToast(`Category "${category.name}" deleted successfully.`, "success")
    } catch (error) {
      console.error("Failed to delete category:", error)
      showToast("Failed to delete category. Please try again.", "error")
    }
  }

  return (
    <div className="px-4 md:px-8">
      {/* Stats Cards */}
      <CategoryStatsCards stats={statsData} isLoading={isLoadingStats} />

      {/* Toolbar */}
      <CategoryToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        filterBy={filterBy}
        onFilterChange={handleFilterChange}
        onAddCategory={handleAddCategory}
      />

      {/* Categories Table */}
      <CategoryTable
        categories={categories}
        isLoading={isLoadingCategories}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCategories={totalCategories}
        categoriesPerPage={perPage}
        sortField={tableSortField}
        sortDirection={tableSortDirection}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
        onSort={handleColumnSort}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
      />
    </div>
  )
}
