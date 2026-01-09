"use client";

import React, { useState, useRef, useEffect } from "react";
import { SearchInput, DropdownMenu, Button } from "@/components/ui";

type OrderToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  filterBy: string;
  onFilterChange: (value: string) => void;
  dateRange?: string;
  onDateRangeChange?: (value: string) => void;
  onExport: () => void;
  isExporting?: boolean;
};

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Highest Amount" },
  { value: "lowest", label: "Lowest Amount" },
];

// Smart filter combinations that make operational sense
const smartFilterOptions = [
  { value: "all", label: "All Orders" },
  { value: "ready_to_ship", label: "Ready to Ship", description: "Paid & unfulfilled" },
  { value: "in_transit", label: "In Transit", description: "Shipped" },
  { value: "delivered", label: "Completed", description: "Delivered" },
  { value: "awaiting_payment", label: "Awaiting Payment", description: "Unpaid" },
  { value: "cancelled", label: "Cancelled" },
];

const dateRangeOptions = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

export function OrderToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  dateRange = "all",
  onDateRangeChange,
  onExport,
  isExporting = false,
}: OrderToolbarProps): React.JSX.Element {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempSmartFilter, setTempSmartFilter] = useState(filterBy);
  const [tempDateRange, setTempDateRange] = useState(dateRange);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  // Sync temp values when props change
  useEffect(() => {
    setTempSmartFilter(filterBy);
  }, [filterBy]);

  useEffect(() => {
    setTempDateRange(dateRange);
  }, [dateRange]);

  const handleApplyFilters = (): void => {
    onFilterChange(tempSmartFilter);
    onDateRangeChange?.(tempDateRange);
    setIsFilterOpen(false);
  };

  const handleResetFilters = (): void => {
    setTempSmartFilter("all");
    setTempDateRange("all");
  };

  const hasActiveFilters = filterBy !== "all" || dateRange !== "all";

  // Get active filter label
  const getActiveFilterLabel = (): string => {
    const filter = smartFilterOptions.find(f => f.value === filterBy);
    return filter?.label || "All Orders";
  };

  return (
    <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
      {/* Left: Search */}
      <div className="w-full sm:w-auto sm:flex-1 sm:max-w-sm">
        <SearchInput placeholder="Search orders" value={searchQuery} onChange={onSearchChange} />
      </div>

      {/* Right: Actions */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <DropdownMenu
          items={sortOptions}
          value={sortBy}
          onChange={onSortChange}
          title="Sort by"
          className="w-full sm:w-[180px]"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
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
              <path d="M10.9453 5.77474H13.72" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 13.0003H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 9.66732H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 6.33333H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 3.00033H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />

        {/* Filter Popover */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 transition-colors sm:w-auto ${
              hasActiveFilters
                ? "border-[#030712] bg-[#030712] text-white"
                : "border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
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
                {(filterBy !== "all" ? 1 : 0) + (dateRange !== "all" ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Filter Popover Content */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[340px] rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-lg">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-geist text-[16px] font-semibold text-[#030712]">Filter Orders</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#030712]"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 3L3 11M3 3L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Smart Filter Options - Pill buttons */}
              <div className="mb-5">
                <label className="mb-3 block font-geist text-[13px] font-medium text-[#374151]">Order Status</label>
                <div className="flex flex-wrap gap-2">
                  {smartFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTempSmartFilter(option.value)}
                      className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        tempSmartFilter === option.value
                          ? "bg-[#030712] text-white"
                          : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                      }`}
                      title={option.description}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="mb-5">
                <label className="mb-2 block font-geist text-[13px] font-medium text-[#374151]">Date Range</label>
                <div className="relative">
                  <select
                    value={tempDateRange}
                    onChange={(e) => setTempDateRange(e.target.value)}
                    className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-[#E5E7EB] bg-white px-3 pr-8 font-geist text-[14px] text-[#030712] transition-colors hover:border-[#D1D5DB] focus:border-[#030712] focus:outline-none"
                  >
                    {dateRangeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleResetFilters}
                  className="rounded-lg border border-[#FCA5A5] px-4 py-2 font-geist text-[14px] font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="rounded-lg bg-[#030712] px-6 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937]"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        <Button
          variant="primary"
          onClick={onExport}
          disabled={isExporting}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.99935 11.3333V2" stroke="white" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.3327 13.9998H2.66602" stroke="white" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M11.3333 8L7.99935 11.334L4.66602 8"
                stroke="white"
                strokeWidth="0.833333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        >
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>
    </div>
  );
}
