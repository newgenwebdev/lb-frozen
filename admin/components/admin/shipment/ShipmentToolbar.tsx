"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";
import type { ShippingOptionStatus } from "@/lib/types/shipping-option";

type ShipmentToolbarProps = {
  onAddClick: () => void;
  filterStatus: ShippingOptionStatus | "all";
  onFilterStatusChange: (status: ShippingOptionStatus | "all") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

export function ShipmentToolbar({
  onAddClick,
  filterStatus,
  onFilterStatusChange,
  searchQuery,
  onSearchChange,
}: ShipmentToolbarProps): React.JSX.Element {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusOptions: { value: ShippingOptionStatus | "all"; label: string }[] = [
    { value: "all", label: "All Status" },
    { value: "Active", label: "Active" },
    { value: "Non Active", label: "Non Active" },
  ];

  const hasActiveFilters = filterStatus !== "all" || searchQuery.trim() !== "";

  const handleClearFilters = (): void => {
    onFilterStatusChange("all");
    onSearchChange("");
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Shipment List
        </h1>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {/* Filter Button */}
          <div className="relative" ref={filterRef}>
            <Button
              ref={filterButtonRef}
              variant="secondary"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M12 3.33333H14"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 3.33333H9.33333"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.66602 8.00033H13.9993"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 8.00033H4"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 12.6663H14"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12.6663H9.33333"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.6082 2.39052C12.1289 2.91122 12.1289 3.75544 11.6082 4.27614C11.0875 4.79684 10.2433 4.79684 9.72256 4.27614C9.20186 3.75545 9.20186 2.91122 9.72256 2.39052C10.2433 1.86983 11.0875 1.86983 11.6082 2.39052"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.27614 7.05752C6.79684 7.57822 6.79684 8.42244 6.27614 8.94314C5.75545 9.46384 4.91122 9.46384 4.39052 8.94314C3.86983 8.42244 3.86983 7.57822 4.39052 7.05752C4.91122 6.53682 5.75544 6.53682 6.27614 7.05752"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.6082 11.7235C12.1289 12.2442 12.1289 13.0885 11.6082 13.6092C11.0875 14.1299 10.2433 14.1299 9.72256 13.6092C9.20186 13.0885 9.20186 12.2442 9.72256 11.7235C10.2433 11.2028 11.0875 11.2028 11.6082 11.7235"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              Filter
              {hasActiveFilters && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white">
                  {(filterStatus !== "all" ? 1 : 0) + (searchQuery.trim() ? 1 : 0)}
                </span>
              )}
            </Button>

            {/* Filter Dropdown */}
            {isFilterOpen && typeof document !== "undefined" && createPortal(
              <div
                className="fixed z-50 w-72 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-lg"
                style={{
                  top: (filterButtonRef.current?.getBoundingClientRect().bottom ?? 0) + 8,
                  left: filterButtonRef.current?.getBoundingClientRect().left ?? 0,
                }}
              >
                {/* Search Input */}
                <div className="mb-4">
                  <label className="mb-2 block font-geist text-[12px] font-medium text-[#6A7282]">
                    Search
                  </label>
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
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder="Search by name, ID, or ETA..."
                      className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-3 font-public text-[14px] text-[#030712] placeholder:text-[#9CA3AF] focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="mb-4">
                  <label className="mb-2 block font-geist text-[12px] font-medium text-[#6A7282]">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onFilterStatusChange(option.value)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 font-public text-[12px] font-medium transition-colors ${
                          filterStatus === option.value
                            ? "bg-black text-white"
                            : "bg-[#F3F4F6] text-[#030712] hover:bg-[#E5E7EB]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-4">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    disabled={!hasActiveFilters}
                    className={`cursor-pointer font-public text-[14px] font-medium ${
                      hasActiveFilters
                        ? "text-[#030712] hover:text-[#6A7282]"
                        : "cursor-not-allowed text-[#9CA3AF]"
                    }`}
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="cursor-pointer rounded-lg bg-black px-4 py-2 font-public text-[14px] font-medium text-white hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>

          <Button
            variant="primary"
            onClick={onAddClick}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8 3.33333V12.6667"
                  stroke="white"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.33398 8H12.6673"
                  stroke="white"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            Add new shipment
          </Button>
        </div>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-public text-[12px] text-[#6A7282]">Active filters:</span>
          {filterStatus !== "all" && (
            <span className="flex items-center gap-1 rounded-full bg-[#F3F4F6] px-3 py-1 font-public text-[12px] text-[#030712]">
              Status: {filterStatus}
              <button
                type="button"
                onClick={() => onFilterStatusChange("all")}
                className="ml-1 cursor-pointer text-[#6A7282] hover:text-[#030712]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </span>
          )}
          {searchQuery.trim() && (
            <span className="flex items-center gap-1 rounded-full bg-[#F3F4F6] px-3 py-1 font-public text-[12px] text-[#030712]">
              Search: &quot;{searchQuery}&quot;
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="ml-1 cursor-pointer text-[#6A7282] hover:text-[#030712]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

