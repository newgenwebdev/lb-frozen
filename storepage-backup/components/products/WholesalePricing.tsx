'use client'

import React from 'react'
import type { MedusaVariantPrice } from '@/lib/api/types'

export type WholesaleTier = {
  minQty: number
  maxQty: number | null
  price: number // in cents
  savings?: number // percentage savings vs base price
}

type WholesalePricingProps = {
  tiers: WholesaleTier[]
  currentQuantity: number
  currencyCode?: string
}

/**
 * Extract wholesale pricing tiers from variant prices
 * Filters out base price (no min_quantity or min_quantity <= 1)
 */
export function getWholesaleTiers(
  prices: MedusaVariantPrice[] | undefined,
  basePriceAmount: number
): WholesaleTier[] {
  if (!prices || prices.length === 0) return []

  // Filter prices that have min_quantity > 1 (wholesale tiers)
  const wholesalePrices = prices
    .filter((p) => p.min_quantity && p.min_quantity > 1)
    .sort((a, b) => (a.min_quantity || 0) - (b.min_quantity || 0))

  if (wholesalePrices.length === 0) return []

  return wholesalePrices.map((p) => ({
    minQty: p.min_quantity || 1,
    maxQty: p.max_quantity || null,
    price: p.amount,
    savings: basePriceAmount > 0
      ? Math.round((1 - p.amount / basePriceAmount) * 100)
      : 0,
  }))
}

/**
 * Get the applicable price for a given quantity
 * Returns the tier price if quantity meets threshold, otherwise base price
 */
export function getPriceForQuantity(
  prices: MedusaVariantPrice[] | undefined,
  quantity: number,
  basePriceAmount: number
): { amount: number; tier: WholesaleTier | null } {
  if (!prices || prices.length === 0) {
    return { amount: basePriceAmount, tier: null }
  }

  // Sort tiers by min_quantity descending to find the highest applicable tier
  const applicableTiers = prices
    .filter((p) => p.min_quantity && p.min_quantity > 1 && quantity >= p.min_quantity)
    .sort((a, b) => (b.min_quantity || 0) - (a.min_quantity || 0))

  if (applicableTiers.length > 0) {
    const tier = applicableTiers[0]
    return {
      amount: tier.amount,
      tier: {
        minQty: tier.min_quantity || 1,
        maxQty: tier.max_quantity || null,
        price: tier.amount,
        savings: basePriceAmount > 0
          ? Math.round((1 - tier.amount / basePriceAmount) * 100)
          : 0,
      },
    }
  }

  return { amount: basePriceAmount, tier: null }
}

/**
 * Format price from cents to display format
 */
function formatPrice(amountInCents: number, currencyCode: string = 'SGD'): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currencyCode,
  }).format(amountInCents / 100)
}

/**
 * Get the next tier info for upsell messaging
 */
export function getNextTierInfo(
  tiers: WholesaleTier[],
  currentQuantity: number
): { tier: WholesaleTier; qtyNeeded: number } | null {
  if (tiers.length === 0) return null

  // Find the next tier that hasn't been reached yet
  const nextTier = tiers.find((t) => currentQuantity < t.minQty)
  if (!nextTier) return null

  return {
    tier: nextTier,
    qtyNeeded: nextTier.minQty - currentQuantity,
  }
}

export const WholesalePricing = ({
  tiers,
  currentQuantity,
  currencyCode = 'SGD',
}: WholesalePricingProps): React.JSX.Element | null => {
  if (tiers.length === 0) return null

  // Find current active tier
  const activeTierIndex = tiers.findIndex(
    (t, i) =>
      currentQuantity >= t.minQty &&
      (t.maxQty === null || currentQuantity <= t.maxQty || i === tiers.length - 1)
  )

  // Get next tier info for upsell
  const nextTierInfo = getNextTierInfo(tiers, currentQuantity)

  return (
    <div className="mb-6 rounded-xl border border-[#E3E3E3] bg-[#FAFAFA] p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-black"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <span className="font-inter text-[14px] font-medium leading-[100%] tracking-[-0.84px] text-black">
          Bulk Pricing
        </span>
      </div>

      {/* Tiers Table */}
      <div className="mb-3 overflow-hidden rounded-lg border border-[#E3E3E3] bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E3E3E3] bg-[#F7F7F7]">
              <th className="px-3 py-2 text-left font-inter text-[12px] font-medium uppercase tracking-[-0.72px] text-[#666]">
                Quantity
              </th>
              <th className="px-3 py-2 text-right font-inter text-[12px] font-medium uppercase tracking-[-0.72px] text-[#666]">
                Price/Unit
              </th>
              <th className="px-3 py-2 text-right font-inter text-[12px] font-medium uppercase tracking-[-0.72px] text-[#666]">
                Save
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, index) => {
              const isActive = index === activeTierIndex
              const qtyRange =
                tier.maxQty === null
                  ? `${tier.minQty}+`
                  : `${tier.minQty}-${tier.maxQty}`

              return (
                <tr
                  key={index}
                  className={`border-b border-[#E3E3E3] last:border-b-0 ${
                    isActive ? 'bg-green-50' : ''
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                      )}
                      <span
                        className={`font-inter text-[13px] tracking-[-0.78px] ${
                          isActive ? 'font-medium text-green-700' : 'text-[#333]'
                        }`}
                      >
                        {qtyRange}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`font-inter text-[13px] tracking-[-0.78px] ${
                        isActive ? 'font-medium text-green-700' : 'text-[#333]'
                      }`}
                    >
                      {formatPrice(tier.price, currencyCode)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`font-inter text-[12px] tracking-[-0.72px] ${
                        isActive
                          ? 'font-medium text-green-600'
                          : 'text-[#666]'
                      }`}
                    >
                      {tier.savings && tier.savings > 0 ? `-${tier.savings}%` : '-'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Upsell Message */}
      {nextTierInfo && (
        <p className="font-inter text-[12px] leading-[150%] tracking-[-0.24px] text-[#666]">
          Add{' '}
          <span className="font-medium text-black">{nextTierInfo.qtyNeeded} more</span>{' '}
          to save{' '}
          <span className="font-medium text-green-600">
            {nextTierInfo.tier.savings}%
          </span>{' '}
          per unit
        </p>
      )}
    </div>
  )
}
