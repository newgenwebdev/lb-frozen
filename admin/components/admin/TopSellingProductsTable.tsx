"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Card, TrendIcon } from "@/components/ui";
import type { TopProductsSortBy } from "@/lib/api/analytics";

type Product = {
  variant_id: string;
  name: string;
  image_url: string | null;
  quantity_sold: number;
  revenue: number;
  change_percent: number;
  change_direction: "up" | "down" | "neutral";
};

type TopSellingProductsTableProps = {
  products: Product[];
  currency: string;
  isLoading: boolean;
  sortBy: TopProductsSortBy;
  onSortChange: (sortBy: TopProductsSortBy) => void;
};

export function TopSellingProductsTable({
  products,
  currency,
  isLoading,
  sortBy,
  onSortChange,
}: TopSellingProductsTableProps): React.JSX.Element {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.right - 180, // Align right edge of menu with button
    });
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSortChange = (newSortBy: TopProductsSortBy): void => {
    onSortChange(newSortBy);
    setIsMenuOpen(false);
  };

  const handleViewAll = (): void => {
    router.push("/admin/products?sort=bestselling");
    setIsMenuOpen(false);
  };

  return (
    <Card
      title="Top Selling Products"
      titleClassName="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#030712]"
      action={
        <button
          ref={buttonRef}
          onClick={handleMenuClick}
          className="cursor-pointer text-[#030712] transition-colors hover:text-[#6A7282]"
          aria-label="Menu"
          aria-expanded={isMenuOpen}
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
      }
    >
      {/* Dropdown Menu Portal */}
      {isMenuOpen && menuPosition && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-[180px] rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            role="menu"
          >
            {/* Sort Options Section */}
            <div className="border-b border-[#E5E7EB] px-3 py-2">
              <span className="font-geist text-[11px] font-medium uppercase tracking-wider text-[#6A7282]">
                Sort by
              </span>
            </div>
            <button
              onClick={() => handleSortChange("revenue")}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#F9FAFB]"
              role="menuitem"
            >
              <span className={`h-2 w-2 rounded-full ${sortBy === "revenue" ? "bg-[#030712]" : "bg-transparent"}`} />
              <span className="font-public text-[13px] text-[#030712]">By Revenue</span>
            </button>
            <button
              onClick={() => handleSortChange("quantity")}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#F9FAFB]"
              role="menuitem"
            >
              <span className={`h-2 w-2 rounded-full ${sortBy === "quantity" ? "bg-[#030712]" : "bg-transparent"}`} />
              <span className="font-public text-[13px] text-[#030712]">By Quantity</span>
            </button>

            {/* Actions Section */}
            <div className="border-t border-[#E5E7EB]">
              <button
                onClick={handleViewAll}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#F9FAFB]"
                role="menuitem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span className="font-public text-[13px] text-[#030712]">View All Products</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {isLoading ? (
        <div className="flex h-[200px] items-center justify-center text-[#6A7282]">Loading top products...</div>
      ) : (
        <div className="-mx-4 overflow-x-auto md:-mx-6">
          <table className="w-full">
            <thead>
              <tr className="border border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="py-3 pl-4 pr-3 text-left font-geist text-[12px] font-normal tracking-[-0.12px] text-[#6A7282] md:pl-6">
                  Product
                </th>
                <th className={`px-3 py-3 text-left font-geist text-[12px] font-normal tracking-[-0.12px] ${sortBy === "quantity" ? "text-[#030712] font-medium" : "text-[#6A7282]"}`}>
                  <div
                    className="flex cursor-pointer items-center gap-1 transition-colors hover:text-[#030712]"
                    onClick={() => onSortChange("quantity")}
                  >
                    <span>Qty</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`transition-transform ${sortBy === "quantity" ? "text-[#030712]" : "text-[#6A7282]"}`}
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th className={`px-3 py-3 text-left font-geist text-[12px] font-normal tracking-[-0.12px] ${sortBy === "revenue" ? "text-[#030712] font-medium" : "text-[#6A7282]"}`}>
                  <div
                    className="flex cursor-pointer items-center gap-1 transition-colors hover:text-[#030712]"
                    onClick={() => onSortChange("revenue")}
                  >
                    <span>Revenue</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      className={`transition-transform ${sortBy === "revenue" ? "text-[#030712]" : "text-[#6A7282]"}`}
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th className="py-3 pl-3 pr-4 text-left font-geist text-[12px] font-normal tracking-[-0.12px] text-[#6A7282] md:pr-6">
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.variant_id}>
                  <td className="flex items-center gap-3 py-3 pl-4 pr-3 md:pl-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F5]">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <span className="text-[20px]">📦</span>
                      )}
                    </div>
                    <span className="font-public text-[14px] font-normal text-[#030712]">{product.name}</span>
                  </td>
                  <td className="px-3 py-3 font-public text-[14px] font-normal text-[#030712]">{product.quantity_sold}</td>
                  <td className="px-3 py-3 font-public text-[14px] font-normal text-[#030712]">
                    $ {(product.revenue / 100).toFixed(2)}
                  </td>
                  <td className="py-3 pl-3 pr-4 md:pr-6">
                    <div className="flex items-center gap-1">
                      {product.change_direction !== "neutral" && <TrendIcon direction={product.change_direction} size={12} />}
                      <span
                        className={`font-public text-[12px] font-medium ${
                          product.change_direction === "up"
                            ? "text-[#049228]"
                            : product.change_direction === "down"
                            ? "text-[#DC2626]"
                            : "text-[#6A7282]"
                        }`}
                      >
                        {product.change_percent.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && !isLoading && (
                <tr>
                  <td colSpan={4} className="py-6 text-center font-public text-[14px] text-[#6A7282]">
                    No top selling products data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
