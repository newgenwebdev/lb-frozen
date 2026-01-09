'use client'

import React, { useState, useMemo } from 'react'
import type { MedusaProductVariant, StoreBrand } from '@/lib/api/types'
import {
  getWholesaleTiers,
  getPriceForQuantity,
  getNextTierInfo,
} from './WholesalePricing'

type ProductInfoProps = {
  title: string
  price: number
  description: string | null
  category?: string
  brand?: StoreBrand | null
  variants?: MedusaProductVariant[]
  options?: Array<{
    id: string
    title: string
    values: Array<{ id: string; value: string }>
  }>
  onAddToCart: (variantId: string, quantity: number) => void | Promise<void>
  isAddingToCart?: boolean
  addToCartError?: string | null
  cartQuantity?: number // Current quantity of this variant in cart
}

export const ProductInfo = ({
  title,
  price,
  description,
  category,
  brand,
  variants,
  options,
  onAddToCart,
  isAddingToCart = false,
  addToCartError = null,
  cartQuantity = 0,
}: ProductInfoProps): React.JSX.Element => {
  const [quantity, setQuantity] = useState<number>(1)

  // Initialize selectedOptions with the first variant's options
  // This ensures the UI shows which variant is selected on initial load
  const getInitialSelectedOptions = (): Record<string, string> => {
    if (!variants || variants.length === 0 || !options || options.length === 0) {
      return {}
    }
    // Get the first variant's options
    const firstVariant = variants[0]
    if (!firstVariant.options || !Array.isArray(firstVariant.options)) {
      return {}
    }
    const initial: Record<string, string> = {}
    firstVariant.options.forEach((opt) => {
      const key = opt.option?.title || 'Option'
      initial[key] = opt.value
    })
    return initial
  }

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(getInitialSelectedOptions)

  const handleOptionChange = (optionTitle: string, value: string): void => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionTitle]: value,
    }))
  }

  // Helper function to convert variant options array to Record format
  const getVariantOptionsAsRecord = (variant: MedusaProductVariant): Record<string, string> => {
    if (!variant.options || !Array.isArray(variant.options)) return {}
    const record: Record<string, string> = {}
    variant.options.forEach((opt) => {
      const key = opt.option?.title || 'Option'
      record[key] = opt.value
    })
    return record
  }

  const getSelectedVariant = (): MedusaProductVariant | undefined => {
    if (!variants || variants.length === 0) return undefined

    // If only one variant or no options to select, return first variant
    if (variants.length === 1 || !options || options.length === 0) {
      return variants[0]
    }

    // If no options selected yet, return first variant to show initial price
    if (Object.keys(selectedOptions).length === 0) {
      return variants[0]
    }

    // Find variant matching selected options
    return variants.find((variant) => {
      const variantOptions = getVariantOptionsAsRecord(variant)
      return Object.entries(selectedOptions).every(
        ([key, value]) => variantOptions[key] === value
      )
    })
  }

  // Calculate inventory availability for selected variant
  const selectedVariant = getSelectedVariant()
  const inventoryQuantity = selectedVariant?.inventory_quantity ?? null
  // Available stock is inventory minus what's already in cart
  const availableStock = inventoryQuantity !== null
    ? Math.max(0, inventoryQuantity - cartQuantity)
    : null
  const isOutOfStock = availableStock !== null && availableStock <= 0
  const isLowStock = availableStock !== null && availableStock > 0 && availableStock <= 5

  const handleQuantityChange = (delta: number): void => {
    setQuantity((prev) => {
      const newQuantity = prev + delta
      // Don't go below 1
      if (newQuantity < 1) return 1
      // Don't exceed available stock (if tracked)
      if (availableStock !== null && newQuantity > availableStock) return availableStock > 0 ? availableStock : 1
      return newQuantity
    })
  }

  const handleAddToCart = async (): Promise<void> => {
    const variant = getSelectedVariant()
    if (variant && !isOutOfStock) {
      try {
        await onAddToCart(variant.id, quantity)
        // Reset quantity to 1 after successful add to cart
        setQuantity(1)
      } catch {
        // Error is handled by parent component, don't reset quantity on failure
      }
    }
  }

  // Helper function to get base price from variant
  // Priority: prices array base price (no min_quantity) > calculated_price > first price
  const getVariantBasePrice = (variant: MedusaProductVariant | undefined): number => {
    if (!variant) return price * 100

    // First, check prices array for base price (no min_quantity or min_quantity <= 1)
    // This is more reliable when wholesale tiers are set up
    if (variant.prices && variant.prices.length > 0) {
      const basePrice = variant.prices.find(
        (p) => !p.min_quantity || p.min_quantity <= 1
      )
      if (basePrice) return basePrice.amount
    }

    // Fallback to calculated_price (region-specific) when no explicit base price
    // Note: calculated_price might return the lowest tier price, so we only use it as fallback
    if (variant.calculated_price?.calculated_amount) {
      return variant.calculated_price.calculated_amount
    }

    // Last resort: use first price from array
    if (variant.prices && variant.prices.length > 0) {
      return variant.prices[0].amount
    }

    return price * 100 // Convert to cents
  }

  // Helper function to get variant metadata discount
  const getVariantMetadataDiscount = (variant: MedusaProductVariant | undefined, basePriceCents: number): {
    hasDiscount: boolean
    discountedPriceCents: number
    discountPercent: number
  } => {
    if (!variant) return { hasDiscount: false, discountedPriceCents: basePriceCents, discountPercent: 0 }

    const metadata = variant.metadata
    const discountValue = Number(metadata?.discount) || 0
    const discountType = metadata?.discount_type

    if (discountValue > 0 && discountType && basePriceCents > 0) {
      let discountedPrice: number
      let discountPercent: number

      if (discountType === 'percentage') {
        discountPercent = Math.min(discountValue, 100)
        discountedPrice = Math.round(basePriceCents * (1 - discountPercent / 100))
      } else {
        // Fixed discount (value is in cents)
        discountedPrice = Math.max(0, basePriceCents - discountValue)
        discountPercent = basePriceCents > 0 ? Math.round((discountValue / basePriceCents) * 100) : 0
      }

      if (discountedPrice < basePriceCents) {
        return { hasDiscount: true, discountedPriceCents: discountedPrice, discountPercent }
      }
    }

    return { hasDiscount: false, discountedPriceCents: basePriceCents, discountPercent: 0 }
  }

  const basePriceInCents = getVariantBasePrice(selectedVariant)
  const variantDiscount = getVariantMetadataDiscount(selectedVariant, basePriceInCents)

  // Get wholesale tiers for the selected variant
  const selectedVariantPrices = selectedVariant?.prices
  const wholesaleTiers = useMemo(() => {
    if (!selectedVariantPrices) return []
    return getWholesaleTiers(selectedVariantPrices, basePriceInCents)
  }, [selectedVariantPrices, basePriceInCents])

  // Calculate current price based on quantity and tiers
  // Priority: Wholesale tier > Variant metadata discount > Base price
  const { amount: currentPriceInCents, tier: activeTier, isVariantDiscount } = useMemo(() => {
    if (!selectedVariantPrices) {
      // No prices array - check for variant discount
      if (variantDiscount.hasDiscount) {
        return { amount: variantDiscount.discountedPriceCents, tier: null, isVariantDiscount: true }
      }
      return { amount: basePriceInCents, tier: null, isVariantDiscount: false }
    }

    const tierResult = getPriceForQuantity(selectedVariantPrices, quantity, basePriceInCents)

    // If wholesale tier is active, use it (priority over variant discount)
    if (tierResult.tier) {
      return { ...tierResult, isVariantDiscount: false }
    }

    // No wholesale tier - check for variant metadata discount
    if (variantDiscount.hasDiscount) {
      return { amount: variantDiscount.discountedPriceCents, tier: null, isVariantDiscount: true }
    }

    return { ...tierResult, isVariantDiscount: false }
  }, [selectedVariantPrices, quantity, basePriceInCents, variantDiscount])

  const currentPrice = currentPriceInCents / 100
  const basePrice = basePriceInCents / 100

  return (
    <div className="flex flex-col">
      {/* Brand and Category */}
      <div className="mb-2 flex items-center gap-2">
        {brand && (
          <div className="flex items-center gap-2">
            {brand.logo_url && (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-5 w-5 object-contain"
              />
            )}
            <span className="font-inter text-[14px] font-medium uppercase leading-[100%] tracking-[-0.84px] text-black">
              {brand.name}
            </span>
          </div>
        )}
        {brand && category && <span className="text-[#999]">|</span>}
        {category && (
          <p className="font-inter text-[14px] font-medium uppercase leading-[100%] tracking-[-0.84px] text-[#999]">
            {category}
          </p>
        )}
      </div>

      {/* Product Title */}
      <h1 className="mb-4 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black">
        {title}
      </h1>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3">
          <p className="font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
            ${currentPrice.toFixed(2)}
          </p>
          {/* Show original price and discount badge for wholesale tier OR variant discount */}
          {((activeTier && currentPrice < basePrice) || (isVariantDiscount && currentPrice < basePrice)) && (
            <>
              <p className="font-inter text-[16px] leading-[100%] tracking-[-0.96px] text-[#999] line-through">
                ${basePrice.toFixed(2)}
              </p>
              <span className="rounded-full bg-green-100 px-2 py-1 font-inter text-[12px] font-medium tracking-[-0.72px] text-green-700">
                -{activeTier ? activeTier.savings : variantDiscount.discountPercent}%
              </span>
            </>
          )}
        </div>
        {activeTier && (
          <p className="mt-1 font-inter text-[13px] tracking-[-0.78px] text-green-600">
            Bulk price applied for {quantity}+ units
          </p>
        )}
        {isVariantDiscount && !activeTier && (
          <p className="mt-1 font-inter text-[13px] tracking-[-0.78px] text-green-600">
            Sale price applied
          </p>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="mb-8 font-inter text-[16px] font-normal leading-[150%] tracking-[-0.32px] text-[#666]">
          {description}
        </p>
      )}

      {/* Options (e.g., Size) - Only show if product has real variants (not just "Default") */}
      {options && options.length > 0 && variants && variants.length > 1 && (
        <div className="mb-6">
          {options.map((option) => (
            <div key={option.id} className="mb-4">
              <label className="mb-3 block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                {option.title}
              </label>
              <div className="flex flex-wrap gap-3">
                {option.values.map((value) => {
                  const isSelected = selectedOptions[option.title] === value.value
                  return (
                    <button
                      key={value.id}
                      onClick={() => handleOptionChange(option.title, value.value)}
                      className={`cursor-pointer rounded-3xl px-6 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-colors ${
                        isSelected
                          ? 'border border-black bg-[#F7F7F7]'
                          : 'border border-[#E3E3E3] bg-white hover:border-[#999]'
                      }`}
                    >
                      {value.value}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quantity */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          <label className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
            Quantity
          </label>
          {/* Stock indicator */}
          {isOutOfStock && (
            <span className="rounded-full bg-red-100 px-2 py-1 font-inter text-[12px] font-medium tracking-[-0.72px] text-red-600">
              Out of stock
            </span>
          )}
          {isLowStock && (
            <span className="rounded-full bg-amber-100 px-2 py-1 font-inter text-[12px] font-medium tracking-[-0.72px] text-amber-700">
              Only {availableStock} left
            </span>
          )}
        </div>
        <div className={`inline-flex items-center gap-4 rounded-3xl border px-6 py-3 ${isOutOfStock ? 'border-red-200 bg-red-50' : 'border-[#E3E3E3]'}`}>
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1 || isOutOfStock}
            className="cursor-pointer transition-opacity hover:opacity-60 disabled:cursor-not-allowed"
            aria-label="Decrease quantity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <mask id="mask0_minus" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                <rect width="24" height="24" fill="#D9D9D9"/>
              </mask>
              <g mask="url(#mask0_minus)">
                <path d="M6.5 12.75V11.25H17.5V12.75H6.5Z" fill={quantity <= 1 || isOutOfStock ? '#999999' : '#000000'}/>
              </g>
            </svg>
          </button>
          <span className={`min-w-5 text-center font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] ${isOutOfStock ? 'text-red-400' : 'text-black'}`}>
            {isOutOfStock ? 0 : quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={isOutOfStock || (availableStock !== null && quantity >= availableStock)}
            className="cursor-pointer transition-opacity hover:opacity-60 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <mask id="mask0_plus" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                <rect width="24" height="24" fill="#D9D9D9"/>
              </mask>
              <g mask="url(#mask0_plus)">
                <path d="M11.25 12.75H5.5V11.25H11.25V5.5H12.75V11.25H18.5V12.75H12.75V18.5H11.25V12.75Z" fill={isOutOfStock || (availableStock !== null && quantity >= availableStock) ? '#999999' : '#000000'}/>
              </g>
            </svg>
          </button>
        </div>
        {/* Show max quantity hint when user is at the limit */}
        {availableStock !== null && quantity >= availableStock && !isOutOfStock && (
          <p className="mt-2 font-inter text-[13px] tracking-[-0.78px] text-amber-600">
            Maximum available quantity reached
          </p>
        )}
      </div>

      {/* Add to Cart Error Message */}
      {addToCartError && (
        <p className="mb-4 font-inter text-[14px] font-medium text-red-500">
          {addToCartError}
        </p>
      )}

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={!selectedVariant || isAddingToCart || isOutOfStock}
        className={`mb-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[48px] px-8 py-5 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] backdrop-blur-[26px] transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${
          isOutOfStock
            ? 'bg-gray-300 text-gray-500'
            : 'bg-black text-white hover:opacity-90'
        }`}
      >
        {isAddingToCart ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Adding...
          </>
        ) : isOutOfStock ? (
          'Out of stock'
        ) : (
          'Add to cart'
        )}
      </button>

      {/* Dynamic Info Message - Wholesale tier upsell */}
      {(() => {
        const nextTierInfo = getNextTierInfo(wholesaleTiers, quantity)
        if (nextTierInfo) {
          // Show upsell message for next wholesale tier
          return (
            <div className="mb-8">
              <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                Add{' '}
                <span className="text-black">{nextTierInfo.qtyNeeded} more</span>{' '}
                to save{' '}
                <span className="text-green-600">{nextTierInfo.tier.savings}%</span>{' '}
                per unit
              </p>
            </div>
          )
        }
        if (activeTier) {
          // Show current tier applied message
          return (
            <div className="mb-8">
              <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                Bulk discount applied: {activeTier.savings}% off
              </p>
            </div>
          )
        }
        // No message when no bulk pricing
        return null
      })()}

    </div>
  )
}
