'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { MedusaCartLineItem } from '@/lib/api/cart'
import { getLineItemEffectivePrice, getLineItemWholesaleInfo } from '@/lib/api/cart'
import { isPWPItem, getPWPItemInfo, formatPrice } from '@/lib/api/pwp'

type CartItemProps = {
  item: MedusaCartLineItem
  onUpdateQuantity: (quantity: number) => Promise<void>
  onRemove: () => Promise<void>
  isUpdating?: boolean
  /** Cart value excluding PWP items (in cents) - used to check if PWP discount is still valid */
  cartValueExcludingPWP?: number
  /** Maximum quantity available (stock limit) - if not provided, uses variant inventory_quantity */
  maxQuantity?: number
}

// Helper to check if a value represents a real variant (not default)
const isRealVariantValue = (value: string | null | undefined): value is string => {
  if (!value) return false
  const lowerValue = value.toLowerCase().trim()
  return lowerValue !== 'default' && lowerValue !== '-' && lowerValue !== ''
}

// Helper to get variant display from line item
// Returns formatted string like "Material: Water", "Size: 100ml", or just "100ml"
// Returns null for products without real variants (default variant)
const getItemSize = (item: MedusaCartLineItem): string | null => {
  // Priority 1: subtitle (explicitly set by our custom endpoint with "Label: Value" format)
  if (isRealVariantValue(item.subtitle)) {
    return item.subtitle
  }

  // Priority 2: variant options array (for expanded cart queries)
  // Build "Label: Value" format from option data
  if (item.variant?.options && item.variant.options.length > 0) {
    for (const opt of item.variant.options) {
      if (isRealVariantValue(opt?.value)) {
        const label = opt.option?.title
        // Return "Label: Value" if label exists, otherwise just "Value"
        return label ? `${label}: ${opt.value}` : opt.value
      }
    }
  }

  // Priority 3: variant_title (Medusa v2 standard field) - just value, no label
  if (isRealVariantValue(item.variant_title)) {
    return item.variant_title
  }

  // Priority 4: variant.title (nested variant object) - just value, no label
  if (isRealVariantValue(item.variant?.title)) {
    return item.variant.title
  }

  // Return null for products without real variants
  return null
}

// Helper to get thumbnail from line item
const getItemThumbnail = (item: MedusaCartLineItem): string => {
  return item.thumbnail || item.variant?.product?.thumbnail || item.product?.thumbnail || ''
}

// Helper to get product name from line item
const getItemName = (item: MedusaCartLineItem): string => {
  return item.title || item.variant?.product?.title || item.product?.title || 'Unknown Product'
}

// Helper to get product URL from line item
const getProductUrl = (item: MedusaCartLineItem): string | null => {
  const handle = item.product_handle || item.variant?.product?.handle || item.product?.handle
  return handle ? `/products/${handle}` : null
}

