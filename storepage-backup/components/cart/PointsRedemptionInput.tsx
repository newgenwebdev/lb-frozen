'use client'

import React, { useState, useEffect } from 'react'
import { useCart } from '@/lib/context/CartContext'
import { useCustomer } from '@/lib/context/CustomerContext'
import { formatPoints } from '@/lib/api/points'
import { getMembershipStatus } from '@/lib/api/membership'

export const PointsRedemptionInput = (): React.JSX.Element | null => {
  const [pointsToUse, setPointsToUse] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [isMember, setIsMember] = useState<boolean>(false)
  const [membershipLoading, setMembershipLoading] = useState<boolean>(true)

  const { isAuthenticated } = useCustomer()
  const {
    appliedPoints,
    pointsBalance,
    isApplyingPoints,
    pointsError,
    applyPoints,
    removePoints,
    loadPointsBalance,
    subtotal,
  } = useCart()

  // Load membership status and points balance when authenticated
  useEffect(() => {
    const checkMembership = async (): Promise<void> => {
      if (!isAuthenticated) {
        setIsMember(false)
        setMembershipLoading(false)
        return
      }

      try {
        const status = await getMembershipStatus()
        setIsMember(status?.is_member || false)
        if (status?.is_member) {
          await loadPointsBalance()
        }
      } catch (error) {
        console.error('Error checking membership:', error)
        setIsMember(false)
      } finally {
        setMembershipLoading(false)
      }
    }

    checkMembership()
  }, [isAuthenticated, loadPointsBalance])

  // Don't show if not authenticated or still loading
  if (!isAuthenticated || membershipLoading) {
    return null
  }

  // Don't show if not a member
  if (!isMember) {
    return null
  }

  // Don't show if no points balance available
  if (!pointsBalance || pointsBalance.balance <= 0) {
    return (
      <div className="text-center">
        <p className="font-inter text-[14px] font-medium tracking-[-0.84px] text-[#999]">
          No points available to redeem
        </p>
      </div>
    )
  }

  const handleApply = async (): Promise<void> => {
    const points = parseInt(pointsToUse, 10)
    if (isNaN(points) || points <= 0) return

    try {
      await applyPoints(points)
      setPointsToUse('')
      setIsExpanded(false)
    } catch {
      // Error is handled in context and displayed via pointsError
    }
  }

  const handleRemove = async (): Promise<void> => {
    try {
      await removePoints()
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

  // Calculate max points based on cart total (can't exceed cart total value)
  const redemptionRate = pointsBalance.redemption_rate || 0.01
  const pointsPerDollar = pointsBalance.redemption_info?.points_per_dollar || 100
  const maxPointsForCart = Math.floor((subtotal / 100) * pointsPerDollar)
  const maxUsablePoints = Math.min(pointsBalance.balance, maxPointsForCart)

  const handleUseMax = (): void => {
    setPointsToUse(maxUsablePoints.toString())
  }

  // Calculate estimated discount
  const pointsValue = parseInt(pointsToUse, 10) || 0
  const estimatedDiscount = (pointsValue * redemptionRate).toFixed(2)

  // If points are applied, show applied state
  if (appliedPoints) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
          </svg>
          <span className="font-inter text-[14px] font-medium tracking-[-0.84px] text-black">
            {formatPoints(appliedPoints.points)} points
          </span>
          <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999]">
            ({appliedPoints.discount_formatted} discount)
          </span>
        </div>
        <button
          onClick={handleRemove}
          disabled={isApplyingPoints}
          className="cursor-pointer font-inter text-[14px] font-medium tracking-[-0.84px] text-[#999] underline transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplyingPoints ? 'Removing...' : 'Remove'}
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
          <div className="flex items-center gap-2">
            <span className="font-inter text-[14px] font-medium tracking-[-0.84px] text-black">
              Use points
            </span>
            <span className="font-inter text-[12px] tracking-[-0.72px] text-amber-600">
              ({formatPoints(pointsBalance.balance)} available)
            </span>
          </div>
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
          <div className="mb-2 flex items-center justify-between">
            <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999]">
              Available: {formatPoints(pointsBalance.balance)} points
            </span>
            <button
              onClick={handleUseMax}
              disabled={isApplyingPoints}
              className="cursor-pointer font-inter text-[12px] font-medium tracking-[-0.72px] text-amber-600 underline transition-opacity hover:opacity-70 disabled:opacity-50"
            >
              Use max ({formatPoints(maxUsablePoints)})
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                id="points-input"
                name="points"
                value={pointsToUse}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (isNaN(value) || value < 0) {
                    setPointsToUse('')
                  } else if (value > maxUsablePoints) {
                    setPointsToUse(maxUsablePoints.toString())
                  } else {
                    setPointsToUse(e.target.value)
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter points"
                min="0"
                max={maxUsablePoints}
                disabled={isApplyingPoints}
                className="w-full border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[14px] font-normal tracking-[-0.84px] text-black outline-none transition-colors placeholder:text-[#999] focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
              />
              {pointsValue > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-inter text-[12px] text-amber-600">
                  = ${estimatedDiscount}
                </span>
              )}
            </div>
            <button
              onClick={handleApply}
              disabled={isApplyingPoints || !pointsToUse || parseInt(pointsToUse, 10) <= 0}
              className="cursor-pointer rounded-[48px] bg-black px-6 py-3 font-inter text-[14px] font-medium tracking-[-0.84px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplyingPoints ? 'Applying...' : 'Apply'}
            </button>
          </div>

          {pointsError && (
            <p className="mt-2 font-inter text-[12px] font-medium tracking-[-0.72px] text-red-500">
              {pointsError}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <span className="font-inter text-[11px] tracking-[-0.66px] text-[#999]">
              {pointsBalance.redemption_info?.example || `${pointsPerDollar} points = $1.00`}
            </span>
            <button
              onClick={() => {
                setIsExpanded(false)
                setPointsToUse('')
              }}
              className="cursor-pointer font-inter text-[12px] font-medium tracking-[-0.72px] text-[#999] underline transition-opacity hover:opacity-70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
