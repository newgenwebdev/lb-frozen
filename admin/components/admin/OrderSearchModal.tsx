"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getOrders } from "@/lib/api/orders";
import type { Order } from "@/lib/validators/order";

type OrderSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
  title?: string;
  description?: string;
};

export function OrderSearchModal({
  isOpen,
  onClose,
  onSelectOrder,
  title = "Find Order",
  description = "Search for an order by order number, customer name, or email.",
}: OrderSearchModalProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setOrders([]);
      setHasSearched(false);
      setIsSearching(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setOrders([]);
      setHasSearched(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await getOrders({
          search: searchQuery.trim(),
          limit: 10,
          offset: 0,
        });
        setOrders(response.orders);
        setHasSearched(true);
      } catch (error) {
        console.error("Failed to search orders:", error);
        setOrders([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectOrder = (order: Order): void => {
    onSelectOrder(order.id);
    onClose();
  };

  const formatDate = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return "-";
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number): string => {
    return `$ ${(amount / 100).toFixed(2)}`;
  };

  // Get status badge styling
  const getStatusBadge = (order: Order): { label: string; className: string } => {
    if (order.fulfillment_status === "delivered") {
      return { label: "Delivered", className: "bg-green-100 text-green-800" };
    }
    if (order.fulfillment_status === "shipped") {
      return { label: "Shipped", className: "bg-indigo-100 text-indigo-800" };
    }
    if (order.payment_status === "paid" || order.payment_status === "captured") {
      return { label: "Paid", className: "bg-blue-100 text-blue-800" };
    }
    return { label: "Pending", className: "bg-gray-100 text-gray-800" };
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
        <div
          className="relative w-full max-w-lg rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-[#E5E7EB] p-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-geist text-[18px] font-semibold text-[#030712]">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-[#F5F5F5]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="#6B7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-1 font-geist text-[14px] text-[#6B7280]">
              {description}
            </p>
          </div>

          {/* Search Input */}
          <div className="border-b border-[#E5E7EB] p-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order #, customer name, or email..."
                className="w-full rounded-lg border border-[#E5E7EB] py-2.5 pl-10 pr-4 font-geist text-[14px] text-[#030712] placeholder-[#9CA3AF] focus:border-[#030712] focus:outline-none focus:ring-1 focus:ring-[#030712]"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#030712]" />
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {!searchQuery.trim() ? (
              <div className="p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-[#D1D5DB]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="mt-3 font-geist text-[14px] text-[#6B7280]">
                  Start typing to search for orders
                </p>
              </div>
            ) : isSearching ? (
              <div className="p-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#E5E7EB] border-t-[#030712]" />
                <p className="mt-3 font-geist text-[14px] text-[#6B7280]">
                  Searching orders...
                </p>
              </div>
            ) : hasSearched && orders.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-[#D1D5DB]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-3 font-geist text-[14px] text-[#6B7280]">
                  No orders found for &quot;{searchQuery}&quot;
                </p>
                <p className="mt-1 font-geist text-[12px] text-[#9CA3AF]">
                  Try searching with a different term
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB]">
                {orders.map((order) => {
                  const statusBadge = getStatusBadge(order);
                  return (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className="flex w-full cursor-pointer items-center gap-4 p-4 text-left transition-colors hover:bg-[#F9FAFB]"
                    >
                      {/* Order Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-geist text-[14px] font-semibold text-[#030712]">
                            #{order.display_id}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-geist text-[13px] text-[#6B7280]">
                          {order.customer_name} • {order.customer_email}
                        </p>
                        <p className="mt-0.5 font-geist text-[12px] text-[#9CA3AF]">
                          {formatDate(order.created_at)} • {order.items_count} item{order.items_count !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Total */}
                      <div className="shrink-0 text-right">
                        <span className="font-geist text-[14px] font-medium text-[#030712]">
                          {formatCurrency(order.total)}
                        </span>
                      </div>

                      {/* Arrow */}
                      <svg
                        className="h-5 w-5 shrink-0 text-[#9CA3AF]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          {orders.length > 0 && (
            <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
              <p className="font-geist text-[12px] text-[#6B7280]">
                Click an order to create a return request
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
