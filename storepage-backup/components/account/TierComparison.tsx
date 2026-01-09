'use client'

import React from 'react'
import { formatCurrency, getTierColor } from '@/lib/api/membership'
import type { Tier } from '@/lib/types/membership'

type TierComparisonProps = {
  tiers: Tier[]
  currentTierSlug?: string
}

export function TierComparison({ tiers, currentTierSlug }: TierComparisonProps): React.JSX.Element {
  // Sort tiers by rank
  const sortedTiers = [...tiers].sort((a, b) => a.rank - b.rank)

  return (
    <div className="rounded-2xl border border-[#E3E3E3] bg-white p-6">
      <p className="mb-4 font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
        All Tiers
      </p>

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E3E3E3]">
              <th className="pb-3 text-left font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
                Tier
              </th>
              <th className="pb-3 text-center font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
                Requirements
              </th>
              <th className="pb-3 text-center font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
                Points
              </th>
              <th className="pb-3 text-center font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
                Discount
              </th>
              <th className="pb-3 text-center font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
                Birthday
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTiers.map((tier) => {
              const isCurrentTier = tier.slug === currentTierSlug
              const tierColors = getTierColor(tier.slug, tier.rank)

              return (
                <tr
                  key={tier.slug}
                  className={`border-b border-[#E3E3E3] last:border-b-0 ${
                    isCurrentTier ? 'bg-[#FAFAFA]' : ''
                  }`}
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border ${tierColors.border} ${tierColors.bg}`}
                      >
                        <span className={`font-inter text-[10px] font-bold uppercase ${tierColors.text}`}>
                          {tier.name.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-inter text-[14px] font-medium text-black">
                          {tier.name}
                          {isCurrentTier && (
                            <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                              Current
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    <p className="font-inter text-[14px] text-black">
                      {tier.order_threshold === 0 && tier.spend_threshold === 0 ? (
                        <span className="text-[#999]">Default</span>
                      ) : (
                        <>
                          {tier.order_threshold}+ orders
                          <br />
                          <span className="text-[#999]">
                            {formatCurrency(tier.spend_threshold)}+ spend
                          </span>
                        </>
                      )}
                    </p>
                  </td>
                  <td className="py-4 text-center">
                    <p className="font-inter text-[14px] font-medium text-black">
                      {tier.points_multiplier}x
                    </p>
                  </td>
                  <td className="py-4 text-center">
                    <p className="font-inter text-[14px] font-medium text-black">
                      {tier.discount_percentage > 0 ? `${tier.discount_percentage}%` : '-'}
                    </p>
                  </td>
                  <td className="py-4 text-center">
                    <p className="font-inter text-[14px] font-medium text-black">
                      {tier.birthday_voucher_amount > 0
                        ? formatCurrency(tier.birthday_voucher_amount)
                        : '-'}
                    </p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-4 md:hidden">
        {sortedTiers.map((tier) => {
          const isCurrentTier = tier.slug === currentTierSlug
          const tierColors = getTierColor(tier.slug, tier.rank)

          return (
            <div
              key={tier.slug}
              className={`rounded-xl border p-4 ${
                isCurrentTier ? 'border-black bg-[#FAFAFA]' : 'border-[#E3E3E3]'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border ${tierColors.border} ${tierColors.bg}`}
                  >
                    <span className={`font-inter text-[10px] font-bold uppercase ${tierColors.text}`}>
                      {tier.name.slice(0, 2)}
                    </span>
                  </div>
                  <p className="font-inter text-[16px] font-medium text-black">{tier.name}</p>
                </div>
                {isCurrentTier && (
                  <span className="rounded-full bg-black px-2 py-0.5 text-[10px] text-white">
                    Current
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white p-2">
                  <p className="font-inter text-[16px] font-bold text-black">
                    {tier.points_multiplier}x
                  </p>
                  <p className="font-inter text-[10px] text-[#999]">Points</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <p className="font-inter text-[16px] font-bold text-black">
                    {tier.discount_percentage > 0 ? `${tier.discount_percentage}%` : '-'}
                  </p>
                  <p className="font-inter text-[10px] text-[#999]">Discount</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <p className="font-inter text-[16px] font-bold text-black">
                    {tier.birthday_voucher_amount > 0
                      ? formatCurrency(tier.birthday_voucher_amount)
                      : '-'}
                  </p>
                  <p className="font-inter text-[10px] text-[#999]">Birthday</p>
                </div>
              </div>

              {(tier.order_threshold > 0 || tier.spend_threshold > 0) && (
                <p className="mt-3 font-inter text-[12px] text-[#999]">
                  Requires {tier.order_threshold}+ orders & {formatCurrency(tier.spend_threshold)}+ spend
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
