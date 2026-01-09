'use client'

import React from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/api/membership'
import type { Tier, MembershipConfig, DefaultTier } from '@/lib/types/membership'

type MembershipCTAProps = {
  tiers: Tier[]
  config?: MembershipConfig | null
  defaultTier?: DefaultTier | null
  benefits?: string[]
  onJoinClick?: () => void
}

/**
 * Check icon component for benefit list
 */
function CheckIcon(): React.JSX.Element {
  return (
    <svg
      className="mt-0.5 h-5 w-5 shrink-0 text-green-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function MembershipCTA({
  tiers,
  config,
  defaultTier,
  benefits,
  onJoinClick,
}: MembershipCTAProps): React.JSX.Element {
  // Get benefits from the highest tier for fallback
  const highestTier = tiers.length > 0
    ? tiers.reduce((max, tier) => (tier.rank > max.rank ? tier : max), tiers[0])
    : null

  // Determine if program is free or paid
  const isFreeProgram = !config || config.program_type === 'free'
  const isPaidProgram = config?.program_type === 'paid'

  // Format membership price
  const formattedPrice = isPaidProgram && config
    ? formatCurrency(config.price, config.currency)
    : null

  // Get duration text
  const getDurationText = (): string => {
    if (!config || config.duration_months === null) {
      return 'Lifetime'
    }
    if (config.duration_months === 1) {
      return '1 Month'
    }
    if (config.duration_months === 12) {
      return '1 Year'
    }
    return `${config.duration_months} Months`
  }

  // Default tier name for display
  const startingTierName = defaultTier?.name || 'Classic'

  // Use provided benefits or generate fallback
  const displayBenefits = benefits && benefits.length > 0
    ? benefits
    : [
        `Earn points on every purchase${highestTier ? ` (up to ${highestTier.points_multiplier}x multiplier)` : ''}`,
        'Exclusive member-only promotions',
        highestTier && highestTier.discount_percentage > 0
          ? `Tier-based discounts up to ${highestTier.discount_percentage}% off`
          : 'Tier-based discounts on purchases',
        'Birthday vouchers as you level up',
        'Automatic tier upgrades based on your activity',
      ]

  return (
    <div className="rounded-2xl border border-[#E3E3E3] bg-white p-8">
      <div className="mx-auto max-w-2xl text-center">
        {/* Header with optional price badge */}
        <div className="flex flex-col items-center gap-3">
          {isPaidProgram && formattedPrice && (
            <span className="inline-block rounded-full bg-black px-4 py-1.5 font-inter text-[14px] font-medium text-white">
              {formattedPrice} / {getDurationText()}
            </span>
          )}
          {isFreeProgram && (
            <span className="inline-block rounded-full bg-green-100 px-4 py-1.5 font-inter text-[14px] font-medium text-green-700">
              Free to Join
            </span>
          )}
          <h2 className="font-inter text-[28px] font-medium leading-tight tracking-[-0.56px] text-black">
            Join Our Membership Program
          </h2>
        </div>

        <p className="mt-3 font-inter text-[16px] text-[#999]">
          Earn points, unlock exclusive discounts, and enjoy special birthday rewards.
        </p>

        {/* Benefits List */}
        <div className="mt-8 space-y-3 text-left">
          {displayBenefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckIcon />
              <span className="font-inter text-[14px] text-black">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Info Box - Different messaging for free vs paid */}
        <div className="mt-8 rounded-xl bg-[#FAFAFA] p-4">
          {isFreeProgram && config?.auto_enroll_on_first_order ? (
            <p className="font-inter text-[14px] text-[#666]">
              Your membership starts automatically with your first order.
              <br />
              You&apos;ll begin at the {startingTierName} tier and can earn your way up!
            </p>
          ) : isFreeProgram ? (
            <p className="font-inter text-[14px] text-[#666]">
              Join for free and start earning rewards today.
              <br />
              You&apos;ll begin at the {startingTierName} tier and can earn your way up!
            </p>
          ) : (
            <p className="font-inter text-[14px] text-[#666]">
              {config?.duration_months === null ? 'One-time payment for lifetime access.' : `${getDurationText()} membership.`}
              <br />
              You&apos;ll begin at the {startingTierName} tier and can earn your way up!
            </p>
          )}
        </div>

        {/* CTA Button - Different for free vs paid */}
        {isFreeProgram && config?.auto_enroll_on_first_order ? (
          <Link
            href="/products"
            className="mt-6 inline-block cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-white transition-colors hover:bg-gray-800"
          >
            Start Shopping
          </Link>
        ) : isFreeProgram ? (
          <button
            onClick={onJoinClick}
            className="mt-6 inline-block cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-white transition-colors hover:bg-gray-800"
          >
            Join Free
          </button>
        ) : (
          <button
            onClick={onJoinClick}
            className="mt-6 inline-block cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-white transition-colors hover:bg-gray-800"
          >
            Join Now for {formattedPrice}
          </button>
        )}
      </div>
    </div>
  )
}
