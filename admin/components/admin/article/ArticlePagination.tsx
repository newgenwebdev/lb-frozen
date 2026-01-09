import React, { useState, useRef, useEffect } from "react";

type ArticlePaginationProps = {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};

export function ArticlePagination({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: ArticlePaginationProps): React.JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderPageNumbers = (): React.ReactNode[] => {
    const pages: React.ReactNode[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`h-10 w-10 rounded-lg font-public text-[14px] font-medium cursor-pointer transition-colors ${
              currentPage === i
                ? "bg-[#030712] text-white"
                : "bg-white border border-[#E5E7EB] text-[#030712] hover:bg-[#F9FAFB]"
            }`}
          >
            {i}
          </button>
        );
      }
    } else {
      pages.push(
        <button
          key={1}
          onClick={() => onPageChange(1)}
          className={`h-10 w-10 rounded-lg font-public text-[14px] font-medium cursor-pointer transition-colors ${
            currentPage === 1
              ? "bg-[#030712] text-white"
              : "bg-white border border-[#E5E7EB] text-[#030712] hover:bg-[#F9FAFB]"
          }`}
        >
          1
        </button>
      );

      if (currentPage > 3) {
        pages.push(
          <span key="ellipsis-start" className="px-2 text-[#6A7282]">
            ...
          </span>
        );
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`h-10 w-10 rounded-lg font-public text-[14px] font-medium cursor-pointer transition-colors ${
                currentPage === i
                  ? "bg-[#030712] text-white"
                  : "bg-white border border-[#E5E7EB] text-[#030712] hover:bg-[#F9FAFB]"
              }`}
            >
              {i}
            </button>
          );
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push(
          <span key="ellipsis-end" className="px-2 text-[#6A7282]">
            ...
          </span>
        );
      }

      pages.push(
        <button
          key={totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`h-10 w-10 rounded-lg font-public text-[14px] font-medium cursor-pointer transition-colors ${
            currentPage === totalPages
              ? "bg-[#030712] text-white"
              : "bg-white border border-[#E5E7EB] text-[#030712] hover:bg-[#F9FAFB]"
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="mt-6 bg-white rounded-lg border border-[#E5E7EB]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4">
        <div className="font-public text-[14px] text-[#6A7282]">
          Page {currentPage} of {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-2 rounded-lg font-public text-[14px] font-medium transition-colors ${
              currentPage === 1
                ? "bg-[#F9FAFB] text-[#D1D5DB] cursor-not-allowed"
                : "bg-white border border-[#E5E7EB] text-[#030712] cursor-pointer hover:bg-[#F9FAFB]"
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

          <div className="flex items-center gap-1">{renderPageNumbers()}</div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 rounded-lg font-public text-[14px] font-medium transition-colors ${
              currentPage === totalPages
                ? "bg-[#F9FAFB] text-[#D1D5DB] cursor-not-allowed"
                : "bg-white border border-[#E5E7EB] text-[#030712] cursor-pointer hover:bg-[#F9FAFB]"
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

        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <span className="font-public text-[14px] text-[#6A7282]">{itemsPerPage} data per row</span>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-2 rounded cursor-pointer hover:bg-[#F9FAFB] transition-colors"
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

          {isDropdownOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-[140px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
              <div className="py-1">
                {[10, 20, 50, 100].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      onItemsPerPageChange(num);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left font-public text-[14px] cursor-pointer transition-colors ${
                      itemsPerPage === num
                        ? "bg-[#F9FAFB] text-[#030712] font-medium"
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
