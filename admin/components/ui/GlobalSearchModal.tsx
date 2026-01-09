"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useGlobalSearch, type SearchResultType, type SearchResult } from "@/hooks/useGlobalSearch";

type GlobalSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Icons for each result type
function ResultTypeIcon({ type }: { type: SearchResultType }): React.JSX.Element {
  switch (type) {
    case "product":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M2.5 17.5H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.33398 17.5001L3.33407 9.12964" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16.7275 17.4999L16.7276 9.11743" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path fillRule="evenodd" clipRule="evenodd" d="M18.1021 6.23138C18.3481 6.69455 18.3969 7.23728 18.2377 7.73694C17.9623 8.60378 17.1488 9.18564 16.2396 9.16619C15.3303 9.14675 14.5424 8.53065 14.3043 7.65284C14.2892 7.60185 14.2423 7.56688 14.1892 7.56688C14.1361 7.56688 14.0892 7.60185 14.0741 7.65284C13.8309 8.54629 13.0197 9.16626 12.0937 9.16616C11.1678 9.16606 10.3566 8.54592 10.1136 7.65241C10.0986 7.60141 10.0517 7.5664 9.99861 7.5664C9.94551 7.5664 9.89861 7.60141 9.88357 7.65241C9.64047 8.54593 8.82917 9.16599 7.90321 9.16595C6.97726 9.16591 6.16599 8.5458 5.923 7.65228C5.90789 7.6013 5.86106 7.56634 5.80798 7.56634C5.75491 7.56634 5.70807 7.6013 5.69297 7.65228C5.45467 8.52999 4.66689 9.14601 3.75765 9.16547C2.84842 9.18495 2.03499 8.60323 1.75951 7.73651C1.60023 7.23676 1.64911 6.69393 1.89511 6.23067L3.31738 3.41519C3.60091 2.85391 4.17619 2.5 4.80501 2.5H15.192C15.8208 2.5 16.396 2.85391 16.6796 3.41519L18.1021 6.23138Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "order":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 9.125L11.75 16.625M15.875 9.125L12.5 3.25M1.25 9.125H18.25M2.5625 9.125L3.9625 15.35C4.04478 15.751 4.26471 16.1109 4.58448 16.3666C4.90424 16.6224 5.30357 16.758 5.7125 16.75H14.0375C14.4464 16.758 14.8458 16.6224 15.1655 16.3666C15.4853 16.1109 15.7052 15.751 15.7875 15.35L17.275 9.125M3.4375 12.8123H16.3125M3.875 9.125L7.375 3.25M7.375 9.125L8.25 16.625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "customer":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 16.5C3.5 13.5 6 11.5 10 11.5C14 11.5 16.5 13.5 16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "category":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <rect x="2.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="11.5" y="2.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="2.5" y="11.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14.5 12v5M12 14.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "coupon":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1.33398" y="7.33594" width="9.33722" height="6.66944" rx="1.33333" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.00195 11.6708L7.00279 9.66992" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "return":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M7.5 3.33333L3.33333 7.5M3.33333 7.5L7.5 11.6667M3.33333 7.5H14.1667C15.2717 7.5 16.3315 7.93899 17.1129 8.72039C17.8943 9.50179 18.3333 10.5616 18.3333 11.6667V17.0833" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return <span />;
  }
}

// Group header icon
function GroupIcon({ type }: { type: SearchResultType }): React.JSX.Element {
  return (
    <div className="flex h-5 w-5 items-center justify-center text-[#6A7282]">
      <ResultTypeIcon type={type} />
    </div>
  );
}

