'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ProductCard } from './ProductCard'
import { FadeIn } from '@/components/ui/FadeIn'
import type { Product } from '@/lib/api/adapter'
import type { MedusaProductCategory } from '@/lib/api/types'

// Pagination settings
const PRODUCTS_PER_PAGE = 60

// Price range options
const PRICE_RANGES = [
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50 - $100', min: 50, max: 100 },
  { label: '$100 - $150', min: 100, max: 150 },
  { label: 'Above $150', min: 150, max: Infinity },
] as const

type ProductsFilterProps = {
  products: Product[]
  categories: MedusaProductCategory[]
  initialSelectedCategories: string[]
}

// Helper to build category tree from flat list
type CategoryWithChildren = MedusaProductCategory & {
  children?: CategoryWithChildren[]
}

const buildCategoryTree = (categories: MedusaProductCategory[]): CategoryWithChildren[] => {
  const categoryMap = new Map<string, CategoryWithChildren>()
  const rootCategories: CategoryWithChildren[] = []

  // First pass: create map of all categories
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] })
  })

  // Second pass: build tree structure
  categories.forEach((cat) => {
    const category = categoryMap.get(cat.id)!
    if (cat.parent_category_id) {
      const parent = categoryMap.get(cat.parent_category_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(category)
      } else {
        rootCategories.push(category)
      }
    } else {
      rootCategories.push(category)
    }
  })

  // Sort function for alphabetical ordering (case-insensitive)
  const sortCategories = (cats: CategoryWithChildren[]): CategoryWithChildren[] => {
    return cats
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      .map((cat) => ({
        ...cat,
        children: cat.children ? sortCategories(cat.children) : [],
      }))
  }

  return sortCategories(rootCategories)
}

