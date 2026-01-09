import React from "react";
import { ReturnCard } from "./ReturnCard";
import type { Return } from "@/lib/validators/return";

type ReturnsListProps = {
  returns: Return[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  totalReturns: number;
  returnsPerPage: number;
  onPageChange: (page: number) => void;
  onViewDetails?: (returnItem: Return) => void;
};

export function ReturnsList({
  returns,
  isLoading,
  currentPage,
  totalPages,
  totalReturns,
  returnsPerPage,
  onPageChange,
  onViewDetails,
}: ReturnsListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100"></div>
        ))}
      </div>
    );
  }

  if (!returns || returns.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg bg-white p-8">
        <div className="text-center">
          <div className="mb-4 text-[48px]">📦</div>
          <h3 className="mb-2 font-geist text-[18px] font-medium text-[#030712]">No returns found</h3>
          <p className="font-public text-[14px] text-[#6A7282]">Try adjusting your search or filter criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Returns List */}
      <div className="mb-6 space-y-4">
        {returns.map((returnItem, index) => (
          <ReturnCard
            key={returnItem.id}
            returnItem={returnItem}
            index={index}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg bg-white p-4">
          <div className="font-public text-[14px] text-[#6A7282]">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`cursor-pointer rounded-lg border px-4 py-2 font-public text-[14px] font-medium transition-colors ${
                currentPage === 1
                  ? "cursor-not-allowed border-[#E5E7EB] bg-[#F9FAFB] text-[#D1D5DB]"
                  : "border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
              }`}
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="hidden items-center gap-1 sm:flex">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`h-10 w-10 cursor-pointer rounded-lg font-public text-[14px] font-medium transition-colors ${
                        currentPage === page
                          ? "bg-[#030712] text-white"
                          : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  (page === currentPage - 2 && page > 1) ||
                  (page === currentPage + 2 && page < totalPages)
                ) {
                  return (
                    <span key={page} className="px-2 text-[#6A7282]">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`cursor-pointer rounded-lg border px-4 py-2 font-public text-[14px] font-medium transition-colors ${
                currentPage === totalPages
                  ? "cursor-not-allowed border-[#E5E7EB] bg-[#F9FAFB] text-[#D1D5DB]"
                  : "border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
              }`}
            >
              Next
            </button>
          </div>

          {/* Rows per page info */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="font-public text-[14px] text-[#6A7282]">{returnsPerPage} data per row</span>
          </div>
        </div>
      )}
    </div>
  );
}
