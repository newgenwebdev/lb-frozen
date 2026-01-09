'use client'

import React from 'react'
import { formatCurrency } from '@/lib/api/membership'
import type { CurrentTier, NextTier, CustomerActivity } from '@/lib/types/membership'

type TierProgressProps = {
  currentTier: CurrentTier
  nextTier: NextTier | null
  activity: CustomerActivity
  evaluationPeriod?: number // Rolling period in months (default: 12)
}

export function TierProgress({
  currentTier,
  nextTier,
  activity,
  evaluationPeriod = 12,
}: TierProgressProps): React.JSX.Element {
  // If no next tier, user is at the highest tier
  if (!nextTier) {
    return (
      <div className="rounded-2xl border border-[#E3E3E3] bg-white p-6">
        <p className="mb-4 font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
          Tier Status
        </p>

        <div className="rounded-xl bg-gradient-to-r from-gray-700 to-gray-900 p-6 text-center text-white">
          <p className="font-inter text-[14px] font-medium uppercase tracking-wider opacity-80">
            Congratulations!
          </p>
          <p className="mt-2 font-inter text-[24px] font-bold">
            You&apos;ve reached the highest tier
          </p>
          <p className="mt-1 font-inter text-[14px] opacity-80">
            Enjoy all the exclusive {currentTier.name} benefits
          </p>
        </div>
      </div>
    )
  }

  // Calculate progress percentages
  const orderProgress = nextTier.order_threshold > 0
    ? Math.min(100, (activity.rolling_order_count / nextTier.order_threshold) * 100)
    : 100

  const spendProgress = nextTier.spend_threshold > 0
    ? Math.min(100, (activity.rolling_spend_total / nextTier.spend_threshold) * 100)
    : 100

  // Overall progress is the minimum of both (need to meet both thresholds)
  const overallProgress = Math.min(orderProgress, spendProgress)

  return (
    <div className="rounded-2xl border border-[#E3E3E3] bg-white p-6">
      <p className="mb-4 font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
        Progress to Next Tier
      </p>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-inter text-[14px] font-medium text-black">
            {currentTier.name}
          </span>
          <span className="font-inter text-[14px] font-medium text-black">
            {nextTier.name}
          </span>
        </div>

        <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#E3E3E3]">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-black transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Requirements */}
      <div className="space-y-3">
        <p className="font-inter text-[14px] font-medium text-[#999]">
          To reach {nextTier.name}:
        </p>

        {/* Orders Progress */}
        <div className="flex items-center justify-between rounded-lg bg-[#FAFAFA] px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className={`h-5 w-5 ${orderProgress >= 100 ? 'text-green-500' : 'text-[#999]'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {orderProgress >= 100 ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              )}
            </svg>
            <span className="font-inter text-[14px] text-black">Orders</span>
          </div>
          <span className="font-inter text-[14px] font-medium text-black">
            {activity.rolling_order_count} / {nextTier.order_threshold}
            {nextTier.orders_needed > 0 && (
              <span className="ml-2 text-[#999]">({nextTier.orders_needed} more)</span>
            )}
          </span>
        </div>

        {/* Spend Progress */}
        <div className="flex items-center justify-between rounded-lg bg-[#FAFAFA] px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className={`h-5 w-5 ${spendProgress >= 100 ? 'text-green-500' : 'text-[#999]'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {spendProgress >= 100 ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            <span className="font-inter text-[14px] text-black">Total Spend</span>
          </div>
          <span className="font-inter text-[14px] font-medium text-black">
            {formatCurrency(activity.rolling_spend_total)} / {formatCurrency(nextTier.spend_threshold)}
            {nextTier.spend_needed > 0 && (
              <span className="ml-2 text-[#999]">({formatCurrency(nextTier.spend_needed)} more)</span>
            )}
          </span>
        </div>
      </div>

      <p className="mt-4 font-inter text-[12px] text-[#999]">
        Based on your activity in the last {evaluationPeriod} months
      </p>
    </div>
  )
}
