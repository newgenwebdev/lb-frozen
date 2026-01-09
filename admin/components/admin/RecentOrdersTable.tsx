"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Card, SearchInput, DropdownMenu, StatusIcon } from "@/components/ui";
import { usePagination } from "@/hooks/usePagination";
import { useOrderFilters } from "@/hooks/useOrderFilters";
import { ORDERS_PER_PAGE, SORT_OPTIONS, FILTER_OPTIONS } from "@/lib/constants";
import { formatDate, getAvatarColorClass } from "@/lib/utils/overview";

// Valid status values from server
type OrderStatusValue = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | "partially_refunded";

// Map server status to display label
function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
    partially_refunded: "Partially Refunded",
  };
  return labels[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1);
}

// Map server status to StatusIcon status prop (capitalized with underscore for partially_refunded)
function getStatusIconValue(status: string): string {
  const mapping: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
    partially_refunded: "Partially_refunded",
    // Legacy mappings
    failed: "Failed",
  };
  return mapping[status.toLowerCase()] || "Pending";
}

type OrderItem = {
  unit_price: number;
  quantity: number;
  metadata?: Record<string, unknown> | null;
};

type EasyParcelShipping = {
  service_id?: string;
  service_name?: string;
  courier_id?: string;
  courier_name?: string;
  courier_logo?: string;
  price?: number;
  price_display?: string;
  delivery_eta?: string;
};

type Order = {
  id: string;
  display_id: number;
  customer_name: string;
  customer_email: string;
  status: string;
  total: number;
  subtotal?: number;
  shipping_total?: number;
  tax_total?: number;
  discount_total?: number;
  coupon_code?: string | null;
  created_at: string | Date;
  currency: string;
  items_count: number;
  items?: OrderItem[];
  metadata?: {
    easyparcel_shipping?: EasyParcelShipping;
    free_shipping_applied?: boolean;
    points_discount_amount?: number;
    applied_membership_promo_discount?: number;
    tier_discount_amount?: number;
    coupon_code?: string;
    [key: string]: unknown;
  } | null;
};

// Helper to get original price before discount for an order item
function getItemOriginalPrice(item: OrderItem): number {
  // If original_unit_price exists in metadata, use it
  if (item.metadata?.original_unit_price) {
    return Number(item.metadata.original_unit_price);
  }

  // For variant discount items without original_unit_price, calculate from unit_price + discount
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    return item.unit_price + Number(item.metadata.variant_discount_amount);
  }

  return item.unit_price;
}

// Helper to calculate correct order total including all discounts
function calculateOrderTotal(order: Order): number {
  // Calculate original subtotal using original prices (before any discounts)
  const originalSubtotal = order.items?.reduce((sum, item) => {
    const originalPrice = getItemOriginalPrice(item);
    return sum + originalPrice * item.quantity;
  }, 0) || order.subtotal || order.total || 0;

  // Calculate PWP discount from item metadata
  const pwpDiscount = order.items?.reduce((sum, item) => {
    if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
      return sum + (Number(item.metadata.pwp_discount_amount) || 0) * item.quantity;
    }
    return sum;
  }, 0) || 0;

  // Calculate variant discount from item metadata (Set Discount Global from admin)
  const variantDiscount = order.items?.reduce((sum, item) => {
    if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
      return sum + (Number(item.metadata.variant_discount_amount) || 0) * item.quantity;
    }
    return sum;
  }, 0) || 0;

  // Calculate wholesale/bulk discount from item metadata
  const wholesaleDiscount = order.items?.reduce((sum, item) => {
    if (item.metadata?.is_bulk_price) {
      const originalPrice = getItemOriginalPrice(item);
      const currentPrice = item.unit_price;
      return sum + (originalPrice - currentPrice) * item.quantity;
    }
    return sum;
  }, 0) || 0;

  // Extract points discount from order metadata
  const pointsDiscount = Number(order.metadata?.points_discount_amount) || 0;

  // Extract membership promo discount from order metadata
  const membershipPromoDiscount = Number(order.metadata?.applied_membership_promo_discount) || 0;

  // Extract tier discount from order metadata (automatically applied based on membership tier)
  const tierDiscount = Number(order.metadata?.tier_discount_amount) || 0;

  // If no discounts in metadata, just return the order total
  if (pwpDiscount === 0 && variantDiscount === 0 && wholesaleDiscount === 0 && pointsDiscount === 0 && membershipPromoDiscount === 0 && tierDiscount === 0) {
    return order.total;
  }

  // Calculate shipping - prefer EasyParcel metadata over shipping_total
  // because shipping_total may contain a placeholder Medusa shipping option price
  const freeShippingApplied = order.metadata?.free_shipping_applied === true;
  const easyParcelShipping = order.metadata?.easyparcel_shipping;
  let rawShippingCost: number;

  if (easyParcelShipping && typeof easyParcelShipping.price === 'number') {
    // Use EasyParcel price from metadata (the actual selected shipping rate)
    rawShippingCost = easyParcelShipping.price;
  } else {
    // Fall back to shipping_total
    rawShippingCost = order.shipping_total || 0;
  }
  const effectiveShippingCost = freeShippingApplied ? 0 : rawShippingCost;

  // Coupon discount calculation (avoid double-counting PWP and points)
  const totalDiscount = order.discount_total || 0;
  const hasCoupon = Boolean(order.coupon_code || order.metadata?.coupon_code);
  const couponDiscount = hasCoupon ? Math.max(0, totalDiscount - pwpDiscount - pointsDiscount) : 0;

  // Calculate correct total
  const subtotalAfterDiscounts = originalSubtotal - pwpDiscount - variantDiscount - wholesaleDiscount;
  const tax = order.tax_total || 0;
  return Math.max(0, subtotalAfterDiscounts - couponDiscount - pointsDiscount - membershipPromoDiscount - tierDiscount + effectiveShippingCost + tax);
}

