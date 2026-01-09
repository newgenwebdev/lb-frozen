'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { MedusaProductCategory } from '@/lib/api/types'

type FilterSection = 'category' | 'price' | 'size'

type FilterSidebarProps = {
  categories: MedusaProductCategory[]
  selectedCategories?: string[]
}

export const FilterSidebar = ({ categories, selectedCategories = [] }: FilterSidebarProps): React.JSX.Element => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [openSections, setOpenSections] = useState<FilterSection[]>(['category', 'price', 'size'])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Count active filters
  const activeFilters = selectedCategories.length

  const toggleSection = (section: FilterSection): void => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const handleCategoryChange = (categoryHandle: string, isChecked: boolean): void => {
    const params = new URLSearchParams(searchParams.toString())

    let newCategories: string[]
    if (isChecked) {
      // Add category
      newCategories = [...selectedCategories, categoryHandle]
    } else {
      // Remove category
      newCategories = selectedCategories.filter(c => c !== categoryHandle)
    }

    if (newCategories.length > 0) {
      params.set('category', newCategories.join(','))
    } else {
      params.delete('category')
    }

    router.push(`/products?${params.toString()}`)
    setIsSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile Filter Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-50 flex cursor-pointer items-center gap-2 rounded-full bg-black px-6 py-3 text-white shadow-lg lg:hidden"
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
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filter
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
        className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-white px-8 py-12 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute right-4 top-4 cursor-pointer text-2xl text-black lg:hidden"
        >
          ×
        </button>

        {/* Filter Heading */}
        <h2 className="mb-8 text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black sm:text-[20px] sm:tracking-[-1.2px]">
          Filter ({activeFilters})
        </h2>

        {/* Category Filter - Dynamic from backend with checkboxes */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('category')}
            className="flex w-full cursor-pointer items-center justify-between border-b border-gray-200 pb-4 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black sm:text-[14px] sm:tracking-[-0.84px]"
          >
            CATEGORY
            <span className="text-lg">{openSections.includes('category') ? '−' : '+'}</span>
          </button>
          {openSections.includes('category') && (
            <div className="mt-4 space-y-3">
              {categories.map((category) => (
                <label key={category.id} className="flex cursor-pointer items-center gap-3 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black sm:text-[14px] sm:tracking-[-0.84px]">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.handle)}
                    onChange={(e) => handleCategoryChange(category.handle, e.target.checked)}
                    className="h-4 w-4 cursor-pointer border border-gray-300"
                  />
                  {category.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Price Filter - Static for now */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('price')}
            className="flex w-full cursor-pointer items-center justify-between border-b border-gray-200 pb-4 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black sm:text-[14px] sm:tracking-[-0.84px]"
          >
            PRICE
            <span className="text-lg">{openSections.includes('price') ? '−' : '+'}</span>
          </button>
          {openSections.includes('price') && (
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black sm:text-[14px] sm:tracking-[-0.84px]">
                <input type="checkbox" className="h-4 w-4 cursor-pointer border border-gray-300" />
                Under $50
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black sm:text-[14px] sm:tracking-[-0.84px]">
                <input type="checkbox" className="h-4 w-4 cursor-pointer border border-gray-300" />
                $100-$150
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black sm:text-[14px] sm:tracking-[-0.84px]">
                <input type="checkbox" className="h-4 w-4 cursor-pointer border border-gray-300" />
                Above $200
              </label>
            </div>
          )}
        </div>

        {/* Size Filter - Static for now */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection('size')}
            className="flex w-full cursor-pointer items-center justify-between border-b border-gray-200 pb-4 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black sm:text-[14px] sm:tracking-[-0.84px]"
          >
            SIZE
            <span className="text-lg">{openSections.includes('size') ? '−' : '+'}</span>
          </button>
          {openSections.includes('size') && (
            <div className="mt-4 flex flex-wrap gap-2">
              {['50 ml', '100 ml', '150 ml', '200 ml', '250 ml'].map((size) => (
                <button
                  key={size}
                  className="cursor-pointer rounded-full border border-gray-300 px-4 py-2 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-colors hover:border-black hover:bg-black hover:text-white sm:text-[14px] sm:tracking-[-0.84px]"
                >
                  {size}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
