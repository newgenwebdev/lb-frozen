'use client'

import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import {
  type MedusaOrder,
  type MedusaOrderItem,
  getCustomerOrders,
  getOrderDisplayStatus,
  formatOrderDate,
  formatOrderPrice,
  isOrderItemPWP,
  isOrderItemVariantDiscount,
  getOrderItemOriginalPrice,
} from '@/lib/api/orders'

export default function OrderHistoryPage(): React.JSX.Element {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useCustomer()

  const [orders, setOrders] = useState<MedusaOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/account/orders')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch orders when authenticated
  useEffect(() => {
    async function fetchOrders(): Promise<void> {
      if (!isAuthenticated) return

      setIsLoading(true)
      setError(null)

      try {
        const { orders: fetchedOrders } = await getCustomerOrders({ limit: 50 })
        // Sort orders by created_at descending (newest first)
        const sortedOrders = [...fetchedOrders].sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        setOrders(sortedOrders)
      } catch (err) {
        console.error('Failed to fetch orders:', err)
        setError('Failed to load orders. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated])

  // Show loading while checking auth or fetching orders
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 animate-spin text-black" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="font-inter text-[14px] text-black">Loading orders...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-start">
        <h2 className="font-inter text-[24px] font-semibold leading-[120%] tracking-[-0.48px] text-black">
          Something went wrong
        </h2>
        <p className="mt-2 font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#999]">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-block cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[14px] font-medium leading-[100%] tracking-[-0.28px] text-white transition-colors hover:bg-black/80"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {orders.length === 0 ? (
        <div className="flex flex-col items-start">
          <h2 className="font-inter text-[24px] font-semibold leading-[120%] tracking-[-0.48px] text-black">
            You have no orders yet
          </h2>
          <p className="mt-2 font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#999]">
            Order history is empty. Once orders are placed, all order details
            will be displayed here.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[14px] font-medium leading-[100%] tracking-[-0.28px] text-white transition-colors hover:bg-black/80"
          >
            Back to shopping
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#E3E3E3]">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: MedusaOrder }): React.JSX.Element {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const updateArrows = (): void => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setShowLeftArrow(scrollLeft > 0)
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      updateArrows()
    }, 100)

    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', updateArrows)
      window.addEventListener('resize', updateArrows)
    }

    return () => {
      clearTimeout(timer)
      if (container) {
        container.removeEventListener('scroll', updateArrows)
      }
      window.removeEventListener('resize', updateArrows)
    }
  }, [])

  const scroll = (direction: 'left' | 'right'): void => {
    if (scrollContainerRef.current) {
      const scrollAmount = 220
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  // Get display values
  const displayStatus = getOrderDisplayStatus(order)
  const displayDate = formatOrderDate(order.created_at)
  const orderItems = order.items || []

  // Calculate correct total with all discounts
  // Use getOrderItemOriginalPrice for original subtotal to handle variant discounts
  const originalSubtotal = orderItems.reduce((sum, item) => {
    const originalPrice = getOrderItemOriginalPrice(item)
    return sum + originalPrice * (item.quantity || 0)
  }, 0)
  const pwpDiscount = orderItems.reduce((sum, item) => {
    if (isOrderItemPWP(item) && item.metadata?.pwp_discount_amount) {
      return sum + (Number(item.metadata.pwp_discount_amount) || 0) * (item.quantity || 0)
    }
    return sum
  }, 0)
  // Calculate variant discount from item metadata (Set Discount Global from admin)
  const variantDiscount = orderItems.reduce((sum, item) => {
    if (isOrderItemVariantDiscount(item) && item.metadata?.variant_discount_amount) {
      return sum + (Number(item.metadata.variant_discount_amount) || 0) * (item.quantity || 0)
    }
    return sum
  }, 0)
  const couponDiscount = Math.max(0, (order.discount_total || 0) - pwpDiscount)
  // Extract points discount from order metadata
  const pointsDiscount = Number(order.metadata?.points_discount_amount) || 0
  // Extract membership promo discount from order metadata
  const membershipPromoDiscount = Number(order.metadata?.applied_membership_promo_discount) || 0
  // Extract tier discount from order metadata (auto-applied based on membership tier)
  const tierDiscount = Number(order.metadata?.tier_discount_amount) || 0
  // Check for free shipping discount
  const freeShippingApplied = order.metadata?.free_shipping_applied === true
  const shippingCost = freeShippingApplied ? 0 : (order.shipping_total || 0)
  const calculatedTotal = Math.max(0, originalSubtotal - pwpDiscount - variantDiscount - couponDiscount - pointsDiscount - membershipPromoDiscount - tierDiscount + shippingCost + (order.tax_total || 0))
  const displayTotal = formatOrderPrice(calculatedTotal, order.currency_code)

  // Get thumbnail URL for an item
  const getItemThumbnail = (item: MedusaOrderItem): string => {
    if (item.thumbnail) return item.thumbnail
    if (item.variant?.product?.thumbnail) return item.variant.product.thumbnail
    return '/product/product1.png'
  }

  // Check if this is a replacement order
  const isReplacementOrder = order.metadata?.is_replacement_order === true

  return (
    <div className="w-full max-w-full overflow-hidden py-8 first:pt-0">
      {/* Order Header */}
      <div className="flex max-sm:flex-col gap-y-4 md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-inter text-[16px] font-medium leading-[140%] tracking-[-0.32px] text-black">
              Order #{order.display_id}
            </h3>
            {isReplacementOrder && (
              <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-0.5 font-inter text-[10px] font-semibold tracking-[-0.2px] text-cyan-700">
                Replacement
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-black">
              {displayStatus}
            </p>
            {/* Show tracking info inline with status when order is shipped/in shipping */}
            {order.tracking_number && (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'partially_shipped') && (
              <>
                <span className="text-[#999]">•</span>
                <div className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-inter text-[14px] font-medium text-[#007AFF]">
                    {order.tracking_number}
                  </span>
                  {order.courier && (
                    <span className="font-inter text-[12px] text-[#666]">
                      ({order.courier})
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-black">
            {displayDate}
          </p>
          <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-black">
            {displayTotal}
          </p>
          {freeShippingApplied && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-2 py-0.5 font-inter text-[10px] font-semibold tracking-[-0.2px] text-[#4CAF50]">
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Free Shipping
            </span>
          )}
        </div>

        {/* View Order Button */}
        <Link
          href={`/account/orders/${order.id}`}
          className="shrink-0 text-center rounded-full border border-black bg-white px-8 py-3 font-inter text-[14px] font-medium leading-[100%] tracking-[-0.28px] text-black transition-all duration-200 hover:bg-black hover:text-white focus:outline-none"
        >
          View order
        </Link>
      </div>

      {/* Product Images Carousel */}
      {orderItems.length > 0 && (
        <div className="relative mt-6 w-full overflow-hidden">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              type="button"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#E3E3E3] bg-white shadow-sm transition-colors hover:bg-gray-50"
              aria-label="Scroll left"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className='text-black'
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto overflow-y-hidden w-full md:w-[75vw] scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {orderItems.map((item) => (
              <div
                key={item.id}
                className="relative h-[237px] w-[206px] min-w-[206px] shrink-0 bg-[#F5F5F5]"
              >
                <Image
                  src={getItemThumbnail(item)}
                  alt={item.title}
                  fill
                  className="object-contain p-4"
                  sizes="206px"
                />
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              type="button"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#E3E3E3] bg-white shadow-sm transition-colors hover:bg-gray-50"
              aria-label="Scroll right"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className='text-black'
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
