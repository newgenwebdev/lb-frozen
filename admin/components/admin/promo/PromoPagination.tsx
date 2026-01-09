"use client";

import React, { useState, useRef, useEffect } from "react";

type PromoPaginationProps = {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};

export function PromoPagination({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PromoPaginationProps): React.JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderPageNumbers = (): React.ReactNode[] => {
    const pages: React.ReactNode[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`h-10 w-10 cursor-pointer rounded-lg font-public text-[14px] font-medium transition-colors ${
              currentPage === i
                ? "bg-[#030712] text-white"
                : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
            }`}
          >
            {i}
          </button>
        );
      }
    } else {
      // Always show first page
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className={`h-10 w-10 cursor-pointer rounded-lg font-public text-[14px] font-medium transition-colors ${
            currentPage === 1
              ? "bg-[#030712] text-white"
              : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
          }`}
        >
          1
        </button>
      );

      // Show second page
      pages.push(
        <button
          key={2}
          onClick={() => onPageChange(2)}
          className={`h-10 w-10 cursor-pointer rounded-lg font-public text-[14px] font-medium transition-colors ${
            currentPage === 2
              ? "bg-[#030712] text-white"
              : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
          }`}
        >
          2
        </button>
      );

      // Show third page
      pages.push(
        <button
          key={3}
          onClick={() => onPageChange(3)}
          className={`h-10 w-10 cursor-pointer rounded-lg font-public text-[14px] font-medium transition-colors ${
            currentPage === 3
              ? "bg-[#030712] text-white"
              : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
          }`}
        >
          3
        </button>
      );

      // Show ellipsis
      if (currentPage < totalPages - 2) {
        pages.push(
          <span
            key="ellipsis"
            className="flex h-10 w-10 items-center justify-center text-[#6A7282]"
          >
            ..
          </span>
        );
      }

      // Always show last page
      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`h-10 w-10 cursor-pointer rounded-lg font-public text-[14px] font-medium transition-colors ${
            currentPage === totalPages
              ? "bg-[#030712] text-white"
              : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="mt-6 rounded-lg border border-[#E5E7EB] bg-white">
      <div className="flex flex-col items-center justify-between gap-4 px-6 py-4 sm:flex-row">
        {/* Page Info */}
        <div className="font-public text-[14px] text-[#6A7282]">
          Page {currentPage} of {totalPages}
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`rounded-lg px-3 py-2 font-public text-[14px] font-medium transition-colors ${
              currentPage === 1
                ? "cursor-not-allowed bg-[#F9FAFB] text-[#D1D5DB]"
                : "cursor-pointer border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
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
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">{renderPageNumbers()}</div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`rounded-lg px-3 py-2 font-public text-[14px] font-medium transition-colors ${
              currentPage === totalPages
                ? "cursor-not-allowed bg-[#F9FAFB] text-[#D1D5DB]"
                : "cursor-pointer border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
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
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Items Per Page Dropdown */}
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <span className="font-public text-[14px] text-[#6A7282]">
            {itemsPerPage} data per row
          </span>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="cursor-pointer rounded p-2 transition-colors hover:bg-[#F9FAFB]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
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

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute bottom-full right-0 z-10 mb-2 w-[140px] rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
              <div className="py-1">
                {[10, 20, 50, 100].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      onItemsPerPageChange(num);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full cursor-pointer px-4 py-2 text-left font-public text-[14px] transition-colors ${
                      itemsPerPage === num
                        ? "bg-[#F9FAFB] font-medium text-[#030712]"
                        : "text-[#030712] hover:bg-[#F9FAFB]"
                    }`}
                  >
                    {num} per page
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