export function GlobalSearchModal({
  isOpen,
  onClose,
}: GlobalSearchModalProps): React.JSX.Element | null {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    totalCount,
    clearSearch,
  } = useGlobalSearch();

  // Flatten results for keyboard navigation
  const flatResults: SearchResult[] = results.flatMap((group) => group.results);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearSearch();
      setSelectedIndex(-1);
    }
  }, [isOpen, clearSearch]);

  // Handle result selection
  const handleSelect = useCallback(
    (result: SearchResult): void => {
      router.push(result.href);
      onClose();
    },
    [router, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatResults.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && flatResults[selectedIndex]) {
            handleSelect(flatResults[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatResults, selectedIndex, handleSelect, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-[600px] mx-4 bg-white rounded-xl shadow-2xl overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-[#E5E7EB] px-4 py-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="shrink-0 text-[#6A7282]"
              >
                <circle
                  cx="9.16667"
                  cy="9.16667"
                  r="5.83333"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M16.6667 16.6667L13.75 13.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, orders, customers..."
                className="flex-1 bg-transparent font-public text-[15px] text-[#030712] placeholder:text-[#9CA3AF] focus:outline-none"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="shrink-0 text-[#6A7282] hover:text-[#030712] transition-colors cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M12 4L4 12M4 4L12 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
              <div className="shrink-0 flex items-center gap-1 text-[12px] text-[#9CA3AF]">
                <kbd className="px-1.5 py-0.5 bg-[#F3F4F6] rounded border border-[#E5E7EB] font-medium">
                  esc
                </kbd>
                <span>to close</span>
              </div>
            </div>

            {/* Results */}
            <div
              ref={resultsRef}
              className="max-h-[400px] overflow-y-auto"
            >
              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <svg
                    className="animate-spin h-6 w-6 text-[#6A7282]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              )}

              {/* Error state */}
              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-[#DC2626]"
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M12 7v6M12 16v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="font-public text-[14px] text-[#6A7282]">{error}</p>
                </div>
              )}

              {/* Empty state - no query */}
              {!query && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="font-public text-[14px] text-[#6A7282]">
                    Start typing to search across your store
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["Products", "Orders", "Customers", "Categories", "Coupons"].map(
                      (type) => (
                        <span
                          key={type}
                          className="px-2 py-1 bg-[#F3F4F6] rounded text-[12px] text-[#6A7282]"
                        >
                          {type}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Empty state - no results */}
              {query && !isLoading && !error && totalCount === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-[#6A7282]"
                    >
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="font-public text-[14px] text-[#030712] font-medium">
                    No results found
                  </p>
                  <p className="font-public text-[13px] text-[#6A7282] mt-1">
                    Try a different search term
                  </p>
                </div>
              )}

              {/* Results list */}
              {!isLoading && !error && results.length > 0 && (
                <div className="py-2">
                  {results.map((group) => {
                    // Calculate starting index for this group
                    let startIndex = 0;
                    for (const g of results) {
                      if (g === group) break;
                      startIndex += g.results.length;
                    }

                    return (
                      <div key={group.type} className="mb-2 last:mb-0">
                        {/* Group header */}
                        <div className="flex items-center gap-2 px-4 py-2">
                          <GroupIcon type={group.type} />
                          <span className="font-geist text-[12px] font-medium text-[#6A7282] uppercase tracking-wide">
                            {group.label}
                          </span>
                          <span className="font-public text-[11px] text-[#9CA3AF]">
                            ({group.results.length})
                          </span>
                        </div>

                        {/* Group results */}
                        {group.results.map((result, idx) => {
                          const flatIndex = startIndex + idx;
                          const isSelected = flatIndex === selectedIndex;

                          return (
                            <button
                              key={result.id}
                              data-index={flatIndex}
                              onClick={() => handleSelect(result)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-[#F3F4F6]"
                                  : "hover:bg-[#F9FAFB]"
                              }`}
                            >
                              {/* Thumbnail or icon */}
                              {result.thumbnail ? (
                                <div className="h-10 w-10 rounded-lg bg-[#F3F4F6] overflow-hidden shrink-0">
                                  <img
                                    src={result.thumbnail}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0 text-[#6A7282]">
                                  <ResultTypeIcon type={result.type} />
                                </div>
                              )}

                              {/* Content */}
                              <div className="flex-1 text-left min-w-0">
                                <p className="font-public text-[14px] font-medium text-[#030712] truncate">
                                  {result.title}
                                </p>
                                {result.subtitle && (
                                  <p className="font-public text-[12px] text-[#6A7282] truncate">
                                    {result.subtitle}
                                  </p>
                                )}
                              </div>

                              {/* Arrow indicator */}
                              {isSelected && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  className="shrink-0 text-[#6A7282]"
                                >
                                  <path
                                    d="M6 4l4 4-4 4"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {totalCount > 0 && (
              <div className="border-t border-[#E5E7EB] px-4 py-2 flex items-center justify-between">
                <span className="font-public text-[12px] text-[#6A7282]">
                  {totalCount} result{totalCount !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-3 text-[12px] text-[#9CA3AF]">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-[#F3F4F6] rounded border border-[#E5E7EB] text-[10px]">
                      ↑
                    </kbd>
                    <kbd className="px-1 py-0.5 bg-[#F3F4F6] rounded border border-[#E5E7EB] text-[10px]">
                      ↓
                    </kbd>
                    <span>navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-[#F3F4F6] rounded border border-[#E5E7EB] text-[10px]">
                      enter
                    </kbd>
                    <span>select</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;
}
