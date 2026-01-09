import React from "react"
import type { CategoryStats } from "@/lib/validators/category"

type CategoryStatsCardsProps = {
  stats: CategoryStats | undefined
  isLoading: boolean
}

export function CategoryStatsCards({
  stats,
  isLoading,
}: CategoryStatsCardsProps): React.JSX.Element {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:mb-8 md:grid-cols-3 md:gap-6">
      {/* Total Categories Card */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-white p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            Total Categories
          </h3>
          <button className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="8" cy="3" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="13" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="h-10 w-16 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <p className="font-geist text-[32px] font-medium leading-normal tracking-[-0.64px] text-[#030712]">
            {stats.total_categories}
          </p>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>

      {/* Active Categories Card */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-white p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            Active Categories
          </h3>
          <button className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="8" cy="3" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="13" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="h-10 w-16 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <p className="font-geist text-[32px] font-medium leading-normal tracking-[-0.64px] text-[#030712]">
            {stats.active_categories}
          </p>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>

      {/* Non Active Categories Card */}
      <div className="flex flex-col justify-between rounded-xl border border-[#E8E8E9] bg-white p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#161924]">
            Non Active Categories
          </h3>
          <button className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="8" cy="3" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="13" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="h-10 w-16 animate-pulse rounded bg-gray-200"></div>
        ) : stats ? (
          <p className="font-geist text-[32px] font-medium leading-normal tracking-[-0.64px] text-[#030712]">
            {stats.non_active_categories}
          </p>
        ) : (
          <p className="text-[14px] text-[#DC2626]">-</p>
        )}
      </div>
    </div>
  )
}