export const ProductsFilter = ({
  products,
  categories,
  initialSelectedCategories,
}: ProductsFilterProps): React.JSX.Element => {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  const categoriesFromUrl = categoryParam ? categoryParam.split(',').filter(Boolean) : initialSelectedCategories
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categoriesFromUrl)
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [isProductsOpen, setIsProductsOpen] = useState(true)
  const [isPriceOpen, setIsPriceOpen] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Pagination state
  const pageParam = searchParams.get('page')
  const [currentPage, setCurrentPage] = useState<number>(pageParam ? parseInt(pageParam, 10) : 1)

  // Build category tree
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories])

  // Filter products client-side
  const filteredProducts = useMemo(() => {
    let result = products

    if (selectedCategories.length > 0) {
      result = result.filter((product) => {
        if (!product.categories || product.categories.length === 0) {
          return false
        }
        return product.categories.some((cat) =>
          selectedCategories.includes(cat.handle)
        )
      })
    }

    if (selectedPriceRanges.length > 0) {
      const selectedRanges = PRICE_RANGES.filter((range) =>
        selectedPriceRanges.includes(range.label)
      )
      result = result.filter((product) => {
        return selectedRanges.some(
          (range) => product.price >= range.min && product.price < range.max
        )
      })
    }

    return result
  }, [products, selectedCategories, selectedPriceRanges])

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE
    const endIndex = startIndex + PRODUCTS_PER_PAGE
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
    updateUrlPage(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, selectedPriceRanges])

  // Update URL with page parameter
  const updateUrlPage = (page: number): void => {
    const params = new URLSearchParams(searchParams.toString())
    if (page > 1) {
      params.set('page', String(page))
    } else {
      params.delete('page')
    }
    const newUrl = params.toString() ? `/products?${params.toString()}` : '/products'
    window.history.replaceState(null, '', newUrl)
  }

  const handlePageChange = (page: number): void => {
    setCurrentPage(page)
    updateUrlPage(page)
    // Scroll to top of products grid
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeFilters = selectedCategories.length + selectedPriceRanges.length

  const pageTitle = useMemo(() => {
    if (selectedCategories.length === 0) {
      return 'All products'
    }
    if (selectedCategories.length === 1) {
      const findCategory = (cats: MedusaProductCategory[]): MedusaProductCategory | undefined => {
        for (const cat of cats) {
          if (cat.handle === selectedCategories[0]) return cat
        }
        return undefined
      }
      const selectedCategoryData = findCategory(categories)
      return selectedCategoryData?.name || 'All products'
    }
    return `${selectedCategories.length} categories selected`
  }, [selectedCategories, categories])

  const toggleCategoryExpand = (categoryId: string): void => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleCategoryChange = (categoryHandle: string, isChecked: boolean): void => {
    let newCategories: string[]
    if (isChecked) {
      newCategories = [...selectedCategories, categoryHandle]
    } else {
      newCategories = selectedCategories.filter((c) => c !== categoryHandle)
    }

    setSelectedCategories(newCategories)

    const params = new URLSearchParams(searchParams.toString())
    if (newCategories.length > 0) {
      params.set('category', newCategories.join(','))
    } else {
      params.delete('category')
    }

    const newUrl = params.toString() ? `/products?${params.toString()}` : '/products'
    window.history.replaceState(null, '', newUrl)
  }

  const handlePriceChange = (priceLabel: string, isChecked: boolean): void => {
    if (isChecked) {
      setSelectedPriceRanges([...selectedPriceRanges, priceLabel])
    } else {
      setSelectedPriceRanges(selectedPriceRanges.filter((label) => label !== priceLabel))
    }
  }

  // Check if category or any of its children is selected
  const isCategoryOrChildSelected = (category: CategoryWithChildren): boolean => {
    if (selectedCategories.includes(category.handle)) return true
    if (category.children) {
      return category.children.some((child) => isCategoryOrChildSelected(child))
    }
    return false
  }

  // Render category item with children
  const renderCategory = (category: CategoryWithChildren, level: number = 0): React.JSX.Element => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.includes(category.id)
    const isActive = isCategoryOrChildSelected(category)

    return (
      <div key={category.id}>
        <div
          className={`flex items-center justify-between py-2 ${level > 0 ? 'pl-4' : ''}`}
        >
          <button
            onClick={() => {
              if (hasChildren) {
                toggleCategoryExpand(category.id)
              } else {
                handleCategoryChange(category.handle, !selectedCategories.includes(category.handle))
              }
            }}
            className={`flex flex-1 cursor-pointer items-center gap-2 text-left text-[15px] font-medium transition-colors ${
              isActive ? 'text-[#C4961A]' : 'text-[#333]'
            } hover:text-[#C4961A]`}
          >
            {level > 0 && (
              <span className="text-[#999]">{'>'}</span>
            )}
            {category.name}
          </button>
          {hasChildren && (
            <button
              onClick={() => toggleCategoryExpand(category.id)}
              className={`flex h-5 w-5 cursor-pointer items-center justify-center border transition-colors ${
                isActive
                  ? 'border-[#C4961A] text-[#C4961A]'
                  : 'border-[#999] text-[#999]'
              } hover:border-[#C4961A] hover:text-[#C4961A]`}
            >
              <span className="text-xs font-bold leading-none">
                {isExpanded ? '−' : '+'}
              </span>
            </button>
          )}
        </div>

        {/* Children */}
        <AnimatePresence initial={false}>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="ml-2 border-l border-[#E5E5E5] pl-2">
                {category.children!.map((child) => renderCategory(child, level + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
      {/* Page Heading */}
      <FadeIn direction="up">
        <div className="px-4 pb-0 pt-11 sm:px-6 sm:pb-0 sm:pt-14 lg:px-8 lg:pb-0 lg:pt-16">
          <h1 className="text-[40px] font-medium leading-[120%] tracking-[-2.4px] text-black">
            {pageTitle}
          </h1>
        </div>
      </FadeIn>

      {/* Sidebar and Products */}
      <div className="flex">
        {/* Mobile Filter Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed bottom-6 right-6 z-50 flex cursor-pointer items-center gap-2 rounded-full bg-black px-6 py-3 text-white shadow-lg lg:hidden"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filter{activeFilters > 0 && ` (${activeFilters})`}
        </button>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/5 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col overflow-y-auto px-6 pt-20 sm:pt-24 lg:pt-8">
            {/* Close button for mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-4 top-20 cursor-pointer text-2xl text-black sm:top-24 lg:hidden"
            >
              ×
            </button>

            {/* PRODUCTS Section */}
            <div className="mb-6">
              <button
                onClick={() => setIsProductsOpen(!isProductsOpen)}
                className="flex w-full cursor-pointer items-center justify-between pb-3 text-[13px] font-semibold uppercase tracking-wider text-[#333]"
              >
                CATEGORY
                <span className="text-[#999]">
                  {isProductsOpen ? '∧' : '∨'}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isProductsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 border-t border-[#E5E5E5] pt-3">
                      {categoryTree.map((category) => renderCategory(category))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* PRICE Section */}
            <div className="mb-6">
              <button
                onClick={() => setIsPriceOpen(!isPriceOpen)}
                className="flex w-full cursor-pointer items-center justify-between pb-3 text-[13px] font-semibold uppercase tracking-wider text-[#333]"
              >
                PRICE
                <span className="text-[#999]">
                  {isPriceOpen ? '∧' : '∨'}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isPriceOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-[#E5E5E5] pt-3">
                      {PRICE_RANGES.map((range) => (
                        <label
                          key={range.label}
                          className="flex cursor-pointer items-center gap-3 py-1 text-[15px] text-[#333] transition-colors hover:text-[#C4961A]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPriceRanges.includes(range.label)}
                            onChange={(e) => handlePriceChange(range.label, e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center border border-[#CCC] bg-white transition-all peer-checked:border-[#C4961A] peer-checked:bg-[#C4961A] peer-checked:[&>svg]:opacity-100">
                            <svg
                              className="h-3 w-3 text-white opacity-0 transition-opacity"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          {range.label}
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1 bg-white px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
            {paginatedProducts.map((product, index) => (
              <FadeIn key={product.id} delay={index * 0.05} direction="up">
                <ProductCard {...product} />
              </FadeIn>
            ))}
          </div>

          {paginatedProducts.length === 0 && (
            <FadeIn>
              <p className="text-center text-[16px] text-[#999]">No products found</p>
            </FadeIn>
          )}

          {/* Pagination Controls - Always show when there are products */}
          {filteredProducts.length > 0 && (
            <div className="mt-12 flex items-center justify-between border-t border-[#E5E5E5] pt-6">
              {/* Items count */}
              <p className="text-[14px] text-[#666]">
                {paginatedProducts.length} out of {filteredProducts.length} items
              </p>

              {/* Page navigation */}
              <div className="flex items-center gap-3">
                <span className="text-[14px] text-[#666]">Page</span>

                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    currentPage === 1
                      ? 'cursor-not-allowed bg-[#F5F5F5] text-[#CCC]'
                      : 'bg-[#F5F5F5] text-[#333] hover:bg-[#E5E5E5]'
                  }`}
                  aria-label="Previous page"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Current Page Number */}
                <span className="flex h-9 min-w-[36px] items-center justify-center rounded-full border border-[#333] px-3 text-[14px] font-medium text-[#333]">
                  {currentPage}
                </span>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages <= 1}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    currentPage === totalPages || totalPages <= 1
                      ? 'cursor-not-allowed bg-[#F5F5F5] text-[#CCC]'
                      : 'bg-[#F5F5F5] text-[#333] hover:bg-[#E5E5E5]'
                  }`}
                  aria-label="Next page"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}