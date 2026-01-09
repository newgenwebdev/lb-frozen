'use client'

import React from 'react'
import { getTierColor, getTierStars } from '@/lib/api/membership'
import type { CurrentTier, Membership } from '@/lib/types/membership'

type MembershipCardProps = {
  membership: Membership
  tier: CurrentTier
}

export function MembershipCard({ membership, tier }: MembershipCardProps): React.JSX.Element {
  const tierColors = getTierColor(tier.slug, tier.rank)
  const stars = getTierStars(tier.rank)

  // Format the activation date
  const memberSince = new Date(membership.activated_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="rounded-2xl border border-[#E3E3E3] bg-white p-6">
      <p className="mb-4 font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
        Your Membership
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tier Badge */}
        <div className="flex items-center gap-4">
          <div
            className={`flex h-16 w-16 flex-col items-center justify-center rounded-xl border ${tierColors.border} ${tierColors.bg}`}
          >
            <span className={`font-inter text-[14px] font-bold uppercase ${tierColors.text}`}>
              {tier.name}
            </span>
            <span className={`text-[10px] ${tierColors.text} opacity-80`}>{stars}</span>
          </div>

          <div>
            <p className="font-inter text-[16px] font-medium leading-tight text-black">
              {tier.name} Member
            </p>
            <p className="font-inter text-[14px] text-[#999]">
              Member since {memberSince}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 sm:self-center ${
            membership.status === 'active'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              membership.status === 'active' ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="font-inter text-[12px] font-medium capitalize">
            {membership.status}
          </span>
        </div>
      </div>
    </div>
  )
}
