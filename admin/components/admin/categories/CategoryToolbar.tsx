"use client"

import React, { useState, useRef, useEffect } from "react"
import { SearchInput, DropdownMenu, Button } from "@/components/ui"

type CategoryToolbarProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  filterBy: string
  onFilterChange: (value: string) => void
  onAddCategory: () => void
}

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
]

const filterOptions = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "non_active", label: "Non Active" },
]

export function CategoryToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  onAddCategory,
}: CategoryToolbarProps): React.JSX.Element {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [tempFilter, setTempFilter] = useState(filterBy)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false)
      }
    }

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isFilterOpen])

  // Sync temp values when props change
  useEffect(() => {
    setTempFilter(filterBy)
  }, [filterBy])

  const handleApplyFilters = (): void => {
    onFilterChange(tempFilter)
    setIsFilterOpen(false)
  }

  const handleResetFilters = (): void => {
    setTempFilter("all")
  }

  const hasActiveFilters = filterBy !== "all"

  // Get active filter label
  const getActiveFilterLabel = (): string => {
    const filter = filterOptions.find((f) => f.value === filterBy)
    return filter?.label || "All Status"
  }

  return (
    <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
      {/* Left: Title */}
      <h2 className="font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712]">
        Categories
      </h2>

      {/* Right: Search, Sort, Filter, Add Button */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Search data"
          value={searchQuery}
          onChange={onSearchChange}
        />

        <DropdownMenu
          items={sortOptions}
          value={sortBy}
          onChange={onSortChange}
          title="Sort by"
          className="w-full sm:w-[180px]"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M10.9297 9.66602H13.737L10.9297 12.9993H13.737"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14.0013 6.33333L12.3346 3L10.668 6.33333"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.9453 5.77474H13.72"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 13.0003H2"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 9.66732H2"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 6.33333H2"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 3.00033H2"
                stroke="#030712"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />

        {/* Filter Popover */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 transition-colors sm:w-auto ${
              hasActiveFilters
                ? "border-[#030712] bg-[#030712] text-white"
                : "border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M12 3.33333H14"
                stroke={hasActiveFilters ? "white" : "#030712"}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 3.33333H9.33333"
                stroke={hasActiveFilters ? "white" : "#030712"}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.66602 8.00033H13.9993"
                stroke={hasActiveFilters ? "white" : "#030712"}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 8.00033H4"
                stroke={hasActiveFilters ? "white" : "#030712"}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 12.6663H14"
                stroke={hasActiveFilters ? "white" : "#030712"}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12.6663H9.33333"
                stroke={hasActiveFilters ? "white" : "#030712"}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.6082 2.39052C12.1289 2.91122 12.1289 3.75544 11.6082 4.27614C11.0875 4.79684 10.2433 4.79684 9.72256 4.27614C9.20186 3.75545 9.20186 2.91122 9.72256 2.39052C10.2433 1.86983 11.0875 1.86983 11.6082 2.39052"
                stroke={hasActiveFilters ? "white" : "#030712"}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.27614 7.05752C6.79684 7.57822 6.79684 8.42244 6.27614 8.94314C5.75545 9.46384 4.91122 9.46384 4.39052 8.94314C3.86983 8.42244 3.86983 7.57822 4.39052 7.05752C4.91122 6.53682 5.75544 6.53682 6.27614 7.05752"
                stroke={hasActiveFilters ? "white" : "#030712"}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.6082 11.7235C12.1289 12.2442 12.1289 13.0885 11.6082 13.6092C11.0875 14.1299 10.2433 14.1299 9.72256 13.6092C9.20186 13.0885 9.20186 12.2442 9.72256 11.7235C10.2433 11.2028 11.0875 11.2028 11.6082 11.7235"
                stroke={hasActiveFilters ? "white" : "#030712"}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-geist text-[14px] font-medium">
              {hasActiveFilters ? getActiveFilterLabel() : "Filter"}
            </span>
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-medium text-[#030712]">
                1
              </span>
            )}
          </button>

          {/* Filter Popover Content */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-lg">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-geist text-[16px] font-semibold text-[#030712]">
                  Filter Categories
                </h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#030712]"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11 3L3 11M3 3L11 11"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Status Filter Options - Pill buttons */}
              <div className="mb-5">
                <label className="mb-3 block font-geist text-[13px] font-medium text-[#374151]">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTempFilter(option.value)}
                      className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        tempFilter === option.value
                          ? "bg-[#030712] text-white"
                          : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleResetFilters}
                  className="cursor-pointer rounded-lg border border-[#FCA5A5] px-4 py-2 font-geist text-[14px] font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="cursor-pointer rounded-lg bg-[#030712] px-6 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937]"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Category Button */}
        <Button
          variant="primary"
          onClick={onAddCategory}
          icon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 3.33333V12.6667"
                stroke="white"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3.33301 8H12.6663"
                stroke="white"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        >
          Add new category
        </Button>
      </div>
    </div>
  )
}
