import { useState, useMemo } from "react";

type UsePaginationProps<T> = {
  items: T[];
  itemsPerPage: number;
};

type UsePaginationReturn<T> = {
  currentPage: number;
  totalPages: number;
  paginatedItems: T[];
  displayItems: (T | null)[];
  startIndex: number;
  endIndex: number;
  totalItems: number;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
};

export function usePagination<T>({
  items,
  itemsPerPage,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  // Pad with null to always show consistent number of rows
  const displayItems = useMemo(() => {
    const padded: (T | null)[] = [...paginatedItems];
    while (padded.length < itemsPerPage) {
      padded.push(null);
    }
    return padded;
  }, [paginatedItems, itemsPerPage]);

  const nextPage = (): void => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const prevPage = (): void => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const resetPage = (): void => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    displayItems,
    startIndex,
    endIndex,
    totalItems,
    setCurrentPage,
    nextPage,
    prevPage,
    resetPage,
  };
}
