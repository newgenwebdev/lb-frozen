'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { PaymentIcons } from '@/components/ui/PaymentIcons'
import { toast } from 'sonner'
import { getOrderById, type MedusaOrder, formatOrderPrice, isOrderItemPWP, isOrderItemVariantDiscount, getOrderItemEffectivePrice, getOrderItemOriginalPrice, getOrderItemDiscountedPrice } from '@/lib/api/orders'
import { updateNewsletterSubscription } from '@/lib/api/customer'

import type { MedusaOrderItem } from '@/lib/api/orders'

// Helper to get item thumbnail
const getItemThumbnail = (item: MedusaOrderItem): string => {
  return item.thumbnail || item.variant?.product?.thumbnail || '/product/product.jpg'
}

// Helper to check if URL is external
const isExternalUrl = (url: string): boolean => {
  return url.startsWith('http://') || url.startsWith('https://')
}

// Helper to get item name
const getItemName = (item: MedusaOrderItem): string => {
  return item.title || item.variant?.product?.title || 'Unknown Product'
}

// Helper to get item size
const getItemSize = (item: MedusaOrderItem): string => {
  return item.subtitle || item.variant?.title || 'Default'
}

// Loading component
function SuccessPageLoading(): React.JSX.Element {
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

// Main content component that uses useSearchParams
function SuccessPageContent(): React.JSX.Element {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order_id')

  const [newsletterChecked, setNewsletterChecked] = useState(false)
  const [isUpdatingNewsletter, setIsUpdatingNewsletter] = useState(false)
  const [order, setOrder] = useState<MedusaOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Handle continue shopping
  const handleContinueShopping = (): void => {
    router.push('/products')
  }

  // Handle newsletter subscription toggle
  const handleNewsletterChange = async (checked: boolean): Promise<void> => {
    setNewsletterChecked(checked)
    setIsUpdatingNewsletter(true)

    try {
      await updateNewsletterSubscription(checked)
      toast.success(checked ? 'Subscribed to newsletter' : 'Unsubscribed from newsletter')
    } catch (error) {
      // Revert on error
      setNewsletterChecked(!checked)
      toast.error('Failed to update newsletter preference')
      console.error('Newsletter update error:', error)
    } finally {
      setIsUpdatingNewsletter(false)
    }
  }

  // Fetch order from Medusa
  useEffect(() => {
    const fetchOrder = async (): Promise<void> => {
      if (!orderId) {
        setIsLoading(false)
        return
      }

      try {
        const fetchedOrder = await getOrderById(orderId)
        setOrder(fetchedOrder)
      } catch (error) {
        console.error('Failed to fetch order:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-black" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 font-inter text-[14px] text-[#999]">Loading order details...</p>
        </div>
      </div>
    )
  }

  // Order not found
  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="font-inter text-[24px] font-medium tracking-[-1.44px] text-black">Order not found</h1>
          <p className="mt-2 font-inter text-[14px] text-[#999]">We couldn&apos;t find your order details.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-full bg-black px-8 py-3 font-inter text-[14px] font-medium text-white"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    )
  }

  // Get order data from Medusa order
  const orderItems = order.items || []
  const shippingAddress = order.shipping_address
  const shippingMethod = order.shipping_methods?.[0]
  const currencyCode = order.currency_code || 'SGD'

  // Extract coupon discount from order metadata (stored by our coupon system)
  const couponDiscountAmount = Number(order.metadata?.applied_coupon_discount) || 0
  const couponCode = order.metadata?.applied_coupon_code as string | undefined

  // Extract points discount from order metadata (stored by our points system)
  const pointsDiscountAmount = Number(order.metadata?.points_discount_amount) || 0
  const pointsRedeemed = Number(order.metadata?.points_to_redeem) || 0

  // Extract free shipping discount from order metadata
  const freeShippingApplied = order.metadata?.free_shipping_applied === true
  const freeShippingDiscount = Number(order.metadata?.free_shipping_discount) || 0
  const originalShippingCost = Number(order.metadata?.original_shipping_cost) || 0

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

  // Extract membership promo discount from order metadata (stored by our membership promo system)
  const membershipPromoDiscount = Number(order.metadata?.applied_membership_promo_discount) || 0
  const membershipPromoName = order.metadata?.applied_membership_promo_name as string | undefined

  // Extract tier discount from order metadata (auto-applied based on membership tier)
  const tierDiscountAmount = Number(order.metadata?.tier_discount_amount) || 0
  const tierDiscountPercentage = Number(order.metadata?.tier_discount_percentage) || 0
  const tierName = order.metadata?.tier_name as string | undefined

  // Calculate original subtotal (before any discounts - using original prices)
  const originalSubtotal = orderItems.reduce((sum, item) => {
    const originalPrice = getOrderItemOriginalPrice(item)
    return sum + originalPrice * item.quantity
  }, 0)

  // Calculate PWP discount from item metadata
  const pwpDiscountAmount = orderItems.reduce((sum, item) => {
    if (isOrderItemPWP(item) && item.metadata?.pwp_discount_amount) {
      return sum + (Number(item.metadata.pwp_discount_amount) || 0) * item.quantity
    }
    return sum
  }, 0)

  // Calculate variant discount from item metadata (Set Discount Global from admin)
  const variantDiscountAmount = orderItems.reduce((sum, item) => {
    if (isOrderItemVariantDiscount(item) && item.metadata?.variant_discount_amount) {
      return sum + (Number(item.metadata.variant_discount_amount) || 0) * item.quantity
    }
    return sum
  }, 0)

  // Calculate subtotal after PWP and variant discounts
  const subtotalAfterDiscounts = originalSubtotal - pwpDiscountAmount - variantDiscountAmount

  // Effective shipping cost (0 if free shipping applied)
  const effectiveShippingCost = freeShippingApplied ? 0 : (order.shipping_total || 0)

  // Calculate correct total with all discounts applied
  const calculatedTotal = Math.max(0, subtotalAfterDiscounts + effectiveShippingCost + (order.tax_total || 0) - couponDiscountAmount - pointsDiscountAmount - membershipPromoDiscount - tierDiscountAmount)


  return (
    <div className="min-h-screen bg-white">
      <main className="grid min-h-screen grid-cols-1 lg:grid-cols-5 xl:grid-cols-3">
        {/* Left Column - Order Confirmation */}
        <div className="px-4 py-16 sm:px-6 sm:py-20 lg:col-span-3 lg:border-r lg:border-[#E3E3E3] lg:px-8 lg:py-24 xl:col-span-2 xl:py-28">
          {/* Confirmation Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            {/* Checkmark Icon */}
            <div className="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
                <mask id="mask0_25455_61420" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="40" height="40">
                  <rect width="40" height="40" fill="#D9D9D9"/>
                </mask>
                <g mask="url(#mask0_25455_61420)">
                  <path d="M17.6339 27.0899L28.8389 15.8849L27.0827 14.1287L17.6339 23.5774L12.8839 18.8274L11.1277 20.5837L17.6339 27.0899ZM20.0023 35.8337C17.8123 35.8337 15.7538 35.4181 13.8268 34.587C11.8999 33.7559 10.2238 32.628 8.79852 31.2032C7.37324 29.7785 6.24477 28.1031 5.4131 26.177C4.58171 24.2509 4.16602 22.193 4.16602 20.0032C4.16602 17.8132 4.58157 15.7548 5.41268 13.8278C6.24379 11.9009 7.37171 10.2248 8.79643 8.79949C10.2212 7.37421 11.8966 6.24574 13.8227 5.41408C15.7488 4.58269 17.8067 4.16699 19.9964 4.16699C22.1864 4.16699 24.2449 4.58255 26.1719 5.41366C28.0988 6.24477 29.7749 7.37269 31.2002 8.79741C32.6255 10.2221 33.7539 11.8975 34.5856 13.8237C35.417 15.7498 35.8327 17.8077 35.8327 19.9974C35.8327 22.1874 35.4171 24.2459 34.586 26.1728C33.7549 28.0998 32.627 29.7759 31.2023 31.2012C29.7775 32.6264 28.1021 33.7549 26.176 34.5866C24.2499 35.418 22.192 35.8337 20.0023 35.8337ZM19.9993 33.3337C23.7216 33.3337 26.8743 32.042 29.4577 29.4587C32.041 26.8753 33.3327 23.7225 33.3327 20.0003C33.3327 16.2781 32.041 13.1253 29.4577 10.542C26.8743 7.95866 23.7216 6.66699 19.9993 6.66699C16.2771 6.66699 13.1243 7.95866 10.541 10.542C7.95768 13.1253 6.66602 16.2781 6.66602 20.0003C6.66602 23.7225 7.95768 26.8753 10.541 29.4587C13.1243 32.042 16.2771 33.3337 19.9993 33.3337Z" fill="black"/>
                </g>
              </svg>
            </div>

            {/* Confirmation Number */}
            <p className="mb-2 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
              Confirmation #{order.display_id}
            </p>

            {/* Thank You Message */}
            <h1 className="font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
              Thank you, {shippingAddress?.first_name || 'Customer'}!
            </h1>
          </div>

          {/* Order Confirmed Message and Newsletter - Combined Container */}
          <div className="mb-8 rounded-lg border border-[#E3E3E3]">
            {/* Order Confirmed Message */}
            <div className="p-6">
              <h2 className="mb-2 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                Your order is confirmed
              </h2>
              <p className="mb-6 font-inter text-[12px] font-medium leading-[100%] tracking-[-0.72px] text-[#999]">
                You&apos;ll get a confirmation email with your order number soon.
              </p>

              <Link
                href={`/track-order?order_id=${orderId}`}
                className="inline-block cursor-pointer rounded-[48px] border border-[#999] bg-white px-12 py-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black backdrop-blur-[26px] transition-opacity hover:opacity-70"
              >
                Track order
              </Link>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E3E3E3]" />

            {/* Newsletter Checkbox */}
            <div className="bg-[#F7F7F7] p-6 backdrop-blur-[26px]">
              <label className={`flex items-start gap-3 ${isUpdatingNewsletter ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  id="success-newsletter"
                  name="newsletter"
                  checked={newsletterChecked}
                  onChange={(e) => handleNewsletterChange(e.target.checked)}
                  disabled={isUpdatingNewsletter}
                  className="peer sr-only"
                />
                <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#E3E3E3] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100 peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-2">
                  <svg className="h-3 w-3 text-white opacity-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                  Email me with news and offers
                </span>
              </label>
            </div>
          </div>

          {/* Order Details */}
          <div className="mb-8 rounded-lg border border-[#E3E3E3]">
            {/* Order Details */}
            <div className="p-6">
              <h2 className="mb-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                Order details
              </h2>

              {/* Two Column Layout for Details */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Contact Information */}
                <div>
                  <h3 className="mb-2 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                    Contact information
                  </h3>
                  <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                    {order.email}
                  </p>
                </div>

                {/* Payment Method */}
                <div>
                  <h3 className="mb-2 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                    Payment method
                  </h3>
                  <div className="flex items-center gap-2">
                    <PaymentIcons icons={['visa']} />
                    <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                      Card payment - {formatOrderPrice(calculatedTotal, currencyCode)}
                    </p>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h3 className="mb-2 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                    Shipping address
                  </h3>
                  {shippingAddress ? (
                    <>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {shippingAddress.first_name} {shippingAddress.last_name}
                      </p>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {shippingAddress.address_1}
                      </p>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {shippingAddress.city}, {shippingAddress.province || ''} {shippingAddress.postal_code}
                      </p>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {shippingAddress.country_code?.toUpperCase()}
                      </p>
                    </>
                  ) : (
                    <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                      No shipping address
                    </p>
                  )}
                </div>

                {/* Billing Address */}
                <div>
                  <h3 className="mb-2 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                    Billing address
                  </h3>
                  {order.billing_address ? (
                    <>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {order.billing_address.first_name} {order.billing_address.last_name}
                      </p>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {order.billing_address.address_1}
                      </p>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {order.billing_address.city}, {order.billing_address.province || ''} {order.billing_address.postal_code}
                      </p>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {order.billing_address.country_code?.toUpperCase()}
                      </p>
                    </>
                  ) : shippingAddress ? (
                    <>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {shippingAddress.first_name} {shippingAddress.last_name}
                      </p>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {shippingAddress.address_1}
                      </p>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {shippingAddress.city}, {shippingAddress.province || ''} {shippingAddress.postal_code}
                      </p>
                      <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {shippingAddress.country_code?.toUpperCase()}
                      </p>
                    </>
                  ) : (
                    <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                      No billing address
                    </p>
                  )}
                </div>

                {/* Shipping Method */}
                <div>
                  <h3 className="mb-2 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                    Shipping method
                  </h3>
                  {freeShippingApplied ? (
                    <p className="font-inter text-[14px] font-medium leading-[100%] tracking-[-0.84px] text-[#4CAF50]">
                      Free shipping applied
                    </p>
                  ) : (
                    <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                      {shippingMethodName}
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Continue Shopping and Help Link */}
          <div className="mb-6 flex items-center justify-between">
            {/* Help Link */}
            <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
              Need help?{' '}
              <Link href="/contact" className="cursor-pointer font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black underline hover:opacity-70">
                Contact support
              </Link>
            </p>

            {/* Continue Shopping Button */}
            <button
              onClick={handleContinueShopping}
              className="cursor-pointer rounded-[48px] bg-black px-12 py-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white backdrop-blur-[26px] transition-opacity hover:opacity-90"
            >
              Continue shopping
            </button>
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-[#E3E3E3]" />

          {/* Footer Links */}
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/return-policy" className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
              Return policy
            </Link>
            <Link href="/terms-service" className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
              Terms of service
            </Link>
            <Link href="/privacy-policy" className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black hover:opacity-70">
              Privacy policy
            </Link>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="bg-[#F7F7F7] px-4 py-16 sm:px-6 sm:py-20 lg:col-span-2 lg:px-8 lg:py-24 xl:col-span-1 xl:py-28">
          <div className="space-y-6">
            {/* Free Shipping Banner */}
            {freeShippingApplied && (
              <div className="flex items-center gap-2 rounded-lg bg-[#E8F5E9] p-4">
                <svg className="h-5 w-5 shrink-0 text-[#4CAF50]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-inter text-[14px] font-medium leading-[140%] tracking-[-0.28px] text-[#4CAF50]">
                  Free shipping applied - You saved {formatOrderPrice(freeShippingDiscount, currencyCode)}!
                </p>
              </div>
            )}

            {/* Product List */}
            {orderItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                {/* Product Image with Quantity Badge */}
                <div className="relative h-20 w-20 shrink-0">
                  <div className="h-full w-full overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={getItemThumbnail(item)}
                      alt={getItemName(item)}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized={isExternalUrl(getItemThumbnail(item))}
                    />
                  </div>
                  <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#E3E3E3]">
                    <span className="font-inter text-[12px] font-medium leading-[100%] text-black">
                      {item.quantity}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <h3 className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                      {getItemName(item)}
                    </h3>
                    <p className="mt-1 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                      {getItemSize(item)}
                    </p>
                    {/* PWP Badge */}
                    {isOrderItemPWP(item) && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-inter text-[10px] font-semibold tracking-[-0.6px] text-amber-700">
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                        PWP Deal
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    {isOrderItemPWP(item) && getOrderItemEffectivePrice(item) < item.unit_price ? (
                      <>
                        <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-amber-600">
                          {formatOrderPrice(getOrderItemEffectivePrice(item), currencyCode)}
                        </span>
                        <span className="mt-1 font-inter text-[12px] tracking-[-0.72px] text-[#999] line-through">
                          {formatOrderPrice(item.unit_price, currencyCode)}
                        </span>
                      </>
                    ) : isOrderItemVariantDiscount(item) ? (
                      <>
                        <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                          {formatOrderPrice(getOrderItemEffectivePrice(item), currencyCode)}
                        </span>
                        <span className="mt-1 font-inter text-[12px] tracking-[-0.72px] text-[#999] line-through">
                          {formatOrderPrice(getOrderItemOriginalPrice(item), currencyCode)}
                        </span>
                      </>
                    ) : (
                      <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        {formatOrderPrice(item.unit_price, currencyCode)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Divider */}
            <div className="h-px bg-[#E3E3E3]" />

            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                Subtotal ({orderItems.length} items)
              </span>
              <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                {formatOrderPrice(originalSubtotal, currencyCode)}
              </span>
            </div>

            {/* PWP Discount (only show if PWP discount was applied) */}
            {pwpDiscountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                  PWP Discount
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-amber-600">
                  -{formatOrderPrice(pwpDiscountAmount, currencyCode)}
                </span>
              </div>
            )}

            {/* Variant Discount (only show if variant discount was applied) */}
            {variantDiscountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                  Product Discount
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  -{formatOrderPrice(variantDiscountAmount, currencyCode)}
                </span>
              </div>
            )}

            {/* Shipping */}
            <div className="flex items-center justify-between">
              <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                Shipping
              </span>
              {freeShippingApplied ? (
                <div className="flex items-center gap-2">
                  <span className="font-inter text-[14px] tracking-[-0.84px] text-[#999] line-through">
                    {formatOrderPrice(originalShippingCost, currencyCode)}
                  </span>
                  <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#4CAF50]">
                    FREE
                  </span>
                </div>
              ) : (
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                  {formatOrderPrice(order.shipping_total, currencyCode)}
                </span>
              )}
            </div>

            {/* Tax */}
            <div className="flex items-center justify-between">
              <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                Tax
              </span>
              <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                {formatOrderPrice(order.tax_total, currencyCode)}
              </span>
            </div>

            {/* Coupon Discount (only show if coupon discount was applied) */}
            {couponDiscountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                  Coupon{couponCode ? ` (${couponCode})` : ''}
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  -{formatOrderPrice(couponDiscountAmount, currencyCode)}
                </span>
              </div>
            )}

            {/* Points Discount (only show if points discount was applied) */}
            {pointsDiscountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                  Points{pointsRedeemed > 0 ? ` (${pointsRedeemed.toLocaleString()} pts)` : ''}
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-amber-600">
                  -{formatOrderPrice(pointsDiscountAmount, currencyCode)}
                </span>
              </div>
            )}

            {/* Membership Promo Discount (only show if membership promo was applied) */}
            {membershipPromoDiscount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                  Member Discount{membershipPromoName ? ` (${membershipPromoName})` : ''}
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-purple-600">
                  -{formatOrderPrice(membershipPromoDiscount, currencyCode)}
                </span>
              </div>
            )}

            {/* Tier Discount (only show if tier discount was applied) */}
            {tierDiscountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-blue-600">
                  {tierName || 'Member'}{tierDiscountPercentage > 0 ? ` (${tierDiscountPercentage}% off)` : ''}
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-blue-600">
                  -{formatOrderPrice(tierDiscountAmount, currencyCode)}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-[#E3E3E3]" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
                Total
              </span>
              <span className="text-right font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
                {formatOrderPrice(calculatedTotal, currencyCode)}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Default export wrapped in Suspense
export default function SuccessPage(): React.JSX.Element {
  return (
    <Suspense fallback={<SuccessPageLoading />}>
      <SuccessPageContent />
    </Suspense>
  )
}
