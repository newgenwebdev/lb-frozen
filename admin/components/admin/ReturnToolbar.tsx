"use client";

import React, { useState, useRef, useEffect } from "react";
import { SearchInput, DropdownMenu, Button } from "@/components/ui";

type ReturnToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterBy: string;
  onFilterChange: (value: string) => void;
  returnType: string;
  onReturnTypeChange: (value: string) => void;
  dateRange?: string;
  onDateRangeChange?: (value: string) => void;
  onCreateReturn?: () => void;
};

// Return status filter options
const statusFilterOptions = [
  { value: "all", label: "All Returns" },
  { value: "requested", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "in_transit", label: "In Transit" },
  { value: "received", label: "Received" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

// Return type filter options
const returnTypeOptions = [
  { value: "all", label: "All Types" },
  { value: "refund", label: "Refund" },
  { value: "replacement", label: "Replacement" },
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

export function ReturnToolbar({
  searchQuery,
  onSearchChange,
  filterBy,
  onFilterChange,
  returnType,
  onReturnTypeChange,
  dateRange = "all",
  onDateRangeChange,
  onCreateReturn,
}: ReturnToolbarProps): React.JSX.Element {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState(filterBy);
  const [tempReturnType, setTempReturnType] = useState(returnType);
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
    setTempStatusFilter(filterBy);
  }, [filterBy]);

  useEffect(() => {
    setTempReturnType(returnType);
  }, [returnType]);

  useEffect(() => {
    setTempDateRange(dateRange);
  }, [dateRange]);

  const handleApplyFilters = (): void => {
    onFilterChange(tempStatusFilter);
    onReturnTypeChange(tempReturnType);
    onDateRangeChange?.(tempDateRange);
    setIsFilterOpen(false);
  };

  const handleResetFilters = (): void => {
    setTempStatusFilter("all");
    setTempReturnType("all");
    setTempDateRange("all");
  };

  const hasActiveFilters = filterBy !== "all" || returnType !== "all" || dateRange !== "all";

  // Get active filter label
  const getActiveFilterLabel = (): string => {
    const filter = statusFilterOptions.find(f => f.value === filterBy);
    return filter?.label || "All Returns";
  };

  const activeFilterCount = (filterBy !== "all" ? 1 : 0) + (returnType !== "all" ? 1 : 0) + (dateRange !== "all" ? 1 : 0);

  return (
    <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
      {/* Left: Search */}
      <div className="w-full sm:w-auto sm:flex-1 sm:max-w-sm">
        <SearchInput placeholder="Search returns..." value={searchQuery} onChange={onSearchChange} />
      </div>

      {/* Right: Actions */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
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
            </svg>
            <span className="font-geist text-[14px] font-medium">
              {hasActiveFilters ? getActiveFilterLabel() : "Filter"}
            </span>
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-medium text-[#030712]">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filter Popover Content */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[340px] rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-lg">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-geist text-[16px] font-semibold text-[#030712]">Filter Returns</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#030712]"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 3L3 11M3 3L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Status Filter Options - Pill buttons */}
              <div className="mb-5">
                <label className="mb-3 block font-geist text-[13px] font-medium text-[#374151]">Return Status</label>
                <div className="flex flex-wrap gap-2">
                  {statusFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTempStatusFilter(option.value)}
                      className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        tempStatusFilter === option.value
                          ? "bg-[#030712] text-white"
                          : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Return Type */}
              <div className="mb-5">
                <label className="mb-3 block font-geist text-[13px] font-medium text-[#374151]">Return Type</label>
                <div className="flex flex-wrap gap-2">
                  {returnTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTempReturnType(option.value)}
                      className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        tempReturnType === option.value
                          ? "bg-[#030712] text-white"
                          : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                      }`}
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

        {onCreateReturn && (
          <Button
            variant="primary"
            onClick={onCreateReturn}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.33301V12.6663" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.33301 8H12.6663" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            Create Return
          </Button>
        )}
      </div>
    </div>
  );
}
