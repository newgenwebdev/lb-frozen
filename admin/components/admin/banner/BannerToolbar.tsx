"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";

type StatusFilter = "active" | "non_active" | "all";

type BannerToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onFilterChange: (value: StatusFilter) => void;
  onAddClick: () => void;
};

const statusFilterOptions = [
  { value: "all" as const, label: "All Banners" },
  { value: "active" as const, label: "Active", description: "Currently within date range" },
  { value: "non_active" as const, label: "Inactive", description: "Outside date range or disabled" },
];

export function BannerToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onFilterChange,
  onAddClick,
}: BannerToolbarProps): React.JSX.Element {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState<StatusFilter>(statusFilter);
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

  // Sync temp value when prop changes
  useEffect(() => {
    setTempStatusFilter(statusFilter);
  }, [statusFilter]);

  const handleApplyFilter = (): void => {
    onFilterChange(tempStatusFilter);
    setIsFilterOpen(false);
  };

  const handleResetFilter = (): void => {
    setTempStatusFilter("all");
  };

  const hasActiveFilter = statusFilter !== "all";

  const getActiveFilterLabel = (): string => {
    const option = statusFilterOptions.find((o) => o.value === statusFilter);
    return option?.label || "All Banners";
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Page Title */}
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Banner List
        </h1>

        {/* Action Buttons */}
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A7282]"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 14L11.1 11.1"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search banners..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 font-public text-[14px] text-[#030712] placeholder-[#6A7282] focus:border-[#030712] focus:outline-none sm:w-[200px]"
            />
          </div>

          {/* Filter Popover */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 transition-colors sm:w-auto ${
                hasActiveFilter
                  ? "border-[#030712] bg-[#030712] text-white"
                  : "border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 3.33333H14"
                  stroke={hasActiveFilter ? "white" : "#030712"}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 3.33333H9.33333"
                  stroke={hasActiveFilter ? "white" : "#030712"}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.66602 8.00033H13.9993"
                  stroke={hasActiveFilter ? "white" : "#030712"}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 8.00033H4"
                  stroke={hasActiveFilter ? "white" : "#030712"}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 12.6663H14"
                  stroke={hasActiveFilter ? "white" : "#030712"}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12.6663H9.33333"
                  stroke={hasActiveFilter ? "white" : "#030712"}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.6082 2.39052C12.1289 2.91122 12.1289 3.75544 11.6082 4.27614C11.0875 4.79684 10.2433 4.79684 9.72256 4.27614C9.20186 3.75545 9.20186 2.91122 9.72256 2.39052C10.2433 1.86983 11.0875 1.86983 11.6082 2.39052"
                  stroke={hasActiveFilter ? "white" : "#030712"}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.27614 7.05752C6.79684 7.57822 6.79684 8.42244 6.27614 8.94314C5.75545 9.46384 4.91122 9.46384 4.39052 8.94314C3.86983 8.42244 3.86983 7.57822 4.39052 7.05752C4.91122 6.53682 5.75544 6.53682 6.27614 7.05752"
                  stroke={hasActiveFilter ? "white" : "#030712"}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.6082 11.7235C12.1289 12.2442 12.1289 13.0885 11.6082 13.6092C11.0875 14.1299 10.2433 14.1299 9.72256 13.6092C9.20186 13.0885 9.20186 12.2442 9.72256 11.7235C10.2433 11.2028 11.0875 11.2028 11.6082 11.7235"
                  stroke={hasActiveFilter ? "white" : "#030712"}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-geist text-[14px] font-medium">
                {hasActiveFilter ? getActiveFilterLabel() : "Filter"}
              </span>
              {hasActiveFilter && (
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
                  <h3 className="font-geist text-[16px] font-semibold text-[#030712]">Filter Banners</h3>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#030712]"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11 3L3 11M3 3L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                {/* Status Filter Options - Pill buttons */}
                <div className="mb-5">
                  <label className="mb-3 block font-geist text-[13px] font-medium text-[#374151]">Banner Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusFilterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTempStatusFilter(option.value)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                          tempStatusFilter === option.value
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

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleResetFilter}
                    className="cursor-pointer rounded-lg border border-[#FCA5A5] px-4 py-2 font-geist text-[14px] font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleApplyFilter}
                    className="cursor-pointer rounded-lg bg-[#030712] px-6 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937]"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add New Banner Button */}
          <Button
            variant="primary"
            onClick={onAddClick}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.33333V12.6667" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.33398 8H12.6673" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          >
            Add new banner
          </Button>
        </div>
      </div>
    </div>
  );
}

