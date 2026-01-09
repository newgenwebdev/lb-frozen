"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShipmentToolbar,
  ShipmentTable,
  ShipmentPagination,
} from "@/components/admin/shipment";
import { useShippingOptions } from "@/lib/api/queries";
import { mapShippingOptionListAPIToUI } from "@/lib/utils/shipping-option-mapper";
import type { ShippingOptionStatus } from "@/lib/types/shipping-option";

export default function ShipmentPage(): React.JSX.Element {
  const router = useRouter();

  // Filter state
  const [filterStatus, setFilterStatus] = useState<ShippingOptionStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch shipping options from API (using Medusa's native shipping options)
  const { data: apiResponse, isLoading, isError, error } = useShippingOptions();

  // Map API response to UI format
  const shippingOptionData = useMemo(() => {
    if (!apiResponse) {
      return {
        shippingOptions: [],
        count: 0,
      };
    }
    return mapShippingOptionListAPIToUI(apiResponse);
  }, [apiResponse]);

  const { shippingOptions, count } = shippingOptionData;

  // Handle add new shipping option click
  const handleAddClick = (): void => {
    router.push("/admin/shipment/add");
  };

  // Handle edit shipping option
  const handleEdit = (id: string): void => {
    router.push(`/admin/shipment/edit/${id}`);
  };

  // Handle delete shipping option
  const handleDelete = (): void => {
    // Delete is handled by the ShipmentTable component with the modal
    // This function is kept for compatibility but the actual deletion
    // happens in the table component via the mutation
  };

  // Error state
  if (isError) {
    return (
      <div className="px-4 md:px-8">
        <div className="mb-6">
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712] mb-6">
            Shipping Options
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-[16px] font-medium text-[#030712]">Failed to load shipping options</h3>
            <p className="mt-2 text-[14px] text-[#6A7282]">
              {error?.message || "An error occurred while fetching shipping options."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8">
      {/* Toolbar */}
      <ShipmentToolbar
        onAddClick={handleAddClick}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Table */}
      <ShipmentTable
        shipments={shippingOptions}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        filterStatus={filterStatus}
        searchQuery={searchQuery}
      />

      {/* Pagination - only show if we have multiple pages (currently disabled since we load all) */}
      {count > 10 && (
        <ShipmentPagination
          currentPage={1}
          totalPages={Math.ceil(count / 10)}
          itemsPerPage={10}
          onPageChange={() => {}}
          onItemsPerPageChange={() => {}}
        />
      )}
    </div>
  );
}
