'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { useCart } from '@/lib/context/CartContext'
import {
  checkPWPEligibility as fetchPWPOffers,
  applyPWPOffer,
  formatPrice,
  formatPWPDiscount,
  isPWPItem,
  type PWPOffer,
  type PWPVariant,
} from '@/lib/api/pwp'

type PWPOffersProps = {
  className?: string
}

export const PWPOffers = ({ className = '' }: PWPOffersProps): React.JSX.Element | null => {
  const { medusaCart, refreshCart, subtotal, items } = useCart()
  const [rawOffers, setRawOffers] = useState<PWPOffer[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [applyingRuleId, setApplyingRuleId] = useState<string | null>(null)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  // Track cart ID to refetch when cart changes (e.g., after applying PWP)
  const lastCartIdRef = useRef<string | null>(null)
  const lastItemCountRef = useRef<number>(0)

  // Calculate cart value excluding PWP items (for eligibility check)
  const cartValueExcludingPWP = useMemo(() => {
    return items.reduce((sum, item) => {
      if (isPWPItem(item)) return sum
      return sum + (item.unit_price || 0) * item.quantity
    }, 0)
  }, [items])

  // Locally recalculate eligibility based on current cart value
  // This provides instant UI updates when +/- buttons are pressed
  const offers = useMemo(() => {
    return rawOffers.map((offer) => {
      // For cart_value triggers, recalculate eligibility locally
      if (offer.trigger_type === 'cart_value') {
        const triggerValue = offer.trigger_cart_value || 0
        const triggerMet = cartValueExcludingPWP >= triggerValue
        return { ...offer, trigger_met: triggerMet }
      }
      // For product triggers, keep the server-calculated value
      return offer
    })
  }, [rawOffers, cartValueExcludingPWP])

  // Fetch offers from server (only on initial load or after cart structure changes)
  const fetchOffers = useCallback(async (): Promise<void> => {
    if (!medusaCart?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchPWPOffers(medusaCart.id)
      // Show all cart_value offers (both eligible and locked) + eligible product offers
      // Filter out: out of stock, product-trigger offers that aren't met, and already applied offers
      const visibleOffers = (result.all_offers || []).filter((offer) => {
        // Don't show out of stock offers
        if (offer.is_out_of_stock) return false
        // Don't show already applied offers
        if (offer.already_applied) return false
        // Show all cart_value offers (even if not yet eligible)
        if (offer.trigger_type === 'cart_value') return true
        // Only show product-trigger offers if they're eligible
        if (offer.trigger_type === 'product' && offer.trigger_met) return true
        return false
      })
      setRawOffers(visibleOffers)
    } catch (err) {
      console.error('[PWP] Failed to fetch offers:', err)
      setError(err instanceof Error ? err.message : 'Failed to load offers')
    } finally {
      setIsLoading(false)
    }
  }, [medusaCart?.id])

  // Fetch offers on initial load and when cart items change (add/remove)
  // We don't refetch on quantity changes - eligibility is recalculated locally
  useEffect(() => {
    const currentItemCount = items.filter(item => !isPWPItem(item)).length
    const cartIdChanged = medusaCart?.id !== lastCartIdRef.current
    const itemCountChanged = currentItemCount !== lastItemCountRef.current

    if (cartIdChanged || itemCountChanged) {
      lastCartIdRef.current = medusaCart?.id || null
      lastItemCountRef.current = currentItemCount
      fetchOffers()
    }
  }, [medusaCart?.id, items, fetchOffers])

  const handleApplyOffer = async (offer: PWPOffer): Promise<void> => {
    console.log('[PWP] handleApplyOffer called with offer:', offer)

    if (!medusaCart?.id) {
      console.error('[PWP] No cart ID available')
      setError('No cart available')
      return
    }

    if (!offer.reward_product) {
      console.error('[PWP] No reward product in offer:', offer)
      setError('No reward product configured for this offer')
      return
    }

    // Get selected variant or default to first variant
    const variantId = selectedVariants[offer.rule_id] || offer.reward_product.variants[0]?.id
    console.log('[PWP] Selected variant ID:', variantId, 'from variants:', offer.reward_product.variants)

    if (!variantId) {
      console.error('[PWP] No variant ID available')
      setError('No variant available for this product')
      return
    }

    setApplyingRuleId(offer.rule_id)
    setError(null)

    try {
      console.log('[PWP] Calling applyPWPOffer with:', { cartId: medusaCart.id, ruleId: offer.rule_id, variantId })
      await applyPWPOffer(medusaCart.id, offer.rule_id, variantId)
      await refreshCart()
      // Remove the applied offer from the list locally
      setRawOffers((prev) => prev.filter((o) => o.rule_id !== offer.rule_id))
    } catch (err) {
      console.error('[PWP] Failed to apply offer:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply offer')
    } finally {
      setApplyingRuleId(null)
    }
  }

  const handleVariantChange = (ruleId: string, variantId: string): void => {
    setSelectedVariants((prev) => ({
      ...prev,
      [ruleId]: variantId,
    }))
  }

  // Don't render if no cart or no eligible offers
  if (!medusaCart?.id || (offers.length === 0 && !isLoading)) {
    return null
  }

  const currencyCode = medusaCart.currency_code || 'SGD'

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <svg
          className="h-5 w-5 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
        <span className="font-inter text-[14px] font-semibold tracking-[-0.84px] text-black">
          Special Offers Available
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <span className="ml-2 font-inter text-[12px] text-[#666]">Loading offers...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2">
          <p className="font-inter text-[12px] text-red-600">{error}</p>
        </div>
      )}

      {/* Offers list */}
      {!isLoading && offers.length > 0 && (
        <div className="space-y-3">
          {offers.map((offer) => (
            <PWPOfferCard
              key={offer.rule_id}
              offer={offer}
              currencyCode={currencyCode}
              cartValue={cartValueExcludingPWP}
              selectedVariantId={selectedVariants[offer.rule_id]}
              onVariantChange={(variantId) => handleVariantChange(offer.rule_id, variantId)}
              onApply={() => handleApplyOffer(offer)}
              isApplying={applyingRuleId === offer.rule_id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PWP Offer Card Component
// ============================================================================

type PWPOfferCardProps = {
  offer: PWPOffer
  currencyCode: string
  cartValue: number
  selectedVariantId?: string
  onVariantChange: (variantId: string) => void
  onApply: () => void
  isApplying: boolean
}

const PWPOfferCard = ({
  offer,
  currencyCode,
  cartValue,
  selectedVariantId,
  onVariantChange,
  onApply,
  isApplying,
}: PWPOfferCardProps): React.JSX.Element => {
  const product = offer.reward_product
  const variants = product?.variants || []
  // Filter to only show variants with stock
  const availableVariants = variants.filter(v =>
    v.inventory_quantity === undefined || v.inventory_quantity > 0
  )
  const currentVariantId = selectedVariantId || availableVariants[0]?.id
  const currentVariant = availableVariants.find((v) => v.id === currentVariantId) || availableVariants[0]
  const isLocked = !offer.trigger_met

  // Calculate progress for cart_value triggers
  const triggerValue = offer.trigger_cart_value || 0
  const amountNeeded = Math.max(0, triggerValue - cartValue)
  const progressPercent = triggerValue > 0 ? Math.min(100, (cartValue / triggerValue) * 100) : 0

  // Get price for current variant
  const getVariantPrice = (variant: PWPVariant): number => {
    const price = variant.prices.find(
      (p) => p.currency_code.toLowerCase() === currencyCode.toLowerCase()
    ) || variant.prices[0]
    return price?.amount || 0
  }

  const originalPrice = currentVariant ? getVariantPrice(currentVariant) : (offer.original_price || 0)
  let discountedPrice: number
  if (offer.reward_type === 'percentage') {
    discountedPrice = Math.round(originalPrice * (1 - offer.reward_value / 100))
  } else {
    discountedPrice = Math.max(0, originalPrice - offer.reward_value)
  }

  return (
    <div className={`overflow-hidden rounded-lg border ${isLocked ? 'border-neutral-200 bg-neutral-50' : 'border-amber-200 bg-amber-50'}`}>
      {/* Offer badge */}
      <div className={`px-3 py-1 ${isLocked ? 'bg-neutral-300' : 'bg-amber-400'}`}>
        <div className="flex items-center justify-between">
          <span className={`font-inter text-[11px] font-semibold uppercase tracking-wide ${isLocked ? 'text-neutral-600' : 'text-amber-900'}`}>
            {formatPWPDiscount(offer.reward_type, offer.reward_value, currencyCode)}
          </span>
          {isLocked && (
            <span className="flex items-center gap-1 font-inter text-[10px] font-medium text-neutral-500">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              LOCKED
            </span>
          )}
        </div>
      </div>

      <div className="p-3">
        {/* Progress bar for locked cart_value offers */}
        {isLocked && offer.trigger_type === 'cart_value' && triggerValue > 0 && (
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-inter text-[11px] font-medium text-neutral-600">
                Spend {formatPrice(amountNeeded, currencyCode)} more to unlock
              </span>
              <span className="font-inter text-[10px] text-neutral-500">
                {formatPrice(cartValue, currencyCode)} / {formatPrice(triggerValue, currencyCode)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {/* Product thumbnail */}
          {product?.thumbnail && (
            <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[#F5F5F5] ${isLocked ? 'opacity-60' : ''}`}>
              <Image
                src={product.thumbnail}
                alt={product.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          )}

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <h4 className={`font-inter text-[13px] font-medium leading-tight tracking-[-0.78px] line-clamp-2 ${isLocked ? 'text-neutral-600' : 'text-black'}`}>
              {product?.title || 'Special Product'}
            </h4>
            <p className="mt-1 font-inter text-[11px] tracking-[-0.66px] text-[#666] line-clamp-1">
              {offer.description}
            </p>

            {/* Price */}
            <div className="mt-2 flex items-center gap-2">
              <span className={`font-inter text-[14px] font-semibold tracking-[-0.84px] ${isLocked ? 'text-neutral-500' : 'text-amber-700'}`}>
                {formatPrice(discountedPrice, currencyCode)}
              </span>
              {originalPrice !== discountedPrice && (
                <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999] line-through">
                  {formatPrice(originalPrice, currencyCode)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Variant selector (if multiple available variants) - hidden when locked */}
        {!isLocked && availableVariants.length > 1 && (
          <div className="mt-3">
            <select
              value={currentVariantId}
              onChange={(e) => onVariantChange(e.target.value)}
              disabled={isApplying}
              className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 font-inter text-[12px] tracking-[-0.72px] text-black outline-none focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {availableVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.title || variant.sku || 'Default'}
                  {' - '}
                  {formatPrice(getVariantPrice(variant), currencyCode)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Apply button or locked message */}
        {isLocked ? (
          <div className="mt-3 w-full rounded-full bg-neutral-200 px-4 py-2 text-center">
            <span className="font-inter text-[13px] font-medium tracking-[-0.78px] text-neutral-500">
              {offer.trigger_type === 'cart_value'
                ? `Unlocks at ${formatPrice(triggerValue, currencyCode)}`
                : 'Add required product to unlock'}
            </span>
          </div>
        ) : (
          <button
            onClick={onApply}
            disabled={isApplying}
            className="mt-3 w-full cursor-pointer rounded-full bg-amber-500 px-4 py-2 font-inter text-[13px] font-semibold tracking-[-0.78px] text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApplying ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Adding...
              </span>
            ) : (
              'Add to Cart'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default PWPOffers
