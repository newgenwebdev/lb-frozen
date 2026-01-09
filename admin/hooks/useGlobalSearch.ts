"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api/client";

// Search result types
export type SearchResultType =
  | "product"
  | "order"
  | "customer"
  | "category"
  | "coupon"
  | "return";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  thumbnail?: string;
};

export type GroupedSearchResults = {
  type: SearchResultType;
  label: string;
  icon: string;
  results: SearchResult[];
};

type UseGlobalSearchReturn = {
  query: string;
  setQuery: (query: string) => void;
  results: GroupedSearchResults[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  clearSearch: () => void;
};

const SEARCH_LIMIT = 5; // Results per category
const DEBOUNCE_MS = 300;

/**
 * Hook to search across multiple entities in parallel
 */
export function useGlobalSearch(): UseGlobalSearchReturn {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedSearchResults[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearSearch = useCallback((): void => {
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  const performSearch = useCallback(async (searchQuery: string): Promise<void> => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from all endpoints in parallel
      const [
        productsRes,
        ordersRes,
        customersRes,
        categoriesRes,
        couponsRes,
      ] = await Promise.allSettled([
        // Products
        api.get(`/admin/custom-products?q=${encodeURIComponent(searchQuery)}&limit=${SEARCH_LIMIT}`, {
          signal: abortControllerRef.current.signal,
        }),
        // Orders
        api.get(`/admin/custom-orders?q=${encodeURIComponent(searchQuery)}&limit=${SEARCH_LIMIT}`, {
          signal: abortControllerRef.current.signal,
        }),
        // Customers (non-members)
        api.get(`/admin/customers/non-members?search=${encodeURIComponent(searchQuery)}&limit=${SEARCH_LIMIT}`, {
          signal: abortControllerRef.current.signal,
        }),
        // Categories
        api.get(`/admin/product-categories?q=${encodeURIComponent(searchQuery)}&limit=${SEARCH_LIMIT}`, {
          signal: abortControllerRef.current.signal,
        }),
        // Coupons
        api.get(`/admin/promos/coupons?q=${encodeURIComponent(searchQuery)}&limit=${SEARCH_LIMIT}`, {
          signal: abortControllerRef.current.signal,
        }),
      ]);

      const groupedResults: GroupedSearchResults[] = [];

      // Process Products
      if (productsRes.status === "fulfilled" && productsRes.value.data.products?.length > 0) {
        groupedResults.push({
          type: "product",
          label: "Products",
          icon: "product",
          results: productsRes.value.data.products.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            type: "product" as const,
            title: p.title as string,
            subtitle: `${p.status === "published" ? "Published" : "Draft"}${p.lowest_price ? ` • Rp ${Number(p.lowest_price).toLocaleString("id-ID")}` : ""}`,
            href: `/admin/products/${p.id}`,
            thumbnail: p.thumbnail as string | undefined,
          })),
        });
      }

      // Process Orders
      if (ordersRes.status === "fulfilled" && ordersRes.value.data.orders?.length > 0) {
        groupedResults.push({
          type: "order",
          label: "Orders",
          icon: "order",
          results: ordersRes.value.data.orders.map((o: Record<string, unknown>) => ({
            id: o.id as string,
            type: "order" as const,
            title: `#${o.display_id}`,
            subtitle: `${o.customer_name || o.customer_email || "Guest"} • ${o.payment_status}`,
            href: `/admin/orders/${o.id}`,
          })),
        });
      }

      // Process Customers
      if (customersRes.status === "fulfilled" && customersRes.value.data.customers?.length > 0) {
        groupedResults.push({
          type: "customer",
          label: "Customers",
          icon: "customer",
          results: customersRes.value.data.customers.map((c: Record<string, unknown>) => {
            const firstName = c.first_name as string | null;
            const lastName = c.last_name as string | null;
            const email = c.email as string;
            const name = [firstName, lastName].filter(Boolean).join(" ") || email;
            return {
              id: c.id as string,
              type: "customer" as const,
              title: name,
              subtitle: firstName ? email : undefined,
              href: `/admin/membership/members/${c.id}`,
            };
          }),
        });
      }

      // Process Categories
      if (categoriesRes.status === "fulfilled" && categoriesRes.value.data.product_categories?.length > 0) {
        groupedResults.push({
          type: "category",
          label: "Categories",
          icon: "category",
          results: categoriesRes.value.data.product_categories.map((cat: Record<string, unknown>) => ({
            id: cat.id as string,
            type: "category" as const,
            title: cat.name as string,
            subtitle: (cat.parent_category as Record<string, unknown> | null)?.name as string | undefined,
            href: `/admin/categories/${cat.id}`,
          })),
        });
      }

      // Process Coupons
      if (couponsRes.status === "fulfilled" && couponsRes.value.data.coupons?.length > 0) {
        groupedResults.push({
          type: "coupon",
          label: "Coupons",
          icon: "coupon",
          results: couponsRes.value.data.coupons.map((coupon: Record<string, unknown>) => ({
            id: coupon.id as string,
            type: "coupon" as const,
            title: coupon.code as string,
            subtitle: coupon.name as string | undefined,
            href: `/admin/promos/coupons/${coupon.id}`,
          })),
        });
      }

      setResults(groupedResults);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError("Failed to search. Please try again.");
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const totalCount = results.reduce((sum, group) => sum + group.results.length, 0);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    totalCount,
    clearSearch,
  };
}
