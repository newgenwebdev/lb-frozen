'use client'

import React, { useEffect, useState } from 'react'
import { useCart } from '@/lib/context/CartContext'
import { CartItem } from '@/components/cart/CartItem'
import { isPWPItem } from '@/lib/api/pwp'
import { OrderSummary } from '@/components/cart/OrderSummary'
import { EmptyCart } from '@/components/cart/EmptyCart'
import { RelatedProducts, RelatedProductsSkeleton } from '@/components/products/RelatedProducts'
import { BundleDeal, BundleDealSkeleton } from '@/components/products/BundleDeal'
import { getBulkDealProductsClient, getProductsClient } from '@/lib/api/medusa'
import { medusaProductsToProducts, type Product } from '@/lib/api/adapter'
import type { BulkDealProduct } from '@/lib/api/types'

export default function BagPage(): React.JSX.Element {
  const { items, subtotal, itemCount, updateQuantity, removeFromCart, isLoading, error, inventoryMap } = useCart()

  // Bulk deal products state
  const [bulkDealProducts, setBulkDealProducts] = useState<BulkDealProduct[]>([])
  const [isBulkDealsLoading, setIsBulkDealsLoading] = useState(true)

  // Related products state
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isRelatedLoading, setIsRelatedLoading] = useState(true)

  // Fetch bulk deal products and related products on mount
  useEffect(() => {
    async function fetchBulkDeals(): Promise<void> {
      try {
        const products = await getBulkDealProductsClient(4)
        setBulkDealProducts(products)
      } catch {
        // Silently fail - bundle deals are not critical
      } finally {
        setIsBulkDealsLoading(false)
      }
    }

    async function fetchRelatedProducts(): Promise<void> {
      try {
        const medusaProducts = await getProductsClient(8)
        // Shuffle and take 4 random products
        const shuffled = medusaProducts.sort(() => Math.random() - 0.5)
        const products = medusaProductsToProducts(shuffled.slice(0, 4))
        setRelatedProducts(products)
      } catch {
        // Silently fail - related products are not critical
      } finally {
        setIsRelatedLoading(false)
      }
    }

    fetchBulkDeals()
    fetchRelatedProducts()
  }, [])

  const FREE_SHIPPING_THRESHOLD = 100.00
  // Subtotal is in cents from Medusa, convert to dollars
  const subtotalInDollars = subtotal / 100
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalInDollars)
  const shippingProgress = Math.min(100, (subtotalInDollars / FREE_SHIPPING_THRESHOLD) * 100)

  // Calculate cart value excluding PWP items (in cents) for PWP discount validation
  const cartValueExcludingPWP = items.reduce((sum, item) => {
    if (isPWPItem(item)) return sum
    return sum + (item.unit_price || 0) * item.quantity
  }, 0)

  // Show loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="flex items-center justify-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 animate-spin text-black" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-4 font-inter text-[16px] text-[#999]">Loading your bag...</p>
          </div>
        </div>
      </main>
    )
  }

  // Show error state
  if (error) {
    return (
      <main className="min-h-screen bg-white">
        <div className="flex items-center justify-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="text-center">
            <p className="font-inter text-[16px] text-red-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 cursor-pointer rounded-lg bg-black px-6 py-3 font-inter text-[14px] font-medium text-white hover:opacity-90"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <h1 className="mb-12 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black">
          Your bag
        </h1>

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-6 xl:grid-cols-3 xl:gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-3 xl:col-span-2">
              {/* Free Shipping Progress */}
              <div className="mb-6 rounded-lg bg-[#F7F7F7] p-6">
                {remainingForFreeShipping > 0 ? (
                  <p className="mb-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black">
                    You&apos;re ${remainingForFreeShipping.toFixed(2)} away from free shipping
                  </p>
                ) : (
                  <p className="mb-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-[#4CAF50]">
                    You&apos;ve qualified for free shipping!
                  </p>
                )}
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E3E3E3]">
                  <div
                    className="h-full bg-[#4CAF50] transition-all duration-300"
                    style={{ width: `${shippingProgress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-6">
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={(quantity) => updateQuantity(item.id, quantity)}
                    onRemove={() => removeFromCart(item.id)}
                    cartValueExcludingPWP={cartValueExcludingPWP}
                    maxQuantity={item.variant_id ? inventoryMap[item.variant_id] : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-2 xl:col-span-1">
              <div className="sticky top-8">
                <OrderSummary subtotal={subtotalInDollars} itemCount={itemCount} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bundle Deal section - shows products with bulk pricing */}
      {isBulkDealsLoading ? (
        <BundleDealSkeleton title="Bundle Deals" count={4} />
      ) : bulkDealProducts.length > 0 ? (
        <BundleDeal products={bulkDealProducts} title="Bundle Deals" />
      ) : null}

      {/* You might also like section */}
      {isRelatedLoading ? (
        <RelatedProductsSkeleton title="You might also like" count={4} />
      ) : relatedProducts.length > 0 ? (
        <RelatedProducts products={relatedProducts} title="You might also like" />
      ) : null}
    </main>
  )
}
