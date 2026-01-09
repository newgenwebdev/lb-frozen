import React from "react";
import type { ReturnStats } from "@/lib/validators/return";

type ReturnStatsCardsProps = {
  stats: ReturnStats | undefined;
  isLoading: boolean;
};

export function ReturnStatsCards({ stats, isLoading }: ReturnStatsCardsProps): React.JSX.Element {
  const formatCurrency = (amount: number, currency: string = "sgd"): string => {
    return `$ ${(amount / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:mb-8 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
      {/* Total Returns Card */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-[#FFF] p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            Total Returns
          </h3>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          </span>
        </div>

        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <div>
            <p className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
              {stats.total_returns.toLocaleString()}
            </p>
            <p className="font-public text-[12px] font-normal text-[#6A7282]">All time</p>
          </div>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>

      {/* Pending Returns Card */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-[#FFF] p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            Pending Review
          </h3>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>

        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <div>
            <p className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
              {stats.pending_returns.toLocaleString()}
            </p>
            <p className="font-public text-[12px] font-normal text-[#6A7282]">Awaiting approval</p>
          </div>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>

      {/* In Progress Card */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-[#FFF] p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            In Progress
          </h3>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </span>
        </div>

        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <div>
            <p className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
              {stats.in_progress.toLocaleString()}
            </p>
            <p className="font-public text-[12px] font-normal text-[#6A7282]">Approved & processing</p>
          </div>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>

      {/* Total Refunded Card */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-[#FFF] p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            Total Refunded
          </h3>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>

        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <div>
            <p className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
              {formatCurrency(stats.total_refunded, stats.currency || "sgd")}
            </p>
            <p className="font-public text-[12px] font-normal text-[#6A7282]">{stats.completed} completed</p>
          </div>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>
    </div>
  );
}
