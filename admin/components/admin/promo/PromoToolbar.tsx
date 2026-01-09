"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button, SearchInput } from "@/components/ui";
import type { PromoTab, PromoStatus } from "@/lib/types/promo";

type PromoFilter = {
  status: PromoStatus | "all";
  type: "percentage" | "fixed" | "all";
};

type PromoToolbarProps = {
  activeTab: PromoTab;
  onTabChange: (tab: PromoTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onFilterClick: () => void;
  onAddClick: () => void;
  filter?: PromoFilter;
  onFilterChange?: (filter: PromoFilter) => void;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "code_asc", label: "Code A-Z" },
  { value: "code_desc", label: "Code Z-A" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "non-active", label: "Non Active" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "percentage", label: "%" },
  { value: "fixed", label: "Fixed" },
];

export function PromoToolbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onFilterClick,
  onAddClick,
  filter,
  onFilterChange,
}: PromoToolbarProps): React.JSX.Element {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterPosition, setFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const [tempFilter, setTempFilter] = useState<PromoFilter>({
    status: filter?.status || "all",
    type: filter?.type || "all",
  });
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
        setIsStatusDropdownOpen(false);
        setIsTypeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterButtonClick = (): void => {
    if (isFilterOpen) {
      setIsFilterOpen(false);
    } else {
      if (filterButtonRef.current) {
        const rect = filterButtonRef.current.getBoundingClientRect();
        setFilterPosition({
          top: rect.bottom + 8,
          left: rect.right - 320, // 320px is the filter popup width
        });
      }
      setTempFilter({
        status: filter?.status || "all",
        type: filter?.type || "all",
      });
      setIsFilterOpen(true);
    }
    onFilterClick();
  };

  const handleApplyFilter = (): void => {
    onFilterChange?.(tempFilter);
    setIsFilterOpen(false);
  };

  const handleResetFilter = (): void => {
    const resetFilter: PromoFilter = { status: "all", type: "all" };
    setTempFilter(resetFilter);
    onFilterChange?.(resetFilter);
  };

  const getStatusLabel = (value: string): string => {
    return STATUS_OPTIONS.find((opt) => opt.value === value)?.label || "All";
  };

  const getTypeLabel = (value: string): string => {
    return TYPE_OPTIONS.find((opt) => opt.value === value)?.label || "All";
  };

  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || "Sort by";

  return (
    <div className="mb-6">
      {/* Title and Actions Row */}
      <div className="mb-4 flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Page Title */}
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Promo
        </h1>

        {/* Right Section: Search, Sort, Filter, Add */}
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <SearchInput
            placeholder="Search data"
            value={searchQuery}
            onChange={onSearchChange}
          />

          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <Button
              variant="secondary"
              onClick={() => setIsSortOpen(!isSortOpen)}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M2 4H14"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 8H12"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 12H10"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              {currentSortLabel}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={`transition-transform ${isSortOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="#030712"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>

            {/* Sort Dropdown Menu */}
            {isSortOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[160px] rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                <div className="py-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onSortChange(option.value);
                        setIsSortOpen(false);
                      }}
                      className={`w-full cursor-pointer px-4 py-2 text-left font-public text-[14px] transition-colors ${
                        sortBy === option.value
                          ? "bg-[#F9FAFB] font-medium text-[#030712]"
                          : "text-[#030712] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Button */}
          <button
            ref={filterButtonRef}
            onClick={handleFilterButtonClick}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
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
            Filter
          </button>

          {/* Add New Promo Button */}
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
            Add new promo
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => onTabChange("coupons")}
          className={`cursor-pointer rounded-full px-4 py-2 font-geist text-[14px] font-medium transition-colors ${
            activeTab === "coupons"
              ? "bg-[#030712] text-white"
              : "bg-white text-[#030712] hover:bg-[#F9FAFB]"
          }`}
        >
          Coupons
        </button>
        <button
          onClick={() => onTabChange("pwp-rules")}
          className={`cursor-pointer rounded-full px-4 py-2 font-geist text-[14px] font-medium transition-colors ${
            activeTab === "pwp-rules"
              ? "bg-[#030712] text-white"
              : "bg-white text-[#030712] hover:bg-[#F9FAFB]"
          }`}
        >
          PWP Rules
        </button>
      </div>

      {/* Filter Popup Portal */}
      {isFilterOpen && filterPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={filterRef}
          className="fixed w-[320px] rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl z-[9999]"
          style={{
            top: filterPosition.top,
            left: Math.max(16, filterPosition.left),
          }}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-geist text-[18px] font-semibold text-[#030712]">
              Filter
            </h3>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="cursor-pointer text-[#6A7282] transition-colors hover:text-[#030712]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Status Dropdown */}
          <div className="mb-4">
            <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
              Status
            </label>
            <div className="relative">
              <button
                onClick={() => {
                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  setIsTypeDropdownOpen(false);
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 font-public text-[14px] text-[#030712] transition-colors hover:border-[#030712]"
              >
                <span>{getStatusLabel(tempFilter.status)}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`}
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isStatusDropdownOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTempFilter({ ...tempFilter, status: option.value as PromoFilter["status"] });
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full cursor-pointer px-4 py-2 text-left font-public text-[14px] transition-colors hover:bg-[#F9FAFB] ${
                        tempFilter.status === option.value
                          ? "bg-[#F9FAFB] font-medium text-[#030712]"
                          : "text-[#030712]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Type Dropdown */}
          <div className="mb-8">
            <label className="mb-2 block font-geist text-[14px] font-medium text-[#030712]">
              Type
            </label>
            <div className="relative">
              <button
                onClick={() => {
                  setIsTypeDropdownOpen(!isTypeDropdownOpen);
                  setIsStatusDropdownOpen(false);
                }}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 font-public text-[14px] text-[#030712] transition-colors hover:border-[#030712]"
              >
                <span>{getTypeLabel(tempFilter.type)}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`}
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isTypeDropdownOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTempFilter({ ...tempFilter, type: option.value as PromoFilter["type"] });
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`w-full cursor-pointer px-4 py-2 text-left font-public text-[14px] transition-colors hover:bg-[#F9FAFB] ${
                        tempFilter.type === option.value
                          ? "bg-[#F9FAFB] font-medium text-[#030712]"
                          : "text-[#030712]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleResetFilter}
              className="cursor-pointer rounded-lg border border-[#EF4444] px-6 py-2 font-geist text-[14px] font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
            >
              Reset
            </button>
            <button
              onClick={handleApplyFilter}
              className="cursor-pointer rounded-lg bg-[#030712] px-6 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-[#1f2937]"
            >
              Apply
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
