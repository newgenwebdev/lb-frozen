import React, { useState, useRef, useEffect } from "react";

type ShipmentPaginationProps = {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
};

export function ShipmentPagination({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
}: ShipmentPaginationProps): React.JSX.Element {
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

  const getPageNumbers = (): (number | string)[] => {
    const pageNumbers: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      if (currentPage > 3) {
        pageNumbers.push("...");
      }
      if (currentPage > 2 && currentPage < totalPages - 1) {
        pageNumbers.push(currentPage - 1);
      }
      if (currentPage > 1 && currentPage < totalPages) {
        pageNumbers.push(currentPage);
      }
      if (currentPage < totalPages - 1 && currentPage > 2) {
        pageNumbers.push(currentPage + 1);
      }
      if (currentPage < totalPages - 2) {
        pageNumbers.push("...");
      }
      pageNumbers.push(totalPages);
    }

    const uniquePageNumbers: (number | string)[] = [];
    pageNumbers.forEach((num) => {
      if (uniquePageNumbers.length === 0 || uniquePageNumbers[uniquePageNumbers.length - 1] !== num) {
        uniquePageNumbers.push(num);
      }
    });

    return uniquePageNumbers;
  };

  return (
    <div className="mt-6 bg-white rounded-lg border border-[#E5E7EB]">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4">
        <div className="font-public text-[14px] text-[#6A7282]">
          Page {currentPage} of {totalPages || 1}
        </div>

        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-2 rounded-lg font-public text-[14px] font-medium ${
              currentPage === 1
                ? "bg-[#F9FAFB] text-[#D1D5DB] cursor-not-allowed"
                : "bg-white border border-[#E5E7EB] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
            }`}
          >
            Previous
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) =>
              typeof page === "number" ? (
                <button
                  key={index}
                  onClick={() => onPageChange(page)}
                  className={`w-10 h-10 rounded-lg font-public text-[14px] font-medium cursor-pointer transition-colors ${
                    currentPage === page
                      ? "bg-[#030712] text-white"
                      : "bg-white border border-[#E5E7EB] text-[#030712] hover:bg-[#F9FAFB]"
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span key={index} className="px-2 text-[#6A7282]">
                  {page}
                </span>
              )
            )}
          </div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 rounded-lg font-public text-[14px] font-medium ${
              currentPage === totalPages
                ? "bg-[#F9FAFB] text-[#D1D5DB] cursor-not-allowed"
                : "bg-white border border-[#E5E7EB] text-[#030712] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
            }`}
          >
            Next
          </button>
        </div>

        {/* Items Per Page */}
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
            <div className="absolute bottom-full right-0 mb-2 w-[120px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10">
              <div className="py-1">
                {itemsPerPageOptions.map((num) => (
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

