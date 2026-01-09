'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import { getMembershipStatus, getMembershipInfo } from '@/lib/api/membership'
import type { MembershipStatusResponse, MembershipInfoResponse } from '@/lib/types/membership'

import { MembershipCard } from '@/components/account/MembershipCard'
import { MembershipBenefits } from '@/components/account/MembershipBenefits'
import { PointsBalance } from '@/components/account/PointsBalance'
import { TierProgress } from '@/components/account/TierProgress'
import { TierComparison } from '@/components/account/TierComparison'
import { MembershipCTA } from '@/components/account/MembershipCTA'
import { MembershipPurchaseModal } from '@/components/account/MembershipPurchaseModal'

export default function MembershipPage(): React.JSX.Element {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useCustomer()

  const [membershipData, setMembershipData] = useState<MembershipStatusResponse | null>(null)
  const [programInfo, setProgramInfo] = useState<MembershipInfoResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/account/membership')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch membership data and program config
  useEffect(() => {
    async function fetchData(): Promise<void> {
      if (!isAuthenticated) return

      try {
        setIsLoading(true)
        setError(null)

        // Fetch both membership status and program info in parallel
        const [statusData, infoData] = await Promise.all([
          getMembershipStatus(),
          getMembershipInfo(),
        ])

        setMembershipData(statusData)
        setProgramInfo(infoData)
      } catch (err) {
        console.error('Error fetching membership:', err)
        setError('Failed to load membership information')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated])

  // Handle join/purchase button click
  const handleJoinClick = useCallback((): void => {
    if (programInfo?.config.program_type === 'paid') {
      setShowPurchaseModal(true)
    } else {
      // For free programs without auto-enroll, redirect to shop
      router.push('/shop')
    }
  }, [programInfo, router])

  // Handle successful purchase
  const handlePurchaseSuccess = useCallback((): void => {
    setShowPurchaseModal(false)
    // Refresh membership data
    getMembershipStatus().then(setMembershipData)
  }, [])

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 animate-spin text-black" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="font-inter text-[14px] text-black">Loading membership...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="font-inter text-[16px] text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 cursor-pointer rounded-full bg-black px-6 py-2 font-inter text-[14px] font-medium text-white transition-colors hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Program disabled state
  if (programInfo && !programInfo.config.is_enabled) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="font-inter text-[24px] font-medium text-black">
            Membership Program Coming Soon
          </h2>
          <p className="mt-2 font-inter text-[16px] text-[#999]">
            Our membership program is currently being set up. Check back soon!
          </p>
        </div>
      </div>
    )
  }

  // Get tiers from either source
  const allTiers = membershipData?.all_tiers || programInfo?.tiers.all_tiers || []

  // Non-member view
  if (!membershipData || !membershipData.is_member) {
    return (
      <div className="space-y-6">
        <MembershipCTA
          tiers={allTiers}
          config={programInfo?.config}
          defaultTier={programInfo?.tiers.default_tier}
          benefits={programInfo?.benefits}
          onJoinClick={handleJoinClick}
        />
        {allTiers.length > 0 && (
          <TierComparison tiers={allTiers} />
        )}

        {/* Purchase Modal for paid programs */}
        {programInfo?.config.program_type === 'paid' && (
          <MembershipPurchaseModal
            isOpen={showPurchaseModal}
            onClose={() => setShowPurchaseModal(false)}
            onSuccess={handlePurchaseSuccess}
            config={programInfo.config}
          />
        )}
      </div>
    )
  }

  // Member view
  const { membership, tier, activity, next_tier, points } = membershipData

  return (
    <div className="space-y-6">
      {/* Membership Card */}
      {membership && tier && <MembershipCard membership={membership} tier={tier} />}

      {/* Benefits */}
      {tier && <MembershipBenefits tier={tier} />}

      {/* Points Balance */}
      {points && <PointsBalance points={points} />}

      {/* Tier Progress */}
      {tier && activity && (
        <TierProgress
          currentTier={tier}
          nextTier={next_tier}
          activity={activity}
          evaluationPeriod={programInfo?.config.evaluation_period_months}
        />
      )}

      {/* Tier Comparison */}
      {allTiers.length > 0 && (
        <TierComparison tiers={allTiers} currentTierSlug={membership?.tier_slug} />
      )}
    </div>
  )
}
