'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PaymentIcons } from '@/components/ui/PaymentIcons'
import { PromoCodeInput } from './PromoCodeInput'
import { PWPOffers } from './PWPOffers'
import { useCart } from '@/lib/context/CartContext'
import { useCustomer } from '@/lib/context/CustomerContext'

type OrderSummaryProps = {
  subtotal: number
  itemCount: number
}

const FREE_SHIPPING_THRESHOLD = 100.00

export const OrderSummary = ({ subtotal, itemCount }: OrderSummaryProps): React.JSX.Element => {
  const router = useRouter()
  const { appliedCoupon, appliedTierDiscount } = useCart()
  const { isAuthenticated } = useCustomer()

  const handleCheckout = (): void => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout')
      return
    }
    router.push('/checkout')
  }

  // Calculate estimated total with all discounts
  const couponDiscountAmount = appliedCoupon?.discount_amount ? appliedCoupon.discount_amount / 100 : 0
  const tierDiscountAmount = appliedTierDiscount?.discount_amount ? appliedTierDiscount.discount_amount / 100 : 0
  // Ensure discounts don't exceed subtotal (safety check)
  const totalDiscount = couponDiscountAmount + tierDiscountAmount
  const effectiveDiscount = Math.min(totalDiscount, subtotal)
  const estimatedTotal = Math.max(0, subtotal - effectiveDiscount)

  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const hasFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD

  return (
    <div className="rounded-lg bg-white px-8">
      <h2 className="mb-6 font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black" style={{ fontWeight: 500 }}>
        Order summary
      </h2>

      {/* Subtotal */}
      <div className="mb-4 flex items-center justify-between">
        <span className="font-inter text-[16px] leading-[100%] tracking-[-0.96px] text-black" style={{ fontWeight: 500 }}>
          Subtotal ({itemCount} items)
        </span>
        <span className="font-inter text-[16px] leading-[100%] tracking-[-0.96px] text-black" style={{ fontWeight: 500 }}>
          ${subtotal.toFixed(2)}
        </span>
      </div>

      {/* Shipping */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-inter text-[16px] leading-[100%] tracking-[-0.96px] text-black" style={{ fontWeight: 500 }}>
              Shipping
            </span>
            {!hasFreeShipping && (
              <p className="mt-1 font-inter text-[12px] leading-[100%] tracking-[-0.72px]" style={{ fontWeight: 500 }}>
                <span className="text-[#999]">You&apos;re </span>
                <span className="text-black">${remainingForFreeShipping.toFixed(2)}</span>
                <span className="text-[#999]"> away from free shipping</span>
              </p>
            )}
          </div>
          <span className="text-right font-inter text-[12px] leading-[100%] tracking-[-0.72px] text-[#999] lg:text-[14px] lg:tracking-[-0.84px]" style={{ fontWeight: 500 }}>
            Calculated in checkout
          </span>
        </div>
      </div>

      {/* Tax */}
      <div className="mb-6 flex items-center justify-between">
        <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
          Tax
        </span>
        <span className="font-inter text-[14px] font-medium leading-[100%] tracking-[-0.84px] text-[#999]">
          Calculated in checkout
        </span>
      </div>

      {/* Promo Code */}
      <div className="mb-6 border-b border-[#E3E3E3] pb-6">
        <PromoCodeInput />
      </div>

      {/* PWP Offers */}
      <PWPOffers className="mb-6 border-b border-[#E3E3E3] pb-6" />

      {/* Tier Discount (automatically applied for members) */}
      {appliedTierDiscount && tierDiscountAmount > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <span className="font-inter text-[16px] leading-[100%] tracking-[-0.96px] text-blue-600" style={{ fontWeight: 500 }}>
            {appliedTierDiscount.name} ({appliedTierDiscount.discount_percentage}% off)
          </span>
          <span className="font-inter text-[16px] leading-[100%] tracking-[-0.96px] text-blue-600" style={{ fontWeight: 500 }}>
            -${tierDiscountAmount.toFixed(2)}
          </span>
        </div>
      )}

      {/* Coupon Discount (if applied) */}
      {appliedCoupon && couponDiscountAmount > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <span className="font-inter text-[16px] leading-[100%] tracking-[-0.96px] text-green-600" style={{ fontWeight: 500 }}>
            Coupon ({appliedCoupon.code})
          </span>
          <span className="font-inter text-[16px] leading-[100%] tracking-[-0.96px] text-green-600" style={{ fontWeight: 500 }}>
            -${couponDiscountAmount.toFixed(2)}
          </span>
        </div>
      )}

      {/* Estimated Total */}
      <div className="mb-6 flex items-center justify-between">
        <span className="font-inter text-[16px] leading-[100%] tracking-[-0.96px] text-black" style={{ fontWeight: 500 }}>
          Estimated total
        </span>
        <span className="text-right font-inter text-[24px] leading-[100%] tracking-[-1.44px] text-black" style={{ fontWeight: 500 }}>
          ${estimatedTotal.toFixed(2)}
        </span>
      </div>

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        className="mb-4 block w-full cursor-pointer rounded-[48px] bg-black p-6 text-center font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90"
      >
        Checkout
      </button>

      {/* Terms Agreement */}
      <div className="mb-6">
        <p className="font-inter text-[12px] leading-[100%] tracking-[-0.72px] text-black" style={{ fontWeight: 500 }}>
          By continuing, I confirm that I have read and accept the{' '}
          <Link href="/terms-service" className="underline hover:opacity-70">
            Terms of Service
          </Link>
          {' '}and the{' '}
          <Link href="/privacy-policy" className="underline hover:opacity-70">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-[#E3E3E3] pt-6">
        <p className="mb-4 font-inter text-[14px] font-medium leading-[100%] tracking-[-0.84px] text-black">
          We accept
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <PaymentIcons />
        </div>
      </div>
    </div>
  )
}
