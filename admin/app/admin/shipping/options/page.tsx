"use client";

import React, { useMemo, useState } from "react";
import { useEasyParcelRates } from "@/lib/api/queries";
import type { EasyParcelRate } from "@/lib/types/shipping-settings";

type SortField = "courier_name" | "service_name" | "price" | "delivery_eta";
type SortDirection = "asc" | "desc";

/**
 * Courier Table Component
 * Displays EasyParcel couriers in a table format
 */
function CourierTable({
  rates,
  isLoading,
}: {
  rates: EasyParcelRate[];
  isLoading: boolean;
}): React.JSX.Element {
  const [sortField, setSortField] = useState<SortField>("price");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");

  // Handle column header click for sorting
  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort rates
  const filteredAndSortedRates = useMemo(() => {
    let result = [...rates];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.courier_name.toLowerCase().includes(query) ||
          r.service_name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "courier_name":
          comparison = a.courier_name.localeCompare(b.courier_name);
          break;
        case "service_name":
          comparison = a.service_name.localeCompare(b.service_name);
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        case "delivery_eta":
          comparison = (a.delivery_eta || "").localeCompare(b.delivery_eta || "");
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [rates, searchQuery, sortField, sortDirection]);

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }): React.JSX.Element => {
    const isActive = sortField === field;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={`transition-transform ${isActive && sortDirection === "desc" ? "rotate-180" : ""}`}
      >
        <path
          d="M4 6L8 10L12 6"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
          <p className="mt-4 font-public text-[14px] text-[#6A7282]">
            Loading couriers from EasyParcel...
          </p>
        </div>
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <div className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[#6A7282]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-4 font-geist text-[18px] font-medium text-[#030712]">
            No couriers available
          </h3>
          <p className="mt-2 font-public text-[14px] text-[#6A7282]">
            Please check your EasyParcel configuration and API connection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative w-full max-w-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A7282]"
          >
            <path
              d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 14L11.1 11.1"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search couriers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 font-public text-[14px] text-[#030712] placeholder-[#6A7282] outline-none transition-colors focus:border-[#030712]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="text-left py-3 pl-6 pr-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <button
                    type="button"
                    onClick={() => handleSort("courier_name")}
                    className={`flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors ${sortField === "courier_name" ? "text-[#030712]" : ""}`}
                  >
                    <span>Courier</span>
                    <SortIcon field="courier_name" />
                  </button>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <button
                    type="button"
                    onClick={() => handleSort("service_name")}
                    className={`flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors ${sortField === "service_name" ? "text-[#030712]" : ""}`}
                  >
                    <span>Service</span>
                    <SortIcon field="service_name" />
                  </button>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <button
                    type="button"
                    onClick={() => handleSort("price")}
                    className={`flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors ${sortField === "price" ? "text-[#030712]" : ""}`}
                  >
                    <span>Price</span>
                    <SortIcon field="price" />
                  </button>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <button
                    type="button"
                    onClick={() => handleSort("delivery_eta")}
                    className={`flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors ${sortField === "delivery_eta" ? "text-[#030712]" : ""}`}
                  >
                    <span>ETA</span>
                    <SortIcon field="delivery_eta" />
                  </button>
                </th>
                <th className="text-left py-3 pl-3 pr-6 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <span>Features</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRates.map((rate) => (
                <tr
                  key={rate.service_id}
                  className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors"
                >
                  {/* Courier */}
                  <td className="py-4 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-[#F9FAFB]">
                        {rate.courier_logo ? (
                          <img
                            src={rate.courier_logo}
                            alt={rate.courier_name}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="font-geist text-[10px] font-bold text-[#6A7282]">
                            {rate.courier_name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="font-public text-[14px] font-medium text-[#030712]">
                        {rate.courier_name}
                      </span>
                    </div>
                  </td>

                  {/* Service */}
                  <td className="py-4 px-3">
                    <span className="font-public text-[14px] text-[#030712]">
                      {rate.service_name}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-4 px-3">
                    <span className="font-public text-[14px] font-semibold text-[#030712]">
                      {rate.price_display}
                    </span>
                  </td>

                  {/* ETA */}
                  <td className="py-4 px-3">
                    <span className="font-public text-[14px] text-[#030712]">
                      {rate.delivery_eta || "-"}
                    </span>
                  </td>

                  {/* Features */}
                  <td className="py-4 pl-3 pr-6">
                    <div className="flex items-center gap-2">
                      {rate.has_cod && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 font-public text-[11px] font-medium text-green-700">
                          COD
                        </span>
                      )}
                      {rate.has_insurance && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 font-public text-[11px] font-medium text-blue-700">
                          Insurance
                        </span>
                      )}
                      {!rate.has_cod && !rate.has_insurance && (
                        <span className="font-public text-[12px] text-[#6A7282]">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="mt-4 font-public text-[14px] text-[#6A7282]">
          {filteredAndSortedRates.length} of {rates.length} couriers
        </div>
      )}
    </>
  );
}

/**
 * Shipping Options Page
 * Displays available EasyParcel couriers and their rates in a table
 */
export default function ShippingOptionsPage(): React.JSX.Element {
  const { data, isLoading, isError, error, refetch } = useEasyParcelRates();

  return (
    <div className="px-4 md:px-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
            Shipping Options
          </h1>
          <p className="mt-1 font-public text-[14px] text-[#6A7282]">
            Available EasyParcel couriers and their rates
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Environment Badge */}
          {data?.environment && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-public text-[12px] font-medium ${
                data.environment === "production"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  data.environment === "production" ? "bg-green-500" : "bg-amber-500"
                }`}
              />
              {data.environment === "production" ? "Production" : "Demo"}
            </span>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-geist text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isLoading ? "animate-spin" : ""}
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
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
          <h3 className="mt-4 font-geist text-[16px] font-medium text-[#030712]">
            Failed to load couriers
          </h3>
          <p className="mt-2 font-public text-[14px] text-[#6A7282]">
            {error?.message || "An error occurred while fetching courier rates."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 cursor-pointer rounded-lg bg-black px-4 py-2 font-geist text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!isError && (
        <CourierTable rates={data?.rates || []} isLoading={isLoading} />
      )}

      {/* Info Box */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 flex-shrink-0 text-blue-600"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <div>
            <p className="font-geist text-[14px] font-medium text-blue-700">
              Dynamic Rates from EasyParcel
            </p>
            <p className="mt-1 font-public text-[12px] text-blue-600">
              These rates are fetched in real-time from EasyParcel API. Actual shipping costs at checkout
              may vary depending on the customer&apos;s delivery address and package weight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
