import { useMemo } from "react";

type Order = {
  id: string;
  display_id: number;
  customer_name: string;
  customer_email: string;
  status: string;
  total: number;
  created_at: string | Date;
  currency: string;
  items_count: number;
};

type SortOption = "newest" | "oldest" | "highest" | "lowest";
type FilterOption = "all" | "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

type UseOrderFiltersProps = {
  orders: Order[];
  searchQuery: string;
  sortBy: SortOption;
  filterBy: FilterOption;
};

type UseOrderFiltersReturn = {
  filteredOrders: Order[];
};

export function useOrderFilters({
  orders,
  searchQuery,
  sortBy,
  filterBy,
}: UseOrderFiltersProps): UseOrderFiltersReturn {
  const filteredOrders = useMemo(() => {
    // Step 1: Filter by status
    let result = orders.filter((order) => {
      if (filterBy === "all") return true;
      return order.status.toLowerCase() === filterBy;
    });

    // Step 2: Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.id.toLowerCase().includes(query) ||
          order.customer_name.toLowerCase().includes(query) ||
          order.customer_email.toLowerCase().includes(query)
      );
    }

    // Step 3: Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "highest":
          return b.total - a.total;
        case "lowest":
          return a.total - b.total;
        default:
          return 0;
      }
    });

    return result;
  }, [orders, searchQuery, sortBy, filterBy]);

  return {
    filteredOrders,
  };
}
