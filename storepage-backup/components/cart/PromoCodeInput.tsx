'use client'

import React, { useState } from 'react'
import { useCart } from '@/lib/context/CartContext'

export const PromoCodeInput = (): React.JSX.Element => {
  const [code, setCode] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const {
    appliedCoupon,
    isApplyingCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
  } = useCart()

  const handleApply = async (): Promise<void> => {
    if (!code.trim()) return

    try {
      await applyCoupon(code.trim())
      setCode('')
      setIsExpanded(false)
    } catch {
      // Error is handled in context and displayed via couponError
    }
  }

  const handleRemove = async (): Promise<void> => {
    try {
      await removeCoupon()
    } catch {
      // Error is handled in context
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApply()
    }
  }

  // If coupon is applied, show applied state (discount amount shown in OrderSummary)
  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
          </svg>
          <span className="font-inter text-[14px] font-medium tracking-[-0.84px] text-black">
            {appliedCoupon.code}
          </span>
          <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999]">
            ({appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}% off` : appliedCoupon.discount_formatted})
          </span>
        </div>
        <button
          onClick={handleRemove}
          disabled={isApplyingCoupon}
          className="cursor-pointer font-inter text-[14px] font-medium tracking-[-0.84px] text-[#999] underline transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplyingCoupon ? 'Removing...' : 'Remove'}
        </button>
      </div>
    )
  }

  // Show input form
  return (
    <div>
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex w-full cursor-pointer items-center justify-between"
        >
          <span className="font-inter text-[14px] font-medium tracking-[-0.84px] text-black">
            Have a promo code?
          </span>
          <svg
            className="h-4 w-4 text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      ) : (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              id="promo-code"
              name="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="Enter promo code"
              disabled={isApplyingCoupon}
              className="flex-1 border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[14px] font-normal tracking-[-0.84px] text-black outline-none transition-colors placeholder:text-[#999] focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              onClick={handleApply}
              disabled={isApplyingCoupon || !code.trim()}
              className="cursor-pointer rounded-[48px] bg-black px-6 py-3 font-inter text-[14px] font-medium tracking-[-0.84px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplyingCoupon ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {couponError && (
            <p className="mt-2 font-inter text-[12px] font-medium tracking-[-0.72px] text-red-500">
              {couponError}
            </p>
          )}
          <button
            onClick={() => {
              setIsExpanded(false)
              setCode('')
            }}
            className="mt-2 cursor-pointer font-inter text-[12px] font-medium tracking-[-0.72px] text-[#999] underline transition-opacity hover:opacity-70"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
