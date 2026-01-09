import React from "react";
import type { OrderStats } from "@/lib/validators/order";

type OrderStatsCardsProps = {
  stats: OrderStats | undefined;
  isLoading: boolean;
  segmentCount?: number; // Total number of segments (default: 50)
};

export function OrderStatsCards({ stats, isLoading, segmentCount = 30 }: OrderStatsCardsProps): React.JSX.Element {
  const formatCurrency = (amount: number, currency: string): string => {
    return `${currency.toUpperCase()} ${(amount / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Calculate segment distribution based on percentage
  const calculateSegments = (percentage: number, total: number) => {
    const count = Math.round((percentage / 100) * total);
    return Math.max(0, Math.min(count, total)); // Ensure within 0-total range
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:mb-8 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
      {/* Total Orders Card with Bar Chart */}
      <div className="rounded-xl border border-[#E8E8E9] bg-[#FFF] p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
          </div>
        ) : stats ? (
          <div className="flex items-start gap-8">
            {/* Left side: Title, Total Orders and Segmented Bar */}
            <div className="flex-1">
              <h3 className="mb-4 font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
                Total Orders
              </h3>

              <div className="mb-4">
                <p className="font-geist text-[24px] font-medium leading-normal tracking-[-0.48px] text-[#030712]">
                  {stats.total_orders.toLocaleString()}{" "}
                  <span className="font-geist text-[16px] font-medium leading-[150%] tracking-[-0.16px] text-[#6A7282]">
                    ({formatCurrency(stats.total_revenue, stats.currency)})
                  </span>
                </p>
              </div>

              {/* Segmented Progress Bar */}
              <div className="flex h-4 w-full gap-0.5">
                {/* Generate segments for paid orders (dark gray) */}
                {Array.from({ length: calculateSegments(stats.paid_percentage, segmentCount) }).map((_, i) => (
                  <div key={`paid-${i}`} className="h-full flex-1 rounded-sm bg-[#2F2F2F]"></div>
                ))}
                {/* Generate segments for unpaid orders (warning yellow) */}
                {Array.from({ length: calculateSegments(100 - stats.paid_percentage, segmentCount) }).map((_, i) => (
                  <div key={`unpaid-${i}`} className="h-full flex-1 rounded-sm bg-[#E99F00]"></div>
                ))}
              </div>
            </div>

            {/* Right side: Paid/Unpaid Breakdown - Stacked */}
            <div className="flex flex-col gap-6">
              {/* Paid Orders */}
              <div className="flex items-start gap-2">
                <div className="mt-1 h-10 w-1 rounded-sm bg-[#2F2F2F]"></div>
                <div>
                  <p className="mb-0.5 font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
                    {stats.paid_orders.toLocaleString()}
                  </p>
                  <p className="font-public text-[12px] font-normal text-[#6A7282]">Paid Orders</p>
                </div>
              </div>

              {/* Unpaid Orders */}
              <div className="flex items-start gap-2">
                <div className="mt-1 h-10 w-1 rounded-sm bg-[#E99F00]"></div>
                <div>
                  <p className="mb-0.5 font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
                    {stats.unpaid_orders.toLocaleString()}
                  </p>
                  <p className="font-public text-[12px] font-normal text-[#6A7282]">Unpaid Orders</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-[#DC2626]">Failed to load stats</p>
        )}
      </div>

      {/* Ready to Ship Card - Most important for operations */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-[#FFF] p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            Ready to Ship
          </h3>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </div>

        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <div>
            <p className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
              {(stats.ready_to_ship ?? 0).toLocaleString()}
            </p>
            <p className="font-public text-[12px] font-normal text-[#6A7282]">Paid & unfulfilled</p>
          </div>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>

      {/* In Transit Card */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-[#FFF] p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            In Transit
          </h3>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
            <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </div>

        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <div>
            <p className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
              {(stats.in_transit ?? 0).toLocaleString()}
            </p>
            <p className="font-public text-[12px] font-normal text-[#6A7282]">Shipped orders</p>
          </div>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>

      {/* Completed Card */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-[#FFF] p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            Completed
          </h3>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>

        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <div>
            <p className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
              {(stats.completed ?? 0).toLocaleString()}
            </p>
            <p className="font-public text-[12px] font-normal text-[#6A7282]">Delivered orders</p>
          </div>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>
    </div>
  );
}
