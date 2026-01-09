'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/lib/context/CartContext'
import type { BulkDealProduct, BulkTier } from '@/lib/api/types'

type BundleDealProps = {
  products: BulkDealProduct[]
  title?: string
}

type TierButtonProps = {
  tier: BulkTier
  variantId: string
  onAddToCart: (variantId: string, quantity: number) => Promise<void>
}

function formatPrice(amountInCents: number): string {
  return `$${(amountInCents / 100).toFixed(2)}`
}

function TierButton({ tier, variantId, onAddToCart }: TierButtonProps): React.JSX.Element {
  const [isAdding, setIsAdding] = useState(false)
  const quantity = tier.min_quantity || 1
  const totalPrice = tier.amount * quantity

  const handleClick = async (): Promise<void> => {
    setIsAdding(true)
    try {
      await onAddToCart(variantId, quantity)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E3E3E3] bg-[#F9F9F9] p-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-green-600 px-2 py-0.5 font-inter text-[10px] font-medium text-white">
            Save {tier.savings_percent}%
          </span>
          <span className="font-inter text-[14px] font-medium text-black">
            Buy {quantity}
          </span>
        </div>
        <p className="mt-1 font-inter text-[12px] text-[#666]">
          {formatPrice(totalPrice)} total ({formatPrice(tier.amount)} each)
        </p>
      </div>
      <button
        onClick={handleClick}
        disabled={isAdding}
        className="cursor-pointer whitespace-nowrap rounded-lg bg-black px-4 py-2 font-inter text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isAdding ? 'Adding...' : `Add ${quantity}`}
      </button>
    </div>
  )
}

type BundleDealCardProps = {
  product: BulkDealProduct
  onAddToCart: (variantId: string, quantity: number) => Promise<void>
}

function BundleDealCard({ product, onAddToCart }: BundleDealCardProps): React.JSX.Element {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)

  // Get the selected variant
  const variant = product.variants[selectedVariantIndex] || product.variants[0]
  if (!variant) {
    return <></>
  }

  const basePrice = variant.base_price?.amount || 0
  const bulkTiers = variant.bulk_tiers || []

  if (bulkTiers.length === 0) {
    return <></>
  }

  // Sort tiers by min_quantity (ascending)
  const sortedTiers = [...bulkTiers].sort((a, b) => (a.min_quantity || 0) - (b.min_quantity || 0))

  // Get variant size from options
  const variantSize = variant.options?.find(opt =>
    opt.option?.title?.toLowerCase() === 'size'
  )?.value || variant.title

  // Get highest savings for the badge on image
  const maxSavings = Math.max(...bulkTiers.map(t => t.savings_percent))

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#E3E3E3] bg-white p-4">
      {/* Header: Image + Product Info */}
      <div className="flex gap-4">
        {/* Product Image */}
        <div className="relative w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <div className="aspect-square">
            <Image
              src={product.thumbnail || '/product/product.jpg'}
              alt={product.title}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          {/* Max savings badge */}
          <div className="absolute left-1 top-1 rounded-full bg-green-600 px-2 py-0.5 font-inter text-[9px] font-medium leading-[100%] text-white">
            Up to {maxSavings}% off
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-1 flex-col justify-center gap-1">
          <h3 className="font-inter text-[16px] font-medium leading-[120%] tracking-[-0.96px] text-black">
            {product.title}
          </h3>

          {/* Variant selector if multiple variants */}
          {product.variants.length > 1 ? (
            <select
              value={selectedVariantIndex}
              onChange={(e) => setSelectedVariantIndex(Number(e.target.value))}
              className="mt-1 w-full rounded border border-[#E3E3E3] bg-white px-2 py-1 font-inter text-[12px] text-black"
            >
              {product.variants.map((v, idx) => (
                <option key={v.id} value={idx}>
                  {v.title}
                </option>
              ))}
            </select>
          ) : variantSize && (
            <p className="font-inter text-[12px] leading-[100%] tracking-[-0.72px] text-[#999]">
              {variantSize}
            </p>
          )}

          {/* Base price */}
          <p className="font-inter text-[12px] text-[#999]">
            Regular: {formatPrice(basePrice)} each
          </p>

          {/* Link to product page */}
          <Link
            href={`/products/${product.id}`}
            className="font-inter text-[11px] leading-[100%] text-[#666] underline transition-opacity hover:opacity-70"
          >
            View details
          </Link>
        </div>
      </div>

      {/* Tier options */}
      <div className="space-y-2">
        {sortedTiers.map((tier, index) => (
          <TierButton
            key={`${variant.id}-tier-${index}`}
            tier={tier}
            variantId={variant.id}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  )
}

// Skeleton card for loading state
function BundleDealCardSkeleton(): React.JSX.Element {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-xl border border-[#E3E3E3] bg-white p-4">
      {/* Header: Image + Product Info */}
      <div className="flex gap-4">
        {/* Product Image skeleton */}
        <div className="relative w-24 shrink-0 overflow-hidden rounded-lg bg-gray-200">
          <div className="aspect-square" />
        </div>

        {/* Product Info skeleton */}
        <div className="flex flex-1 flex-col justify-center gap-2">
          {/* Title */}
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          {/* Size */}
          <div className="h-3 w-1/2 rounded bg-gray-200" />
          {/* Price */}
          <div className="h-3 w-1/3 rounded bg-gray-200" />
        </div>
      </div>

      {/* Tier options skeleton */}
      <div className="space-y-2">
        {/* Tier 1 */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E3E3E3] bg-[#F9F9F9] p-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-14 rounded-full bg-gray-200" />
              <div className="h-4 w-12 rounded bg-gray-200" />
            </div>
            <div className="h-3 w-24 rounded bg-gray-200" />
          </div>
          <div className="h-8 w-16 rounded-lg bg-gray-300" />
        </div>
        {/* Tier 2 */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E3E3E3] bg-[#F9F9F9] p-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-14 rounded-full bg-gray-200" />
              <div className="h-4 w-12 rounded bg-gray-200" />
            </div>
            <div className="h-3 w-24 rounded bg-gray-200" />
          </div>
          <div className="h-8 w-16 rounded-lg bg-gray-300" />
        </div>
      </div>
    </div>
  )
}

// Skeleton section for loading state
export function BundleDealSkeleton({
  title = 'Bundle Deals',
  count = 4
}: { title?: string; count?: number }): React.JSX.Element {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <h2 className="mb-8 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black sm:mb-12">
        {title}
      </h2>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-6 xl:grid-cols-3 xl:gap-12">
        <div className="lg:col-span-3 xl:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Array.from({ length: count }).map((_, index) => (
              <BundleDealCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function BundleDeal({
  products,
  title = 'Bundle Deals'
}: BundleDealProps): React.JSX.Element {
  const { addToCart } = useCart()

  // Don't render if no products with bulk tiers
  if (!products || products.length === 0) {
    return <></>
  }

  // Filter products that actually have bulk tiers
  const productsWithTiers = products.filter(p =>
    p.variants?.some(v => v.bulk_tiers && v.bulk_tiers.length > 0)
  )

  if (productsWithTiers.length === 0) {
    return <></>
  }

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <h2 className="mb-8 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black sm:mb-12">
        {title}
      </h2>

      {/* Container with same width as cart items section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-6 xl:grid-cols-3 xl:gap-12">
        <div className="lg:col-span-3 xl:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {productsWithTiers.map((product) => (
              <BundleDealCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
