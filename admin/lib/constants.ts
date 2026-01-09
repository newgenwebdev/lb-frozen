// Overview page constants

export const ORDERS_PER_PAGE = 10;
export const TOP_PRODUCTS_LIMIT = 5;

export const AVATAR_COLORS = [
  "bg-[#E8ECFF]",
  "bg-[#FEF3E2]",
  "bg-[#E5F8ED]",
  "bg-[#FFE8E8]",
  "bg-[#F5E8FF]",
] as const;

export const DATE_FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7days", label: "7 last day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "highest", label: "Highest Amount" },
  { value: "lowest", label: "Lowest Amount" },
] as const;

export const FILTER_OPTIONS = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
] as const;
