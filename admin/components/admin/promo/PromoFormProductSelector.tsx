"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useProducts } from "@/lib/api/queries";

type PromoFormProductSelectorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
};

export function PromoFormProductSelector({
  label,
  value,
  onChange,
  error,
  placeholder = "Select a product",
  className = "",
}: PromoFormProductSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch products with search
  const { data: productsData, isLoading } = useProducts({
    q: searchQuery || undefined,
    limit: 50,
  });

  const products = productsData?.products ?? [];

  // Find selected product
  const selectedProduct = useMemo(() => {
    if (!value) return null;
    return products.find((p) => p.id === value) ?? null;
  }, [value, products]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (productId: string): void => {
    onChange(productId);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (): void => {
    onChange("");
    setSearchQuery("");
  };

  // Format price for display
  const formatPrice = (product: typeof products[0]): string => {
    const variant = product.variants?.[0];
    const price = variant?.prices?.[0];
    if (!price) return "";
    const amount = price.amount / 100;
    return `$ ${amount.toFixed(2)}`;
  };

  return (
    <div className={className} ref={containerRef}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <div className="relative">
        {/* Display field */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-white py-3 pl-4 pr-10 text-left transition-colors ${
            error
              ? "border-[#DC2626] focus:border-[#DC2626]"
              : isOpen
              ? "border-[#030712]"
              : "border-[#E5E5E5] hover:border-[#D1D5DB]"
          }`}
        >
          {selectedProduct ? (
            <>
              {/* Product thumbnail */}
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6]">
                {selectedProduct.thumbnail ? (
                  <Image
                    src={selectedProduct.thumbnail}
                    alt={selectedProduct.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ProductPlaceholderIcon />
                  </div>
                )}
              </div>
              {/* Product info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-public text-[14px] font-medium text-[#030712]">
                  {selectedProduct.title}
                </p>
                <p className="font-public text-[12px] text-[#6A7282]">
                  {formatPrice(selectedProduct)}
                </p>
              </div>
            </>
          ) : (
            <span className="font-public text-[14px] font-medium text-[#99A1AF]">
              {placeholder}
            </span>
          )}

          {/* Chevron icon */}
          {!selectedProduct && (
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="#6A7282"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Clear button - outside the clickable div */}
        {selectedProduct && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-[#F3F4F6]"
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
                stroke="#6A7282"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
            {/* Search input */}
            <div className="border-b border-[#E5E7EB] p-3">
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                >
                  <path
                    d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
                    stroke="#6A7282"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 14L11.1 11.1"
                    stroke="#6A7282"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 font-public text-[14px] text-[#030712] outline-none placeholder:text-[#99A1AF] focus:border-[#030712]"
                />
              </div>
            </div>

            {/* Product list */}
            <div className="max-h-[280px] overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#030712] border-t-transparent" />
                </div>
              ) : products.length === 0 ? (
                <div className="py-8 text-center font-public text-[14px] text-[#6A7282]">
                  {searchQuery ? "No products found" : "No products available"}
                </div>
              ) : (
                products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#F3F4F6] ${
                      value === product.id ? "bg-[#F3F4F6]" : ""
                    }`}
                  >
                    {/* Product thumbnail */}
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6]">
                      {product.thumbnail ? (
                        <Image
                          src={product.thumbnail}
                          alt={product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ProductPlaceholderIcon />
                        </div>
                      )}
                    </div>
                    {/* Product info */}
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-public text-[14px] font-medium text-[#030712]">
                        {product.title}
                      </p>
                      <p className="font-public text-[12px] text-[#6A7282]">
                        {formatPrice(product)}
                        {product.variants?.[0]?.sku && (
                          <span className="ml-2">SKU: {product.variants[0].sku}</span>
                        )}
                      </p>
                    </div>
                    {/* Selected checkmark */}
                    {value === product.id && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M13.3334 4L6.00008 11.3333L2.66675 8"
                          stroke="#030712"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 font-public text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}

// Placeholder icon for products without thumbnail
function ProductPlaceholderIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M2.5 5L10 1.25L17.5 5V15L10 18.75L2.5 15V5Z"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 10V18.75"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 5L10 10L2.5 5"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
