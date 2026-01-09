'use client'

import React from 'react'
import { formatPoints } from '@/lib/api/membership'
import type { PointsBalance as PointsBalanceType } from '@/lib/types/membership'

type PointsBalanceProps = {
  points: PointsBalanceType
}

export function PointsBalance({ points }: PointsBalanceProps): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[#E3E3E3] bg-white p-6">
      <p className="mb-4 font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
        Points Balance
      </p>

      {/* Main Balance */}
      <div className="mb-6 text-center">
        <p className="font-inter text-[48px] font-bold leading-none text-black">
          {formatPoints(points.balance)}
        </p>
        <p className="mt-1 font-inter text-[14px] text-[#999]">Available points</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] p-4 text-center">
          <p className="font-inter text-[20px] font-bold text-black">
            {formatPoints(points.total_earned)}
          </p>
          <p className="font-inter text-[12px] font-medium text-[#999]">Total Earned</p>
        </div>

        <div className="rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] p-4 text-center">
          <p className="font-inter text-[20px] font-bold text-black">
            {formatPoints(points.total_redeemed)}
          </p>
          <p className="font-inter text-[12px] font-medium text-[#999]">Total Redeemed</p>
        </div>
      </div>
    </div>
  )
}
