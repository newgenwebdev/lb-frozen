'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import {
  type MedusaOrder,
  type MedusaOrderItem,
  getOrderById,
  getOrderDisplayStatus,
  formatOrderDate,
  formatOrderPrice,
  isOrderItemPWP,
  getOrderItemEffectivePrice,
} from '@/lib/api/orders'

// Loading component
function TrackOrderLoading(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <svg className="mx-auto h-8 w-8 animate-spin text-black" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 font-inter text-[14px] text-[#999]">Loading...</p>
      </div>
    </div>
  )
}

// Status step component
function StatusStep({
  label,
  isCompleted,
  isActive,
  isLast = false
}: {
  label: string
  isCompleted: boolean
  isActive: boolean
  isLast?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
          isCompleted
            ? 'border-green-500 bg-green-500'
            : isActive
              ? 'border-black bg-black'
              : 'border-[#E3E3E3] bg-white'
        }`}>
          {isCompleted ? (
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : isActive ? (
            <div className="h-2 w-2 rounded-full bg-white" />
          ) : null}
        </div>
        {!isLast && (
          <div className={`h-8 w-0.5 ${isCompleted ? 'bg-green-500' : 'bg-[#E3E3E3]'}`} />
        )}
      </div>
      <div className="pt-1">
        <p className={`font-inter text-[14px] font-medium leading-[100%] tracking-[-0.28px] ${
          isCompleted || isActive ? 'text-black' : 'text-[#999]'
        }`}>
          {label}
        </p>
      </div>
    </div>
  )
}

// Get status step index
function getStatusStepIndex(order: MedusaOrder): number {
  const status = order.fulfillment_status

  if (status === 'canceled' || (status as string) === 'cancelled') return -1
  if (status === 'delivered' || status === 'partially_delivered') return 4
  if (status === 'shipped' || status === 'partially_shipped') return 3
  if (status === 'fulfilled' || status === 'partially_fulfilled') return 2
  if ((status as string) === 'processing') return 1

  // Payment captured but not yet processing
  if (order.payment_status === 'captured') return 0

  return 0
}

// Main content component
function TrackOrderContent(): React.JSX.Element {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order_id')
  const { isAuthenticated, isLoading: authLoading } = useCustomer()

  const [order, setOrder] = useState<MedusaOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=/track-order${orderId ? `?order_id=${orderId}` : ''}`)
    }
  }, [authLoading, isAuthenticated, orderId, router])

  // Fetch order when authenticated
  useEffect(() => {
    async function fetchOrder(): Promise<void> {
      if (!isAuthenticated || !orderId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const fetchedOrder = await getOrderById(orderId)
        if (fetchedOrder) {
          setOrder(fetchedOrder)
        } else {
          setError('Order not found')
        }
      } catch (err) {
        console.error('Failed to fetch order:', err)
        setError('Failed to load order details. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchOrder()
    }
  }, [isAuthenticated, orderId])

  // Show loading while checking auth or fetching order
  if (authLoading || isLoading) {
    return <TrackOrderLoading />
  }

  // No order ID provided
  if (!orderId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="font-inter text-[24px] font-medium tracking-[-1.44px] text-black">
            Track your order
          </h1>
          <p className="mt-4 font-inter text-[14px] text-[#999]">
            Please provide an order ID to track your order.
          </p>
          <Link
            href="/account/orders"
            className="mt-6 inline-block rounded-full bg-black px-8 py-4 font-inter text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            View all orders
          </Link>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <h1 className="font-inter text-[24px] font-medium tracking-[-1.44px] text-black">
            {error === 'Order not found' ? 'Order not found' : 'Something went wrong'}
          </h1>
          <p className="mt-4 font-inter text-[14px] text-[#999]">
            {error || 'Unable to load order details.'}
          </p>
          <Link
            href="/account/orders"
            className="mt-6 inline-block rounded-full bg-black px-8 py-4 font-inter text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          >
            View all orders
          </Link>
        </div>
      </div>
    )
  }

  // Get display values
  const displayStatus = getOrderDisplayStatus(order)
  const displayDate = formatOrderDate(order.created_at)
  const currencyCode = order.currency_code
  const orderItems = order.items || []
  const shippingAddress = order.shipping_address
  const statusStep = getStatusStepIndex(order)
  const isCancelled = statusStep === -1

  // Extract EasyParcel shipping info from order metadata
  const easyParcelShipping = order.metadata?.easyparcel_shipping as {
    service_id?: string
    service_name?: string
    courier_id?: string
    courier_name?: string
    courier_logo?: string
    price?: number
    price_display?: string
    delivery_eta?: string
  } | undefined

  // Get thumbnail URL for an item
  const getItemThumbnail = (item: MedusaOrderItem): string => {
    if (item.thumbnail) return item.thumbnail
    if (item.variant?.product?.thumbnail) return item.variant.product.thumbnail
    return '/product/product1.png'
  }

  // Status steps
  const statusSteps = [
    { label: 'Order Confirmed', step: 0 },
    { label: 'Processing', step: 1 },
    { label: 'Packed', step: 2 },
    { label: 'Shipped', step: 3 },
    { label: 'Delivered', step: 4 },
  ]

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 font-inter text-[14px] font-medium text-[#999] transition-colors hover:text-black"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to orders
          </Link>
        </div>

        {/* Order Info Card */}
        <div className="rounded-xl border border-[#E3E3E3] bg-white p-6 sm:p-8">
          {/* Order Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-inter text-[24px] font-medium tracking-[-1.44px] text-black">
                Order #{order.display_id}
              </h1>
              <p className="mt-1 font-inter text-[14px] text-[#999]">
                Placed on {displayDate}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
              isCancelled
                ? 'bg-red-100 text-red-700'
                : statusStep >= 4
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
            }`}>
              <span className="font-inter text-[14px] font-medium">
                {displayStatus}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 h-px bg-[#E3E3E3]" />

          {/* Status Timeline */}
          {!isCancelled && (
            <div className="mb-8">
              <h2 className="mb-6 font-inter text-[16px] font-medium tracking-[-0.32px] text-black">
                Order Status
              </h2>
              <div className="flex flex-col">
                {statusSteps.map((step, index) => (
                  <StatusStep
                    key={step.label}
                    label={step.label}
                    isCompleted={statusStep > step.step}
                    isActive={statusStep === step.step}
                    isLast={index === statusSteps.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Notice */}
          {isCancelled && (
            <div className="mb-8 rounded-lg bg-red-50 p-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="font-inter text-[14px] font-medium text-red-700">
                  This order has been cancelled
                </p>
              </div>
            </div>
          )}

          {/* Shipping Info */}
          {easyParcelShipping && !isCancelled && (
            <div className="mb-8 rounded-lg bg-[#F7F7F7] p-6">
              <h2 className="mb-4 font-inter text-[16px] font-medium tracking-[-0.32px] text-black">
                Shipping Details
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-inter text-[12px] font-medium uppercase tracking-[0.5px] text-[#999]">
                    Courier
                  </p>
                  <p className="mt-1 font-inter text-[14px] font-medium text-black">
                    {easyParcelShipping.courier_name || 'Standard Shipping'}
                    {easyParcelShipping.service_name && (
                      <span className="text-[#666]"> - {easyParcelShipping.service_name}</span>
                    )}
                  </p>
                </div>
                {easyParcelShipping.delivery_eta && (
                  <div>
                    <p className="font-inter text-[12px] font-medium uppercase tracking-[0.5px] text-[#999]">
                      Estimated Delivery
                    </p>
                    <p className="mt-1 font-inter text-[14px] font-medium text-black">
                      {easyParcelShipping.delivery_eta}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery Address */}
          {shippingAddress && (
            <div className="mb-8">
              <h2 className="mb-4 font-inter text-[16px] font-medium tracking-[-0.32px] text-black">
                Delivery Address
              </h2>
              <div className="space-y-1">
                <p className="font-inter text-[14px] text-black">
                  {shippingAddress.first_name} {shippingAddress.last_name}
                </p>
                <p className="font-inter text-[14px] text-[#666]">
                  {shippingAddress.address_1}
                </p>
                {shippingAddress.address_2 && (
                  <p className="font-inter text-[14px] text-[#666]">
                    {shippingAddress.address_2}
                  </p>
                )}
                <p className="font-inter text-[14px] text-[#666]">
                  {shippingAddress.city}, {shippingAddress.province || ''} {shippingAddress.postal_code}
                </p>
                <p className="font-inter text-[14px] text-[#666]">
                  {shippingAddress.country_code?.toUpperCase()}
                </p>
                {shippingAddress.phone && (
                  <p className="font-inter text-[14px] text-[#666]">
                    {shippingAddress.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="my-8 h-px bg-[#E3E3E3]" />

          {/* Order Items */}
          <div>
            <h2 className="mb-4 font-inter text-[16px] font-medium tracking-[-0.32px] text-black">
              Items ({orderItems.length})
            </h2>
            <div className="space-y-4">
              {orderItems.map((item) => {
                const isPWP = isOrderItemPWP(item)
                const effectivePrice = getOrderItemEffectivePrice(item)
                const hasPWPDiscount = isPWP && effectivePrice < item.unit_price

                return (
                  <div key={item.id} className="flex items-center gap-4">
                    {/* Product Image */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F5F5F5]">
                      <Image
                        src={getItemThumbnail(item)}
                        alt={item.title}
                        fill
                        className="object-contain p-2"
                        sizes="64px"
                      />
                      {item.quantity > 1 && (
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black">
                          <span className="font-inter text-[10px] font-medium text-white">
                            {item.quantity}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex flex-1 items-center justify-between">
                      <div>
                        <p className="font-inter text-[14px] font-medium text-black">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="font-inter text-[12px] text-[#999]">
                            {item.subtitle}
                          </p>
                        )}
                        {isPWP && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-inter text-[10px] font-semibold text-amber-700">
                            PWP Deal
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {hasPWPDiscount ? (
                          <>
                            <p className="font-inter text-[14px] font-medium text-amber-600">
                              {formatOrderPrice(effectivePrice * item.quantity, currencyCode)}
                            </p>
                            <p className="font-inter text-[12px] text-[#999] line-through">
                              {formatOrderPrice(item.unit_price * item.quantity, currencyCode)}
                            </p>
                          </>
                        ) : (
                          <p className="font-inter text-[14px] font-medium text-black">
                            {formatOrderPrice(item.unit_price * item.quantity, currencyCode)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 h-px bg-[#E3E3E3]" />

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/account/orders/${order.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black bg-white px-6 py-3 font-inter text-[14px] font-medium text-black transition-colors hover:bg-black hover:text-white"
            >
              View full order details
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 font-inter text-[14px] font-medium text-[#999] transition-colors hover:text-black"
            >
              Need help?
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

// Default export wrapped in Suspense
export default function TrackOrderPage(): React.JSX.Element {
  return (
    <Suspense fallback={<TrackOrderLoading />}>
      <TrackOrderContent />
    </Suspense>
  )
}