export const CartItem = ({ item, onUpdateQuantity, onRemove, isUpdating = false, cartValueExcludingPWP = 0, maxQuantity }: CartItemProps): React.JSX.Element => {
  const [isRemoving, setIsRemoving] = useState<boolean>(false)

  // Use item.quantity directly - CartContext handles optimistic updates
  const quantity = item.quantity

  // Get stock limit from prop or variant's inventory_quantity
  const stockLimit = maxQuantity ?? item.variant?.inventory_quantity ?? null
  const isAtMaxQuantity = stockLimit !== null && quantity >= stockLimit

  const handleQuantityChange = (delta: number): void => {
    if (isRemoving || isUpdating) return

    // Enforce stock limit when incrementing
    let newQuantity = Math.max(1, quantity + delta)
    if (stockLimit !== null && newQuantity > stockLimit) {
      newQuantity = stockLimit
    }

    // Don't update if quantity hasn't changed
    if (newQuantity === quantity) return

    // Don't await - CartContext has optimistic update, let it sync in background
    onUpdateQuantity(newQuantity).catch(() => {
      // Error handling is done in CartContext (rollback)
    })
  }

  const handleRemove = (): void => {
    if (isRemoving || isUpdating) return

    setIsRemoving(true)
    // Don't await - CartContext has optimistic update
    onRemove().catch(() => {
      setIsRemoving(false)
    })
  }

  const thumbnail = getItemThumbnail(item)
  const name = getItemName(item)
  const size = getItemSize(item)
  const productUrl = getProductUrl(item)

  // Check if this is a PWP item
  const isPWP = isPWPItem(item)
  const pwpInfo = getPWPItemInfo(item)

  // Check if PWP discount is suspended (cart value dropped below threshold)
  const isPWPDiscountSuspended = isPWP && pwpInfo && pwpInfo.trigger_type === 'cart_value' &&
    pwpInfo.trigger_cart_value !== null && cartValueExcludingPWP < pwpInfo.trigger_cart_value

  // Calculate how much more is needed to restore discount
  const amountNeededForDiscount = isPWPDiscountSuspended && pwpInfo?.trigger_cart_value
    ? pwpInfo.trigger_cart_value - cartValueExcludingPWP
    : 0

  // Check for wholesale tier pricing
  const wholesaleInfo = getLineItemWholesaleInfo(item)
  const hasWholesaleTier = wholesaleInfo.hasTiers && wholesaleInfo.activeTier !== null

  // Check for variant discount (Set Discount Global from admin)
  // Use variant_discount_amount from metadata if available
  const variantDiscountAmount = Number(item.metadata?.variant_discount_amount) || 0
  const originalUnitPrice = Number(item.metadata?.original_unit_price) || item.unit_price
  // Has discount if: metadata flag is set AND discount amount > 0
  const hasVariantDiscount = Boolean(item.metadata?.is_variant_discount) && variantDiscountAmount > 0

  // Calculate effective price (after adjustments/discounts)
  const effectivePrice = getLineItemEffectivePrice(item)

  // For variant discount, calculate the actual discounted price from metadata
  // This handles the case where unit_price hasn't been updated yet
  const variantDiscountedPrice = hasVariantDiscount
    ? Math.max(0, originalUnitPrice - variantDiscountAmount)
    : effectivePrice

  // Use variant discounted price when applicable, otherwise use effective price
  const displayPrice = hasVariantDiscount ? variantDiscountedPrice : effectivePrice
  const price = displayPrice / 100 // Convert from cents
  const originalPrice = item.unit_price / 100 // Original price before discounts
  const basePriceFromTiers = wholesaleInfo.basePrice / 100 // Base price from wholesale info
  const originalPriceBeforeVariantDiscount = originalUnitPrice / 100 // Original price before variant discount

  // Calculate variant discount percentage
  const variantDiscountPercent = hasVariantDiscount && originalUnitPrice > 0
    ? Math.round((variantDiscountAmount / originalUnitPrice) * 100)
    : 0

  // Wrapper element for product image - use Link or div based on productUrl
  const imageWrapperClassName = "relative w-1/3 shrink-0 overflow-hidden rounded-lg bg-gray-100 transition-opacity hover:opacity-80"

  return (
    <div className={`flex gap-6 ${isRemoving ? 'opacity-60' : ''}`}>
      {/* Product Image - 1/3 width */}
      {productUrl ? (
        <Link href={productUrl} className={imageWrapperClassName}>
          <div className="aspect-square">
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={name}
                fill
                sizes="33vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200">
                <span className="text-gray-400">No image</span>
              </div>
            )}
          </div>
        </Link>
      ) : (
        <div className={imageWrapperClassName}>
          <div className="aspect-square">
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={name}
                fill
                sizes="33vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200">
                <span className="text-gray-400">No image</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Content - 2/3 width */}
      <div className="flex flex-1 flex-col justify-center gap-8">
        {/* Top Part: Title, Size, and Price - aligned top */}
        <div className="flex items-start justify-between">
          <div>
            {productUrl ? (
              <Link href={productUrl} className="mb-2 block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-60">
                {name}
              </Link>
            ) : (
              <h3 className="mb-2 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                {name}
              </h3>
            )}
            {size && (
              <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                {size}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            {isPWP && isPWPDiscountSuspended ? (
              /* PWP item with suspended discount - show original price only */
              <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                ${originalPrice.toFixed(2)}
              </span>
            ) : isPWP && effectivePrice < item.unit_price ? (
              /* PWP item with active discount */
              <>
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-amber-600">
                  ${price.toFixed(2)}
                </span>
                <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999] line-through">
                  ${originalPrice.toFixed(2)}
                </span>
              </>
            ) : hasWholesaleTier && wholesaleInfo.activeTier ? (
              /* Wholesale tier discount */
              <>
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  ${price.toFixed(2)}
                </span>
                <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999] line-through">
                  ${basePriceFromTiers.toFixed(2)}
                </span>
              </>
            ) : hasVariantDiscount ? (
              /* Variant metadata discount (Set Discount Global from admin) */
              <>
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  ${price.toFixed(2)}
                </span>
                <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999] line-through">
                  ${originalPriceBeforeVariantDiscount.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                ${price.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* PWP Badge */}
        {isPWP && pwpInfo && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {isPWPDiscountSuspended ? (
                /* Suspended discount badge */
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 font-inter text-[11px] font-semibold tracking-[-0.66px] text-red-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Discount Paused
                </span>
              ) : (
                /* Active discount badge */
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-inter text-[11px] font-semibold tracking-[-0.66px] text-amber-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  PWP Deal
                </span>
              )}
              <span className="font-inter text-[11px] tracking-[-0.66px] text-[#666]">
                {pwpInfo.rule_name}
              </span>
            </div>
            {/* Warning message when discount is suspended */}
            {isPWPDiscountSuspended && (
              <div className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1.5">
                <svg className="h-3.5 w-3.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-inter text-[11px] tracking-[-0.66px] text-red-600">
                  Add {formatPrice(amountNeededForDiscount, 'SGD')} more to restore your discount
                </span>
              </div>
            )}
          </div>
        )}

        {/* Wholesale Tier Badge */}
        {!isPWP && hasWholesaleTier && wholesaleInfo.activeTier && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 font-inter text-[11px] font-semibold tracking-[-0.66px] text-green-700">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Bulk Price
            </span>
            <span className="font-inter text-[11px] tracking-[-0.66px] text-green-600">
              -{wholesaleInfo.activeTier.savings}% ({quantity}+ units)
            </span>
          </div>
        )}

        {/* Variant Discount Badge (Sale Price) */}
        {!isPWP && !hasWholesaleTier && hasVariantDiscount && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 font-inter text-[11px] font-semibold tracking-[-0.66px] text-green-700">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
              Sale
            </span>
            <span className="font-inter text-[11px] tracking-[-0.66px] text-green-600">
              -{variantDiscountPercent}% off
            </span>
          </div>
        )}

        {/* Bottom Part: Quantity Controls and Delete Button - aligned bottom */}
        <div className="flex items-end justify-between">
          {/* PWP items have fixed quantity of 1 */}
          {isPWP ? (
            <div className="inline-flex items-center gap-2 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-2">
              <span className="font-inter text-[14px] font-medium tracking-[-0.84px] text-amber-700">
                Qty: 1
              </span>
              <span className="font-inter text-[11px] tracking-[-0.66px] text-amber-600">
                (PWP limit)
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="inline-flex items-center gap-4 rounded-[24px] border border-[#E3E3E3] px-6 py-3">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={isRemoving || isUpdating || quantity <= 1}
                  className="transition-opacity hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <mask id="mask0_minus_cart" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                      <rect width="24" height="24" fill="#D9D9D9"/>
                    </mask>
                    <g mask="url(#mask0_minus_cart)">
                      <path d="M6.5 12.75V11.25H17.5V12.75H6.5Z" fill={quantity <= 1 ? '#999999' : '#000000'}/>
                    </g>
                  </svg>
                </button>
                <span className="min-w-[20px] text-center font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={isRemoving || isUpdating || isAtMaxQuantity}
                  className="transition-opacity hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Increase quantity"
                  title={isAtMaxQuantity ? `Only ${stockLimit} in stock` : undefined}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <mask id="mask0_plus_cart" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                      <rect width="24" height="24" fill="#D9D9D9"/>
                    </mask>
                    <g mask="url(#mask0_plus_cart)">
                      <path d="M11.25 12.75H5.5V11.25H11.25V5.5H12.75V11.25H18.5V12.75H12.75V18.5H11.25V12.75Z" fill={isAtMaxQuantity ? '#999999' : 'black'}/>
                    </g>
                  </svg>
                </button>
              </div>
              {/* Show stock limit warning when at max */}
              {isAtMaxQuantity && stockLimit !== null && (
                <span className="font-inter text-[11px] tracking-[-0.66px] text-amber-600">
                  Max {stockLimit} in stock
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleRemove}
            disabled={isRemoving || isUpdating}
            className="transition-opacity hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Remove item"
          >
            {isRemoving ? (
              <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <mask id="mask0_1819_10088" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                  <rect width="24" height="24" fill="#D9D9D9"/>
                </mask>
                <g mask="url(#mask0_1819_10088)">
                  <path d="M7 21C6.45 21 5.979 20.804 5.587 20.412C5.195 20.02 4.99933 19.5493 5 19V6H4V4H9V3H15V4H20V6H19V19C19 19.55 18.804 20.021 18.412 20.413C18.02 20.805 17.5493 21.0007 17 21H7ZM17 6H7V19H17V6ZM9 17H11V8H9V17ZM13 17H15V8H13V17Z" fill="black"/>
                </g>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
