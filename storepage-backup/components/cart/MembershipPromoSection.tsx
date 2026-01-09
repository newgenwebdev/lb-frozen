'use client'

import React, { useState, useEffect } from 'react'
import { useCart } from '@/lib/context/CartContext'
import { useCustomer } from '@/lib/context/CustomerContext'
import { getMembershipStatus } from '@/lib/api/membership'

/**
 * MembershipPromoSection
 * Displays membership promo benefits and allows applying/removing membership discounts
 * Only visible to authenticated members
 */
export function MembershipPromoSection(): React.JSX.Element | null {
  const {
    appliedMembershipPromo,
    isApplyingMembershipPromo,
    membershipPromoError,
    applyMembershipPromo,
    removeMembershipPromo,
  } = useCart()
  const { isAuthenticated, isLoading: isCustomerLoading } = useCustomer()

  // Track membership status from API
  const [isMember, setIsMember] = useState<boolean | null>(null)
  const [isCheckingMembership, setIsCheckingMembership] = useState(false)

  // Fetch membership status when authenticated
  useEffect(() => {
    const checkMembership = async (): Promise<void> => {
      if (!isAuthenticated) {
        setIsMember(null)
        return
      }

      setIsCheckingMembership(true)
      try {
        const status = await getMembershipStatus()
        setIsMember(status?.is_member === true)
      } catch {
        setIsMember(false)
      } finally {
        setIsCheckingMembership(false)
      }
    }

    checkMembership()
  }, [isAuthenticated])

  // Don't show if customer is still loading or checking membership
  if (isCustomerLoading || isCheckingMembership || isMember === null) {
    return null
  }

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Don't show if not a member
  if (!isMember) {
    return null
  }

  const handleApplyPromo = async (): Promise<void> => {
    try {
      await applyMembershipPromo()
    } catch {
      // Error is handled in context
    }
  }

  const handleRemovePromo = async (): Promise<void> => {
    try {
      await removeMembershipPromo()
    } catch {
      // Error is handled in context
    }
  }

  // If promo is already applied, show the applied state
  if (appliedMembershipPromo) {
    return (
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-inter text-[14px] font-medium text-purple-800">
                Member Discount Applied
              </p>
              <p className="font-inter text-[12px] text-purple-600">
                {appliedMembershipPromo.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemovePromo}
            disabled={isApplyingMembershipPromo}
            className="cursor-pointer font-inter text-[12px] font-medium text-purple-600 underline hover:text-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApplyingMembershipPromo ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    )
  }

  // Show option to apply membership promo
  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          <div>
            <p className="font-inter text-[14px] font-medium text-purple-800">
              Member Exclusive Discount
            </p>
            <p className="font-inter text-[12px] text-purple-600">
              You may be eligible for a special member discount
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleApplyPromo}
          disabled={isApplyingMembershipPromo}
          className="cursor-pointer rounded-full bg-purple-600 px-4 py-2 font-inter text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApplyingMembershipPromo ? (
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Checking...
            </span>
          ) : (
            'Apply Discount'
          )}
        </button>
      </div>

      {/* Error message */}
      {membershipPromoError && (
        <p className="mt-2 font-inter text-[12px] text-red-600">
          {membershipPromoError}
        </p>
      )}
    </div>
  )
}
