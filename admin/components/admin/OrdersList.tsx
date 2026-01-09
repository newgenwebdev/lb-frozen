import React from "react";
import { OrderCard } from "./OrderCard";
import type { Order } from "@/lib/validators/order";
import type { Return } from "@/lib/validators/return";

type OrdersListProps = {
  orders: Order[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  ordersPerPage: number;
  selectedOrders?: Set<string>;
  returnsMap?: Map<string, Return[]>;
  onPageChange: (page: number) => void;
  onSelectOrder?: (orderId: string, selected: boolean) => void;
  onCancel?: (orderId: string) => void;
  onViewDetails?: (order: Order) => void;
};

export function OrdersList({
  orders,
  isLoading,
  currentPage,
  totalPages,
  totalOrders,
  ordersPerPage,
  selectedOrders = new Set(),
  returnsMap = new Map(),
  onPageChange,
  onSelectOrder,
  onCancel,
  onViewDetails,
}: OrdersListProps): React.JSX.Element {
  const startIndex = (currentPage - 1) * ordersPerPage + 1;
  const endIndex = Math.min(currentPage * ordersPerPage, totalOrders);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100"></div>
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg bg-white p-8">
        <div className="text-center">
          <div className="mb-4 text-[48px]">📦</div>
          <h3 className="mb-2 font-geist text-[18px] font-medium text-[#030712]">No orders found</h3>
          <p className="font-public text-[14px] text-[#6A7282]">Try adjusting your search or filter criteria</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Orders List */}
      <div className="mb-6 space-y-4">
        {orders.map((order, index) => (
          <OrderCard
            key={order.id}
            order={order}
            index={index}
            isSelected={selectedOrders.has(order.id)}
            returns={returnsMap.get(order.id) || []}
            onSelect={onSelectOrder}
            onCancel={onCancel}
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

          {/* Rows per page selector */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="font-public text-[14px] text-[#6A7282]">{ordersPerPage} data per row</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6L8 10L12 6"
                stroke="#6A7282"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