type RecentOrdersTableProps = {
  orders: Order[];
  isLoading: boolean;
};

export function RecentOrdersTable({ orders, isLoading }: RecentOrdersTableProps): React.JSX.Element {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter and sort orders
  const { filteredOrders } = useOrderFilters({
    orders,
    searchQuery,
    sortBy: sortBy as "newest" | "oldest" | "highest" | "lowest",
    filterBy: filterBy as "all" | "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded",
  });

  // Paginate orders
  const {
    currentPage,
    totalPages,
    displayItems,
    startIndex,
    endIndex,
    totalItems,
    setCurrentPage,
    nextPage,
    prevPage,
    resetPage,
  } = usePagination({
    items: filteredOrders,
    itemsPerPage: ORDERS_PER_PAGE,
  });

  // Reset to page 1 when filters change
  const handleFilterChange = (value: string): void => {
    setFilterBy(value);
    resetPage();
  };

  const handleSearchChange = (value: string): void => {
    setSearchQuery(value);
    resetPage();
  };

  const handleSortChange = (value: string): void => {
    setSortBy(value);
    resetPage();
  };

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>, orderId: string): void => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.bottom > window.innerHeight - 150;

    if (openMenuId === orderId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      setOpenMenuId(orderId);
      setMenuPosition({
        top: openUp ? rect.top : rect.bottom + 4,
        left: rect.right - 140,
        openUp,
      });
    }
  };

  const handleViewDetails = (orderId: string): void => {
    // Navigate to orders page with order ID to auto-open the drawer
    router.push(`/admin/orders?order=${orderId}`);
    setOpenMenuId(null);
  };

  return (
    <Card
      title="Recent Orders"
      titleClassName="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#030712]"
      action={
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <SearchInput placeholder="Search data" value={searchQuery} onChange={handleSearchChange} />
          <DropdownMenu
            items={[...SORT_OPTIONS]}
            value={sortBy}
            onChange={handleSortChange}
            title="Sort by"
            className="w-full sm:w-[180px]"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10.9297 9.66602H13.737L10.9297 12.9993H13.737"
                  stroke="#030712"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14.0013 6.33333L12.3346 3L10.668 6.33333"
                  stroke="#030712"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M10.9453 5.77474H13.72" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 13.0003H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 9.66732H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 6.33333H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 3.00033H2" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <DropdownMenu
            items={[...FILTER_OPTIONS]}
            value={filterBy}
            onChange={handleFilterChange}
            title="Filter"
            className="w-full sm:w-[140px]"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 3.33333H14" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 3.33333H9.33333" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.66602 8.00033H13.9993" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 8.00033H4" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 12.6663H14" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12.6663H9.33333" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
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
            }
          />
        </div>
      }
    >
      {/* Action Menu Portal */}
      {openMenuId && menuPosition && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-[140px] rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg"
            style={{
              top: menuPosition.openUp ? "auto" : menuPosition.top,
              bottom: menuPosition.openUp ? `${window.innerHeight - menuPosition.top + 4}px` : "auto",
              left: menuPosition.left,
            }}
            role="menu"
          >
            <button
              onClick={() => handleViewDetails(openMenuId)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#F9FAFB]"
              role="menuitem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6A7282]">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="font-public text-[13px] text-[#030712]">View Details</span>
            </button>
          </div>,
          document.body
        )}

      <div className="-mx-4 overflow-x-auto md:-mx-6">
        <table className="w-full">
          <thead>
            <tr className="border border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="py-3 pl-4 pr-3 text-left font-geist text-[12px] font-normal tracking-[-0.12px] text-[#6A7282] md:pl-6">
                Order ID
              </th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-normal tracking-[-0.12px] text-[#6A7282]">
                Customer
              </th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-normal tracking-[-0.12px] text-[#6A7282]">Total</th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-normal tracking-[-0.12px] text-[#6A7282]">
                Status
              </th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-normal tracking-[-0.12px] text-[#6A7282]">Items</th>
              <th className="px-3 py-3 text-left font-geist text-[12px] font-normal tracking-[-0.12px] text-[#6A7282]">Date</th>
              <th className="py-3 pl-3 pr-4 text-left font-geist text-[12px] font-normal tracking-[-0.12px] text-[#6A7282] md:pr-6"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center font-public text-[14px] text-[#6A7282]">
                  Loading orders...
                </td>
              </tr>
            ) : displayItems.length === 0 || displayItems.every((o) => o === null) ? (
              <tr>
                <td colSpan={7} className="py-8 text-center font-public text-[14px] text-[#6A7282]">
                  No orders found
                </td>
              </tr>
            ) : (
              displayItems.map((order, index) => (
                <tr key={order?.id || `empty-${index}`}>
                  {order ? (
                    <>
                      <td className="py-3 pl-4 pr-3 font-public text-[14px] font-normal text-[#030712] md:pl-6">
                        #{order.display_id}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getAvatarColorClass(index)}`}>
                            <span className="text-[14px]">👤</span>
                          </div>
                          <span className="font-public text-[14px] font-normal text-[#030712]">{order.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-public text-[14px] font-normal text-[#030712]">
                        $ {(calculateOrderTotal(order) / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={getStatusIconValue(order.status) as "Pending" | "Paid" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded" | "Partially_refunded" | "Failed"} />
                          <span className="font-public text-[14px] font-normal text-[#030712]">
                            {formatStatusLabel(order.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-public text-[14px] font-normal text-[#6A7282]">
                            {order.items_count} {order.items_count === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-public text-[14px] font-normal text-[#030712]">{formatDate(order.created_at)}</td>
                      <td className="py-3 pl-3 pr-4 text-center md:pr-6">
                        <button
                          onClick={(e) => handleMenuClick(e, order.id)}
                          className="cursor-pointer text-[#030712] transition-colors hover:text-[#6A7282]"
                          aria-label="Order actions"
                          aria-expanded={openMenuId === order.id}
                          aria-haspopup="true"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M12.3388 8.00339C12.3388 8.18757 12.1895 8.33687 12.0053 8.33687C11.8212 8.33687 11.6719 8.18757 11.6719 8.00339C11.6719 7.81922 11.8212 7.66992 12.0053 7.66992C12.1895 7.66992 12.3388 7.81922 12.3388 8.00339"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8.33687 8.00339C8.33687 8.18757 8.18757 8.33687 8.00339 8.33687C7.81922 8.33687 7.66992 8.18757 7.66992 8.00339C7.66992 7.81922 7.81922 7.66992 8.00339 7.66992C8.18757 7.66992 8.33687 7.81922 8.33687 8.00339"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M4.33491 8.00339C4.33491 8.18757 4.18561 8.33687 4.00144 8.33687C3.81727 8.33687 3.66797 8.18757 3.66797 8.00339C3.66797 7.81922 3.81727 7.66992 4.00144 7.66992C4.18561 7.66992 4.33491 7.81922 4.33491 8.00339"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 pl-4 pr-3 font-public text-[14px] font-normal text-[#030712] md:pl-6">&nbsp;</td>
                      <td className="px-3 py-3">&nbsp;</td>
                      <td className="px-3 py-3 font-public text-[14px] font-normal text-[#030712]">&nbsp;</td>
                      <td className="px-3 py-3">&nbsp;</td>
                      <td className="px-3 py-3">&nbsp;</td>
                      <td className="px-3 py-3 font-public text-[14px] font-normal text-[#030712]">&nbsp;</td>
                      <td className="py-3 pl-3 pr-4 text-center md:pr-6">&nbsp;</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#E5E7EB] px-4 py-4 md:px-6">
          <div className="font-public text-[14px] text-[#6A7282]">
            Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`cursor-pointer rounded-lg px-3 py-2 font-public text-[14px] font-medium transition-colors ${
                currentPage === 1
                  ? "cursor-not-allowed bg-[#F9FAFB] text-[#D1D5DB]"
                  : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
              }`}
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-10 w-10 cursor-pointer rounded-lg font-public text-[14px] font-medium transition-colors ${
                        currentPage === page
                          ? "bg-[#030712] text-white"
                          : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if ((page === currentPage - 2 && page > 1) || (page === currentPage + 2 && page < totalPages)) {
                  return (
                    <span key={page} className="px-2 text-[#6A7282]">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className={`cursor-pointer rounded-lg px-3 py-2 font-public text-[14px] font-medium transition-colors ${
                currentPage === totalPages
                  ? "cursor-not-allowed bg-[#F9FAFB] text-[#D1D5DB]"
                  : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
