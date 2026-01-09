'use client'

import React from 'react'
import { formatCurrency } from '@/lib/api/membership'
import type { CurrentTier } from '@/lib/types/membership'

type MembershipBenefitsProps = {
  tier: CurrentTier
}

export function MembershipBenefits({ tier }: MembershipBenefitsProps): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[#E3E3E3] bg-white p-6">
      <p className="mb-4 font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
        Your Benefits
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Points Multiplier */}
        <div className="rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] p-4 text-center">
          <p className="font-inter text-[28px] font-bold text-black">
            {tier.points_multiplier}x
          </p>
          <p className="font-inter text-[14px] font-medium text-[#999]">
            Points Multiplier
          </p>
        </div>

        {/* Discount */}
        <div className="rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] p-4 text-center">
          <p className="font-inter text-[28px] font-bold text-black">
            {tier.discount_percentage}%
          </p>
          <p className="font-inter text-[14px] font-medium text-[#999]">
            Member Discount
          </p>
        </div>

        {/* Birthday Voucher */}
        <div className="rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] p-4 text-center">
          <p className="font-inter text-[28px] font-bold text-black">
            {tier.birthday_voucher_amount > 0
              ? formatCurrency(tier.birthday_voucher_amount)
              : '-'}
          </p>
          <p className="font-inter text-[14px] font-medium text-[#999]">
            Birthday Voucher
          </p>
        </div>
      </div>
    </div>
  )
}
