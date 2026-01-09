'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCustomer } from '@/lib/context/CustomerContext'
import {
  type MedusaOrder,
  type MedusaOrderItem,
  getOrderById,
  getOrderDisplayStatus,
  formatOrderDate,
  formatOrderPrice,
  isOrderItemPWP,
  isOrderItemVariantDiscount,
  getOrderItemEffectivePrice,
  getOrderItemOriginalPrice,
  getOrderItemDiscountedPrice,
  downloadOrderInvoice,
} from '@/lib/api/orders'

export default function OrderDetailPage(): React.JSX.Element {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  const { isAuthenticated, isLoading: authLoading } = useCustomer()

  const [order, setOrder] = useState<MedusaOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=/account/orders/${orderId}`)
    }
  }, [authLoading, isAuthenticated, orderId, router])

  // Fetch order when authenticated
  useEffect(() => {
    async function fetchOrder(): Promise<void> {
      if (!isAuthenticated || !orderId) return

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
          <span className="font-inter text-[14px] text-black">Loading order...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !order) {
    return (
      <div className="flex flex-col items-start">
        <h2 className="font-inter text-[24px] font-semibold leading-[120%] tracking-[-0.48px] text-black">
          {error === 'Order not found' ? 'Order not found' : 'Something went wrong'}
        </h2>
        <p className="mt-2 font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#999]">
          {error || 'Unable to load order details.'}
        </p>
        <Link
          href="/account/orders"
          className="mt-6 inline-block cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[14px] font-medium leading-[100%] tracking-[-0.28px] text-white transition-colors hover:bg-black/80"
        >
          Back to orders
        </Link>
      </div>
    )
  }

  // Get display values
  const displayStatus = getOrderDisplayStatus(order)
  const displayDate = formatOrderDate(order.created_at)
  const currencyCode = order.currency_code
  const orderItems = order.items || []
  const shippingAddress = order.shipping_address
  const shippingMethod = order.shipping_methods?.[0]

  // Extract EasyParcel shipping info from order metadata (the actual selected shipping)
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

  // Get shipping method name - prefer EasyParcel courier name from metadata
  const shippingMethodName = easyParcelShipping?.courier_name
    ? `${easyParcelShipping.courier_name}${easyParcelShipping.service_name ? ` - ${easyParcelShipping.service_name}` : ''}`
    : shippingMethod?.name || 'Standard Shipping'

  // Calculate item count
  const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0)

  // Calculate all discounts and correct total for header display
  // Use getOrderItemOriginalPrice for original subtotal to handle variant discounts
  const headerOriginalSubtotal = orderItems.reduce((sum, item) => {
    const originalPrice = getOrderItemOriginalPrice(item)
    return sum + originalPrice * (item.quantity || 0)
  }, 0)
  const headerPwpDiscount = orderItems.reduce((sum, item) => {
    if (isOrderItemPWP(item) && item.metadata?.pwp_discount_amount) {
      return sum + (Number(item.metadata.pwp_discount_amount) || 0) * (item.quantity || 0)
    }
    return sum
  }, 0)
  // Calculate variant discount from item metadata (Set Discount Global from admin)
  const headerVariantDiscount = orderItems.reduce((sum, item) => {
    if (isOrderItemVariantDiscount(item) && item.metadata?.variant_discount_amount) {
      return sum + (Number(item.metadata.variant_discount_amount) || 0) * (item.quantity || 0)
    }
    return sum
  }, 0)
  const headerCouponDiscount = Math.max(0, (order.discount_total || 0) - headerPwpDiscount)
  // Extract points discount from order metadata
  const headerPointsDiscount = Number(order.metadata?.points_discount_amount) || 0
  // Extract membership promo discount from order metadata
  const headerMembershipPromoDiscount = Number(order.metadata?.applied_membership_promo_discount) || 0
  // Extract tier discount from order metadata (auto-applied based on membership tier)
  const headerTierDiscount = Number(order.metadata?.tier_discount_amount) || 0
  // Check for free shipping discount
  const freeShippingApplied = order.metadata?.free_shipping_applied === true
  const freeShippingDiscount = Number(order.metadata?.free_shipping_discount) || 0
  const originalShippingCost = Number(order.metadata?.original_shipping_cost) || 0
  const headerShippingCost = freeShippingApplied ? 0 : (order.shipping_total || 0)
  const headerTotal = Math.max(0, headerOriginalSubtotal - headerPwpDiscount - headerVariantDiscount - headerCouponDiscount - headerPointsDiscount - headerMembershipPromoDiscount - headerTierDiscount + headerShippingCost + (order.tax_total || 0))

  // Get thumbnail URL for an item
  const getItemThumbnail = (item: MedusaOrderItem): string => {
    if (item.thumbnail) return item.thumbnail
    if (item.variant?.product?.thumbnail) return item.variant.product.thumbnail
    return '/product/product1.png'
  }

  // Handle invoice download
  const handleDownloadInvoice = async (): Promise<void> => {
    if (!order || isDownloadingInvoice) return

    setIsDownloadingInvoice(true)
    try {
      const success = await downloadOrderInvoice(order.id, order.display_id)
      if (!success) {
        console.error('Failed to download invoice')
      }
    } finally {
      setIsDownloadingInvoice(false)
    }
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* Order Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="font-inter text-[18px] font-medium leading-[140%] tracking-[-0.36px] text-black">
            Order #{order.display_id}
          </h1>
          <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-black">
            {displayStatus}
          </p>
          <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-black">
            {displayDate}
          </p>
          <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-black">
            {formatOrderPrice(headerTotal, currencyCode)}
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

        {/* Download Invoice Button */}
        <button
          type="button"
          onClick={handleDownloadInvoice}
          disabled={isDownloadingInvoice}
          className="shrink-0 cursor-pointer rounded-full border border-black bg-white px-6 py-3 font-inter text-[14px] font-medium leading-[100%] tracking-[-0.28px] text-black transition-all duration-200 hover:bg-black hover:text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDownloadingInvoice ? 'Downloading...' : 'Download invoice'}
        </button>
      </div>

      {/* Replacement Order Banner - Show if this is a replacement order */}
      {order.metadata?.is_replacement_order === true && (
        <div className="mt-6 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100">
              <svg
                className="h-5 w-5 text-cyan-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-inter text-[14px] font-medium leading-[140%] tracking-[-0.28px] text-cyan-800">
                Replacement Order
              </h3>
              <p className="mt-1 font-inter text-[13px] font-normal leading-[150%] tracking-[-0.26px] text-cyan-700">
                {`This order is a free replacement for order #${String(order.metadata?.original_order_display_id ?? 'N/A')}.`}
                {order.metadata?.replacement_reason ? (
                  <span className="ml-1">
                    {`Reason: ${String(order.metadata.replacement_reason).replace(/_/g, ' ')}`}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {orderItems.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            currencyCode={currencyCode}
            getItemThumbnail={getItemThumbnail}
          />
        ))}
      </div>

      {/* Shipping Information & Order Summary */}
      <div className="mt-12 grid grid-cols-1 gap-8 border-t border-[#E3E3E3] pt-8 md:grid-cols-2">
        {/* Shipping Information */}
        <div>
          <h2 className="font-inter text-[18px] font-medium leading-[140%] tracking-[-0.36px] text-black">
            Shipping information
          </h2>

          {shippingAddress ? (
            <>
              <div className="mt-4 space-y-1">
                <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-black">
                  {shippingAddress.first_name} {shippingAddress.last_name}
                </p>
                <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                  {shippingAddress.address_1}
                  {shippingAddress.address_2 && `, ${shippingAddress.address_2}`}
                  {shippingAddress.city && `, ${shippingAddress.city}`}
                  {shippingAddress.province && `, ${shippingAddress.province}`}
                  {shippingAddress.postal_code && ` ${shippingAddress.postal_code}`}
                  {shippingAddress.country_code && `, ${shippingAddress.country_code.toUpperCase()}`}
                </p>
                {shippingAddress.phone && (
                  <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                    {shippingAddress.phone}
                  </p>
                )}
              </div>

              {(shippingMethod || easyParcelShipping) && (
                <div className="mt-6">
                  <p className="font-inter text-[14px] font-medium leading-[150%] tracking-[-0.28px] text-black">
                    Shipping method
                  </p>
                  <p className="mt-1 font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                    {shippingMethodName}
                  </p>
                  {freeShippingApplied && (
                    <p className="mt-1 font-inter text-[13px] font-medium leading-[150%] tracking-[-0.26px] text-[#4CAF50]">
                      Free shipping applied
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
              No shipping information available
            </p>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <h2 className="font-inter text-[18px] font-medium leading-[140%] tracking-[-0.36px] text-black">
            Order summary
          </h2>

          {(() => {
            // Calculate original subtotal (before any discounts)
            // Use getOrderItemOriginalPrice for proper original price handling
            const originalSubtotal = orderItems.reduce((sum, item) => {
              const originalPrice = getOrderItemOriginalPrice(item)
              return sum + originalPrice * (item.quantity || 0)
            }, 0)

            // Calculate PWP discount from item metadata
            const pwpDiscountAmount = orderItems.reduce((sum, item) => {
              if (isOrderItemPWP(item) && item.metadata?.pwp_discount_amount) {
                return sum + (Number(item.metadata.pwp_discount_amount) || 0) * (item.quantity || 0)
              }
              return sum
            }, 0)

            // Calculate variant discount from item metadata (Set Discount Global from admin)
            const variantDiscountAmount = orderItems.reduce((sum, item) => {
              if (isOrderItemVariantDiscount(item) && item.metadata?.variant_discount_amount) {
                return sum + (Number(item.metadata.variant_discount_amount) || 0) * (item.quantity || 0)
              }
              return sum
            }, 0)

            // Coupon discount = total discount minus PWP discount (to avoid double-counting)
            const couponDiscountAmount = Math.max(0, (order.discount_total || 0) - pwpDiscountAmount)

            // Extract coupon code from metadata if available
            const couponCode = order.metadata?.applied_coupon_code as string | undefined

            // Extract points discount from order metadata
            const pointsDiscountAmount = Number(order.metadata?.points_discount_amount) || 0
            const pointsRedeemed = Number(order.metadata?.points_to_redeem) || 0

            // Extract membership promo discount from order metadata
            const membershipPromoDiscountAmount = Number(order.metadata?.applied_membership_promo_discount) || 0
            const membershipPromoName = order.metadata?.applied_membership_promo_name as string | undefined

            // Extract tier discount from order metadata (auto-applied based on membership tier)
            const tierDiscountAmount = Number(order.metadata?.tier_discount_amount) || 0
            const tierDiscountPercentage = Number(order.metadata?.tier_discount_percentage) || 0
            const tierName = order.metadata?.tier_name as string | undefined

            // Calculate correct total with all discounts (including free shipping)
            const subtotalAfterDiscounts = originalSubtotal - pwpDiscountAmount - variantDiscountAmount
            const shippingCost = freeShippingApplied ? 0 : (order.shipping_total || 0)
            const calculatedTotal = Math.max(0, subtotalAfterDiscounts - couponDiscountAmount - pointsDiscountAmount - membershipPromoDiscountAmount - tierDiscountAmount + shippingCost + (order.tax_total || 0))

            return (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                    Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                  </p>
                  <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-black">
                    {formatOrderPrice(originalSubtotal, currencyCode)}
                  </p>
                </div>

                {pwpDiscountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                      PWP Discount
                    </p>
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-amber-600">
                      -{formatOrderPrice(pwpDiscountAmount, currencyCode)}
                    </p>
                  </div>
                )}

                {variantDiscountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                      Product Discount
                    </p>
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-green-600">
                      -{formatOrderPrice(variantDiscountAmount, currencyCode)}
                    </p>
                  </div>
                )}

                {couponDiscountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                      Coupon{couponCode ? ` (${couponCode})` : ''}
                    </p>
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-green-600">
                      -{formatOrderPrice(couponDiscountAmount, currencyCode)}
                    </p>
                  </div>
                )}

                {pointsDiscountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                      Points{pointsRedeemed > 0 ? ` (${pointsRedeemed.toLocaleString()} pts)` : ''}
                    </p>
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-amber-600">
                      -{formatOrderPrice(pointsDiscountAmount, currencyCode)}
                    </p>
                  </div>
                )}

                {membershipPromoDiscountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                      Member Discount{membershipPromoName ? ` (${membershipPromoName})` : ''}
                    </p>
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-purple-600">
                      -{formatOrderPrice(membershipPromoDiscountAmount, currencyCode)}
                    </p>
                  </div>
                )}

                {tierDiscountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-blue-600">
                      {tierName || 'Member'}{tierDiscountPercentage > 0 ? ` (${tierDiscountPercentage}% off)` : ''}
                    </p>
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-blue-600">
                      -{formatOrderPrice(tierDiscountAmount, currencyCode)}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                    Shipping
                  </p>
                  {freeShippingApplied ? (
                    <div className="flex items-center gap-2">
                      <span className="font-inter text-[12px] tracking-[-0.24px] text-[#999] line-through">
                        {formatOrderPrice(originalShippingCost, currencyCode)}
                      </span>
                      <span className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#4CAF50]">
                        FREE
                      </span>
                    </div>
                  ) : (
                    <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-black">
                      {(order.shipping_total || 0) === 0
                        ? 'Free'
                        : formatOrderPrice(order.shipping_total || 0, currencyCode)}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-[#666]">
                    Tax
                  </p>
                  <p className="font-inter text-[14px] font-normal leading-[150%] tracking-[-0.28px] text-black">
                    {formatOrderPrice(order.tax_total || 0, currencyCode)}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <p className="font-inter text-[14px] font-medium leading-[150%] tracking-[-0.28px] text-black">
                    Total
                  </p>
                  <p className="font-inter text-[18px] font-medium leading-[150%] tracking-[-0.36px] text-black">
                    {formatOrderPrice(calculatedTotal, currencyCode)}
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Footer Links */}
      <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-[#E3E3E3] pt-6">
        <Link
          href="/shipping-policy"
          className="font-inter text-[14px] font-normal leading-[100%] tracking-[-0.28px] text-black underline underline-offset-2 transition-colors hover:text-[#666]"
        >
          Shipping policy
        </Link>
        <Link
          href="/return-policy"
          className="font-inter text-[14px] font-normal leading-[100%] tracking-[-0.28px] text-black underline underline-offset-2 transition-colors hover:text-[#666]"
        >
          Start a return
        </Link>
        <Link
          href="/contact"
          className="font-inter text-[14px] font-normal leading-[100%] tracking-[-0.28px] text-black underline underline-offset-2 transition-colors hover:text-[#666]"
        >
          Contact us
        </Link>
      </div>
    </div>
  )
}

type ProductCardProps = {
  item: MedusaOrderItem
  currencyCode: string
  getItemThumbnail: (item: MedusaOrderItem) => string
}

function ProductCard({ item, currencyCode, getItemThumbnail }: ProductCardProps): React.JSX.Element {
  const isPWP = isOrderItemPWP(item)
  const effectivePrice = getOrderItemEffectivePrice(item)
  const hasPWPDiscount = isPWP && effectivePrice < item.unit_price

  // Check for variant discount (Set Discount Global from admin)
  const hasVariantDiscount = Boolean(item.metadata?.is_variant_discount)

  // Check for wholesale tier discount
  const hasWholesaleTierDiscount = Boolean(item.metadata?.is_bulk_price)

  // Use the helper functions to get original and discounted prices
  const originalPriceForDisplay = getOrderItemOriginalPrice(item)
  const discountedPriceForDisplay = getOrderItemDiscountedPrice(item)

  // Determine if any discount is applied (excluding PWP which has its own display)
  const hasNonPWPDiscount = !isPWP && (hasVariantDiscount || hasWholesaleTierDiscount)

  return (
    <div className="flex flex-col">
      {/* Product Image */}
      <div className="relative aspect-square w-full bg-[#F5F5F5]">
        <Image
          src={getItemThumbnail(item)}
          alt={item.title}
          fill
          className="object-contain p-4"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Product Info */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-black">
              {item.title}
            </p>
            {isPWP && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-inter text-[10px] font-semibold tracking-[-0.2px] text-amber-700">
                PWP
              </span>
            )}
            {!isPWP && hasWholesaleTierDiscount && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-inter text-[10px] font-semibold tracking-[-0.2px] text-green-700">
                Bulk
              </span>
            )}
            {!isPWP && !hasWholesaleTierDiscount && hasVariantDiscount && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-inter text-[10px] font-semibold tracking-[-0.2px] text-green-700">
                Sale
              </span>
            )}
          </div>
          {item.quantity > 1 && (
            <p className="font-inter text-[12px] font-normal leading-[140%] tracking-[-0.24px] text-[#666]">
              Qty: {item.quantity}
            </p>
          )}
        </div>
        <div className="text-right">
          {hasPWPDiscount ? (
            /* PWP discount */
            <>
              <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-amber-600">
                {formatOrderPrice(effectivePrice * item.quantity, currencyCode)}
              </p>
              <p className="font-inter text-[12px] font-normal leading-[140%] tracking-[-0.24px] text-[#999] line-through">
                {formatOrderPrice(item.unit_price * item.quantity, currencyCode)}
              </p>
            </>
          ) : hasNonPWPDiscount ? (
            /* Variant discount or wholesale tier discount */
            <>
              <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-green-600">
                {formatOrderPrice(discountedPriceForDisplay * item.quantity, currencyCode)}
              </p>
              <p className="font-inter text-[12px] font-normal leading-[140%] tracking-[-0.24px] text-[#999] line-through">
                {formatOrderPrice(originalPriceForDisplay * item.quantity, currencyCode)}
              </p>
            </>
          ) : (
            <p className="font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-black">
              {formatOrderPrice(item.unit_price * item.quantity, currencyCode)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
