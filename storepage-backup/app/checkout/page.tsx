'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCart } from '@/lib/context/CartContext'
import { useCustomer } from '@/lib/context/CustomerContext'
import { stripePromise, stripeAppearance } from '@/lib/context/StripeContext'
import { PaymentIcons } from '@/components/ui/PaymentIcons'
import { PromoCodeInput } from '@/components/cart/PromoCodeInput'
import { PointsRedemptionInput } from '@/components/cart/PointsRedemptionInput'
import { MembershipPromoSection } from '@/components/cart/MembershipPromoSection'
import type { MedusaCartLineItem, MedusaCartAddress } from '@/lib/api/cart'
import { getLineItemEffectivePrice } from '@/lib/api/cart'
import {
  getShippingOptions,
  addShippingMethod,
  createPaymentCollection,
  initializePaymentSession,
  updatePaymentAmount,
  completeCheckout,
  type ShippingOption,
} from '@/lib/api/checkout'
import { getEasyParcelRates, type EasyParcelRate } from '@/lib/api/shipping'
import { isPWPItem } from '@/lib/api/pwp'
import { updateNewsletterSubscription } from '@/lib/api/customer'
import { syncCartPrices, type SyncPricesResponse } from '@/lib/api/cart-pricing'

/**
 * Sync cart prices with retry logic
 * Critical for ensuring tier discounts are calculated before payment
 */
async function syncCartPricesWithRetry(
  cartId: string,
  maxRetries: number = 3,
  baseDelayMs: number = 500
): Promise<SyncPricesResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Checkout] Syncing cart prices (attempt ${attempt}/${maxRetries})...`)
      const result = await syncCartPrices(cartId)
      console.log('[Checkout] Cart prices synced successfully')
      return result
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[Checkout] Sync attempt ${attempt} failed:`, lastError.message)

      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        console.log(`[Checkout] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Failed to sync cart prices after retries')
}

// Phone country codes configuration
const PHONE_COUNTRY_CODES: { code: string; label: string; maxDigits: number; minDigits?: number }[] = [
  { code: '+65', label: 'Singapore (+65)', maxDigits: 8, minDigits: 8 },
  { code: '+60', label: 'Malaysia (+60)', maxDigits: 11, minDigits: 9 },
  { code: '+62', label: 'Indonesia (+62)', maxDigits: 12, minDigits: 9 },
  { code: '+63', label: 'Philippines (+63)', maxDigits: 10, minDigits: 10 },
  { code: '+66', label: 'Thailand (+66)', maxDigits: 9, minDigits: 9 },
  { code: '+84', label: 'Vietnam (+84)', maxDigits: 10, minDigits: 9 },
  { code: '+91', label: 'India (+91)', maxDigits: 10, minDigits: 10 },
  { code: '+86', label: 'China (+86)', maxDigits: 11, minDigits: 11 },
  { code: '+81', label: 'Japan (+81)', maxDigits: 10, minDigits: 10 },
  { code: '+82', label: 'South Korea (+82)', maxDigits: 10, minDigits: 10 },
]

/**
 * Validate phone number based on country code
 * Returns { valid: boolean, error?: string }
 */
function validatePhoneNumber(phoneNumber: string, countryCode: string): { valid: boolean; error?: string } {
  // Remove spaces from phone number
  const cleanPhone = phoneNumber.replace(/\s/g, '')

  if (!cleanPhone) {
    return { valid: false, error: 'Phone number is required' }
  }

  const countryConfig = PHONE_COUNTRY_CODES.find(c => c.code === countryCode)
  if (!countryConfig) {
    return { valid: false, error: 'Invalid country code' }
  }

  const minDigits = countryConfig.minDigits || countryConfig.maxDigits

  // Check length
  if (cleanPhone.length < minDigits) {
    return { valid: false, error: `Phone number must be at least ${minDigits} digits for ${countryConfig.label.split(' ')[0]}` }
  }

  if (cleanPhone.length > countryConfig.maxDigits) {
    return { valid: false, error: `Phone number must be at most ${countryConfig.maxDigits} digits for ${countryConfig.label.split(' ')[0]}` }
  }

  // Singapore-specific validation: must start with 6, 8, or 9
  if (countryCode === '+65') {
    if (!cleanPhone.startsWith('6') && !cleanPhone.startsWith('8') && !cleanPhone.startsWith('9')) {
      return { valid: false, error: 'Singapore phone numbers must start with 6, 8, or 9' }
    }
  }

  return { valid: true }
}

// Helper functions for line items
const getLineItemThumbnail = (item: MedusaCartLineItem): string => {
  return item.thumbnail || item.variant?.product?.thumbnail || item.product?.thumbnail || '/product/product.jpg'
}

const getLineItemName = (item: MedusaCartLineItem): string => {
  return item.title || item.variant?.product?.title || item.product?.title || 'Unknown Product'
}

const getLineItemSize = (item: MedusaCartLineItem): string => {
  if (!item.variant?.options) return item.subtitle || 'Default'
  const sizeOption = item.variant.options.find((o) => o.option?.title === 'Size')
  return sizeOption?.value || item.subtitle || 'Default'
}

// Check if item has variant discount (Set Discount Global from admin)
// Has discount if: metadata flag is set AND discount amount > 0
const hasVariantDiscount = (item: MedusaCartLineItem): boolean => {
  if (!item.metadata?.is_variant_discount) return false
  const discountAmount = Number(item.metadata?.variant_discount_amount) || 0
  return discountAmount > 0
}

// Get the discounted price for variant discount
// Calculates from original_unit_price - variant_discount_amount
const getVariantDiscountedPrice = (item: MedusaCartLineItem): number => {
  const discountAmount = Number(item.metadata?.variant_discount_amount) || 0
  const originalPrice = Number(item.metadata?.original_unit_price) || item.unit_price
  return Math.max(0, originalPrice - discountAmount)
}

// Get original price before variant discount
const getOriginalPriceBeforeVariantDiscount = (item: MedusaCartLineItem): number => {
  return Number(item.metadata?.original_unit_price) || item.unit_price
}

// Check if item has wholesale tier discount
// Has discount if: metadata flag is set AND tier price > 0
const hasWholesaleTierDiscount = (item: MedusaCartLineItem): boolean => {
  if (!item.metadata?.is_bulk_price) return false
  const tierPrice = Number(item.metadata?.bulk_tier_price) || 0
  return tierPrice > 0
}

// Get the discounted price for wholesale tier
const getWholesaleTierPrice = (item: MedusaCartLineItem): number => {
  return Number(item.metadata?.bulk_tier_price) || item.unit_price
}

// Get original price before wholesale tier discount
const getOriginalPriceBeforeWholesale = (item: MedusaCartLineItem): number => {
  return Number(item.metadata?.original_unit_price) || item.unit_price
}

// Stripe Payment Form Component - uses Stripe hooks
type StripePaymentFormProps = {
  onPaymentSuccess: () => Promise<void>
  onPaymentError: (error: string) => void
  isSubmitting: boolean
  setIsSubmitting: (submitting: boolean) => void
  paymentCollectionId: string | null
  cartId: string | null
  totalCents: number
}

function StripePaymentFormInner({
  onPaymentSuccess,
  onPaymentError,
  isSubmitting,
  setIsSubmitting,
  paymentCollectionId,
  cartId,
  totalCents,
}: StripePaymentFormProps): React.JSX.Element {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (): Promise<void> => {
    if (!stripe || !elements) {
      onPaymentError('Payment system not ready. Please refresh the page.')
      return
    }

    setIsSubmitting(true)

    try {
      // CRITICAL: Update the payment amount RIGHT BEFORE payment submission
      // This ensures Stripe charges exactly what the customer sees
      if (paymentCollectionId && cartId && totalCents > 0) {
        console.log('[Checkout] Updating payment amount before submission:', { totalCents })
        try {
          const updateResult = await updatePaymentAmount(paymentCollectionId, cartId, totalCents)
          console.log('[Checkout] Payment amount updated:', updateResult)
        } catch (updateError) {
          console.error('[Checkout] Failed to update payment amount:', updateError)
          onPaymentError('Failed to update payment amount. Please try again.')
          setIsSubmitting(false)
          return
        }
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/complete`,
        },
        redirect: 'if_required',
      })

      if (error) {
        onPaymentError(error.message || 'Payment failed')
        setIsSubmitting(false)
      } else if (paymentIntent) {
        // Handle different payment intent statuses
        switch (paymentIntent.status) {
          case 'succeeded':
            // Payment succeeded - complete the order
            await onPaymentSuccess()
            break
          case 'processing':
            // Payment is being processed asynchronously (common for some payment methods)
            // We should still complete the order - Stripe webhooks will handle the final confirmation
            console.log('Payment processing asynchronously, completing order...')
            await onPaymentSuccess()
            break
          case 'requires_action':
            // 3D Secure authentication required - Stripe should handle the redirect automatically
            // If we reach here, the redirect didn't happen, so inform the user
            onPaymentError('Additional authentication required. Please complete the verification.')
            setIsSubmitting(false)
            break
          case 'requires_payment_method':
            // Payment failed - card declined or similar
            onPaymentError('Payment failed. Please try a different payment method.')
            setIsSubmitting(false)
            break
          default:
            // Unexpected status - log and treat as processing
            console.warn('Unexpected payment intent status:', paymentIntent.status)
            await onPaymentSuccess()
            break
        }
      } else {
        // No payment intent returned - unexpected state
        onPaymentError('Payment could not be processed. Please try again.')
        setIsSubmitting(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      onPaymentError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card', 'google_pay', 'apple_pay'],
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!stripe || !elements || isSubmitting}
        className="w-full cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
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
            Processing...
          </span>
        ) : (
          'Pay now'
        )}
      </button>
    </div>
  )
}

export default function CheckoutPage(): React.JSX.Element {
  const router = useRouter()
  const { items, subtotal, itemCount, clearCart, medusaCart, updateEmail, updateShippingAddress, updateCartMetadata, appliedCoupon, appliedPoints, appliedMembershipPromo, appliedTierDiscount } = useCart()
  const { customer, isAuthenticated, isLoading: isCustomerLoading, addresses, loadAddresses } = useCustomer()
  const [emailNewsletters, setEmailNewsletters] = useState(false)
  const [shippingMethod, setShippingMethod] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Medusa shipping options
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [shippingOptionsLoading, setShippingOptionsLoading] = useState(false)

  // Form fields (empty by default, will be filled from customer data)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address, setAddress] = useState('')
  const [apartment, setApartment] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+65')
  const [phoneCodeDropdownOpen, setPhoneCodeDropdownOpen] = useState(false)
  const phoneCodeDropdownRef = useRef<HTMLDivElement>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [customerDataLoaded, setCustomerDataLoaded] = useState(false)
  const [addressesLoaded, setAddressesLoaded] = useState(false)

  // Dropdown state (Singapore only for now)
  const [country, setCountry] = useState('Singapore')
  const [countryOpen, setCountryOpen] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)

  // Country code mapping for Medusa API
  const countryCodeMap: Record<string, string> = {
    'Singapore': 'sg',
  }

  // Track if shipping options have been fetched
  const [shippingOptionsFetched, setShippingOptionsFetched] = useState(false)

  // Stripe payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentCollectionId, setPaymentCollectionId] = useState<string | null>(null)
  const [isInitializingPayment, setIsInitializingPayment] = useState(false)
  // Ref to prevent duplicate initialization (React StrictMode calls effects twice)
  const paymentInitializationRef = useRef<boolean>(false)
  // Ref to store current address values for payment initialization (avoids dependency issues)
  const addressValuesRef = useRef({ firstName: '', lastName: '', address: '', apartment: '', city: '', postalCode: '', country: 'Singapore', phone: '', phoneCountryCode: '+65' })

  // Keep address values ref in sync with state
  useEffect(() => {
    addressValuesRef.current = { firstName, lastName, address, apartment, city, postalCode, country, phone, phoneCountryCode }
  }, [firstName, lastName, address, apartment, city, postalCode, country, phone, phoneCountryCode])

  // Load customer addresses when authenticated
  useEffect(() => {
    if (isAuthenticated && !addressesLoaded) {
      loadAddresses().then(() => {
        setAddressesLoaded(true)
      })
    }
  }, [isAuthenticated, loadAddresses, addressesLoaded])

  // Pre-fill form with customer data when logged in
  useEffect(() => {
    if (customerDataLoaded) return
    if (isCustomerLoading) return // Wait for customer loading to complete
    if (!isAuthenticated || !customer) return

    // Wait for addresses to be loaded before pre-filling
    // This ensures we don't mark customerDataLoaded=true before addresses arrive
    if (!addressesLoaded) return

    // Pre-fill email from customer
    if (customer.email && !email) {
      setEmail(customer.email)
    }

    // Pre-fill name from customer
    if (customer.first_name && !firstName) {
      setFirstName(customer.first_name)
    }
    if (customer.last_name && !lastName) {
      setLastName(customer.last_name)
    }

    // Pre-fill address from customer's default/first address
    let addressPhone: string | null = null
    if (addresses.length > 0) {
      const defaultAddress = addresses.find(addr => addr.is_default_shipping) || addresses[0]
      if (defaultAddress) {
        if (defaultAddress.address_1 && !address) {
          setAddress(defaultAddress.address_1)
        }
        if (defaultAddress.address_2 && !apartment) {
          setApartment(defaultAddress.address_2)
        }
        if (defaultAddress.city && !city) {
          setCity(defaultAddress.city)
        }
        if (defaultAddress.postal_code && !postalCode) {
          setPostalCode(defaultAddress.postal_code)
        }
        // Update country if address has different country
        if (defaultAddress.country_code === 'sg') {
          setCountry('Singapore')
        }
        addressPhone = defaultAddress.phone
      }
    }

    // Pre-fill phone from address or customer profile
    const savedPhone = addressPhone || customer?.phone
    if (savedPhone && !phone) {
      let foundCode = '+65' // Default to Singapore
      let phoneNumber = savedPhone

      // Try to match against known country codes (sorted by length desc to match longer codes first)
      const sortedCodes = [...PHONE_COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
      for (const countryCode of sortedCodes) {
        if (savedPhone.startsWith(countryCode.code)) {
          foundCode = countryCode.code
          phoneNumber = savedPhone.slice(countryCode.code.length)
          break
        }
      }

      setPhoneCountryCode(foundCode)
      setPhone(phoneNumber)
    }

    setCustomerDataLoaded(true)
  }, [isAuthenticated, isCustomerLoading, customer, addresses, customerDataLoaded, addressesLoaded, email, firstName, lastName, address, apartment, city, postalCode, phone])

  // EasyParcel rates state
  const [easyParcelRates, setEasyParcelRates] = useState<EasyParcelRate[]>([])
  const [selectedEasyParcelRate, setSelectedEasyParcelRate] = useState<EasyParcelRate | null>(null)
  const [shippingAddressUpdated, setShippingAddressUpdated] = useState(false)
  // Ref to track the last fetched postal code to prevent duplicate fetches
  const lastFetchedPostalCodeRef = useRef<string>('')
  // Ref to track if a fetch is in progress
  const isFetchingRatesRef = useRef<boolean>(false)

  // Fetch EasyParcel rates when postal code changes (independent of cart update)
  // This is separate from cart updates to avoid lock conflicts
  useEffect(() => {
    // Only fetch when we have a valid Singapore postal code (6 digits)
    if (!postalCode || postalCode.length !== 6 || !medusaCart?.id) {
      return
    }

    // Skip if we already fetched for this postal code
    if (lastFetchedPostalCodeRef.current === postalCode) {
      return
    }

    // Skip if a fetch is already in progress
    if (isFetchingRatesRef.current) {
      return
    }

    // Debounce to avoid multiple API calls while user is typing
    const timeoutId = setTimeout(async () => {
      // Double-check refs inside timeout (state may have changed during debounce)
      if (lastFetchedPostalCodeRef.current === postalCode || isFetchingRatesRef.current) {
        return
      }

      try {
        isFetchingRatesRef.current = true
        setShippingOptionsLoading(true)

        // Calculate estimated weight from cart items (0.5kg per item)
        // Use itemCount to avoid items array reference changes triggering re-renders
        const estimatedWeight = Math.max(0.5, itemCount * 0.5)

        // Fetch EasyParcel rates (doesn't require cart update)
        const rates = await getEasyParcelRates(postalCode, estimatedWeight)

        // Mark this postal code as fetched BEFORE setting state
        lastFetchedPostalCodeRef.current = postalCode

        if (rates.length > 0) {
          // Use EasyParcel rates
          setEasyParcelRates(rates)
          // Convert to ShippingOption format for compatibility
          const convertedOptions: ShippingOption[] = rates.map((rate) => ({
            id: rate.service_id,
            name: `${rate.courier_name} - ${rate.service_name}`,
            amount: rate.price,
            price_type: 'flat_rate',
            provider_id: 'easyparcel',
          }))
          setShippingOptions(convertedOptions)

          // Check if cart qualifies for free shipping (subtotal >= $100)
          // If free shipping, do NOT auto-select - admin will select later
          const cartSubtotalInDollars = subtotal / 100
          const hasFreeShipping = cartSubtotalInDollars >= FREE_SHIPPING_THRESHOLD

          // Auto-select first option if none selected AND not free shipping
          if (!shippingMethod && !hasFreeShipping) {
            setShippingMethod(rates[0].service_id)
            setSelectedEasyParcelRate(rates[0])
          }
          setShippingOptionsFetched(true)
        } else {
          // Only fallback to Medusa options if we have full address
          if (firstName && lastName && address && city) {
            // Update shipping address first for Medusa native options
            const formattedPhone = phone ? `${phoneCountryCode}${phone.replace(/\s/g, '')}` : undefined
            const shippingAddress: MedusaCartAddress = {
              first_name: firstName,
              last_name: lastName,
              address_1: address,
              address_2: apartment || undefined,
              city: city,
              postal_code: postalCode,
              country_code: countryCodeMap[country] || 'sg',
              phone: formattedPhone,
            }
            await updateShippingAddress(shippingAddress)
            setShippingAddressUpdated(true)

            const options = await getShippingOptions(medusaCart.id)
            setShippingOptions(options)
            setEasyParcelRates([])

            // Check if cart qualifies for free shipping
            const cartSubtotalInDollars = subtotal / 100
            const hasFreeShipping = cartSubtotalInDollars >= FREE_SHIPPING_THRESHOLD

            // Auto-select first option if none selected AND not free shipping
            if (options.length > 0 && !shippingMethod && !hasFreeShipping) {
              setShippingMethod(options[0].id)
            }
            setShippingOptionsFetched(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch shipping options:', error)
        // On error, try fallback to Medusa native options if address is complete
        if (firstName && lastName && address && city && medusaCart?.id) {
          try {
            const options = await getShippingOptions(medusaCart.id)
            setShippingOptions(options)
            setEasyParcelRates([])

            // Check if cart qualifies for free shipping
            const cartSubtotalInDollars = subtotal / 100
            const hasFreeShipping = cartSubtotalInDollars >= FREE_SHIPPING_THRESHOLD

            if (options.length > 0 && !shippingMethod && !hasFreeShipping) {
              setShippingMethod(options[0].id)
            }
          } catch {
            // If both fail, leave empty
          }
        }
      } finally {
        isFetchingRatesRef.current = false
        setShippingOptionsLoading(false)
      }
    }, 500) // Always debounce 500ms for postal code changes

    return () => clearTimeout(timeoutId)
  }, [postalCode, medusaCart?.id, itemCount])

  // Ref to prevent duplicate address updates
  const isUpdatingAddressRef = useRef<boolean>(false)

  // NOTE: Address update is now handled inside initializeStripePayment to avoid concurrent cart updates
  // The payment initialization handles all cart updates sequentially before creating the payment collection
  // This eliminates race conditions that caused "Failed to acquire lock" errors

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setCountryOpen(false)
      }
      if (phoneCodeDropdownRef.current && !phoneCodeDropdownRef.current.contains(event.target as Node)) {
        setPhoneCodeDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Free shipping threshold (must match bag page)
  // IMPORTANT: These must be defined BEFORE initializeStripePayment useCallback
  const FREE_SHIPPING_THRESHOLD = 100.00
  const selectedShippingOption = shippingOptions.find(opt => opt.id === shippingMethod)
  const subtotalInDollarsForShipping = subtotal / 100
  const qualifiesForFreeShipping = subtotalInDollarsForShipping >= FREE_SHIPPING_THRESHOLD
  const originalShippingCost = selectedShippingOption ? selectedShippingOption.amount / 100 : 0

  // Initialize Stripe payment session when shipping method is selected
  const initializeStripePayment = useCallback(async (): Promise<void> => {
    // Use ref to prevent duplicate initialization (React StrictMode issue)
    // This is critical - duplicate payment collections cause checkout to fail
    if (paymentInitializationRef.current) {
      console.log('[Checkout] Payment initialization already in progress (ref guard)')
      return
    }

    // For free shipping orders, we don't require a shipping method to be selected
    // The admin will select the shipping method during fulfillment
    const needsShippingMethod = !qualifiesForFreeShipping
    if (!medusaCart?.id || (needsShippingMethod && !shippingMethod) || clientSecret || isInitializingPayment) {
      return
    }

    // Validate that we have the required data before proceeding
    if (!email) {
      console.log('[Checkout] Waiting for email to be filled before initializing payment')
      return
    }

    // Set ref immediately to prevent duplicate calls from React StrictMode
    paymentInitializationRef.current = true
    setIsInitializingPayment(true)

    try {
      console.log('[Checkout] Starting payment initialization...')

      // STEP 1: Update all cart data BEFORE creating payment collection
      // This is critical - any cart updates AFTER payment collection creation will invalidate the session

      // First, update shipping address if not already done (do this FIRST to avoid concurrent updates)
      // Use ref to get current values without adding dependencies that cause re-renders
      const addrVals = addressValuesRef.current
      if (!shippingAddressUpdated && addrVals.firstName && addrVals.lastName && addrVals.address && addrVals.city && addrVals.postalCode) {
        // Set the address updating ref to prevent the other effect from also updating
        isUpdatingAddressRef.current = true
        console.log('[Checkout] Updating shipping address first...')
        const formattedPhone = addrVals.phone ? `${addrVals.phoneCountryCode}${addrVals.phone.replace(/\s/g, '')}` : undefined
        const shippingAddress: MedusaCartAddress = {
          first_name: addrVals.firstName,
          last_name: addrVals.lastName,
          address_1: addrVals.address,
          address_2: addrVals.apartment || undefined,
          city: addrVals.city,
          postal_code: addrVals.postalCode,
          country_code: addrVals.country === 'Singapore' ? 'sg' : 'sg',
          phone: formattedPhone,
        }
        try {
          await updateShippingAddress(shippingAddress)
          setShippingAddressUpdated(true)
          console.log('[Checkout] Shipping address updated')
        } catch (addrErr) {
          console.warn('[Checkout] Failed to update shipping address:', addrErr)
          // Continue anyway - the cart may still work
        } finally {
          isUpdatingAddressRef.current = false
        }
      }

      // Update email on cart
      await updateEmail(email)
      console.log('[Checkout] Email updated on cart')

      // Handle shipping method based on whether it's free shipping or not
      if (qualifiesForFreeShipping && !shippingMethod) {
        // Free shipping: No shipping method selected by customer
        // Admin will select shipping method during fulfillment
        console.log('[Checkout] Free shipping order - shipping will be selected by admin during fulfillment')

        // Save free shipping info to metadata (shipping method pending)
        await updateCartMetadata({
          free_shipping_applied: true,
          free_shipping_no_method_selected: true,
          shipping_pending_admin_selection: true,
        })
        console.log('[Checkout] Free shipping metadata saved (pending admin selection)')

        // Medusa requires a shipping method to complete checkout
        // Use the first available Medusa shipping option for technical purposes
        try {
          const medusaNativeOptions = await getShippingOptions(medusaCart.id)
          if (medusaNativeOptions.length > 0) {
            await addShippingMethod(medusaCart.id, medusaNativeOptions[0].id)
            console.log('[Checkout] Added placeholder Medusa shipping method for technical purposes:', medusaNativeOptions[0].id)
          } else {
            console.warn('[Checkout] No Medusa shipping options available - cart may not complete')
          }
        } catch (shippingErr) {
          console.warn('[Checkout] Failed to add Medusa shipping method:', shippingErr)
          // Continue anyway - we'll handle this in order creation
        }
      } else {
        // Check if we're using EasyParcel rates (service_id starts with "EP-")
        const isUsingEasyParcel = easyParcelRates.length > 0 && shippingMethod.startsWith('EP-')

        if (isUsingEasyParcel) {
          // For EasyParcel, we need to:
          // 1. Store the EasyParcel shipping info in cart metadata
          // 2. Use a valid Medusa shipping option for technical requirements
          console.log('[Checkout] Using EasyParcel shipping, storing info in metadata...')

          // Find the selected EasyParcel rate
          const selectedRate = easyParcelRates.find(r => r.service_id === shippingMethod)
          if (selectedRate) {
            // Store EasyParcel shipping info in metadata
            await updateCartMetadata({
              easyparcel_shipping: {
                service_id: selectedRate.service_id,
                service_name: selectedRate.service_name,
                courier_id: selectedRate.courier_id,
                courier_name: selectedRate.courier_name,
                courier_logo: selectedRate.courier_logo,
                price: selectedRate.price,
                price_display: selectedRate.price_display,
                pickup_date: selectedRate.pickup_date,
                delivery_eta: selectedRate.delivery_eta,
                has_cod: selectedRate.has_cod,
                has_insurance: selectedRate.has_insurance,
              },
            })
            console.log('[Checkout] EasyParcel shipping info saved to metadata')
          }

          // Fetch Medusa's native shipping options and use the first one for technical purposes
          try {
            const medusaNativeOptions = await getShippingOptions(medusaCart.id)
            if (medusaNativeOptions.length > 0) {
              await addShippingMethod(medusaCart.id, medusaNativeOptions[0].id)
              console.log('[Checkout] Added Medusa shipping method for technical purposes:', medusaNativeOptions[0].id)
            } else {
              console.warn('[Checkout] No Medusa shipping options available - cart may not complete')
            }
          } catch (shippingErr) {
            console.warn('[Checkout] Failed to add Medusa shipping method:', shippingErr)
            // Continue anyway - we'll handle this in order creation
          }
        } else {
          // Using Medusa native shipping option
          await addShippingMethod(medusaCart.id, shippingMethod)
          console.log('[Checkout] Shipping method added')
        }
      }

      // Sync cart prices to ensure all discounts (including tier discount) are calculated
      // This is CRITICAL - payment must not proceed if sync fails
      // Uses retry logic to handle transient failures
      const syncResult = await syncCartPricesWithRetry(medusaCart.id)

      // Log tier discount info for debugging
      if (syncResult.tier_info) {
        console.log(`[Checkout] Tier discount applied: ${syncResult.tier_info.name} (${syncResult.tier_info.discount_percentage}% = $${(syncResult.tier_info.discount_amount / 100).toFixed(2)})`)
      } else {
        console.log('[Checkout] No tier discount applied (guest or no membership tier)')
      }

      // Save free shipping discount to cart metadata
      if (qualifiesForFreeShipping && originalShippingCost > 0) {
        try {
          await updateCartMetadata({
            free_shipping_applied: true,
            free_shipping_discount: Math.round(originalShippingCost * 100),
            original_shipping_cost: Math.round(originalShippingCost * 100),
          })
          console.log('[Checkout] Free shipping metadata saved')
        } catch (metaErr) {
          console.warn('[Checkout] Failed to save free shipping metadata:', metaErr)
        }
      }

      // STEP 2: NOW create payment collection AFTER all cart updates are done
      // From this point forward, NO MORE cart updates should be made!
      console.log('[Checkout] All cart updates done, creating payment collection...')

      const { paymentCollection, existingClientSecret } = await createPaymentCollection(medusaCart.id)
      setPaymentCollectionId(paymentCollection.id)

      let secret = existingClientSecret

      // Only initialize new payment session if we don't already have one
      if (!secret) {
        console.log('[Checkout] No existing payment session, creating new one...')
        const result = await initializePaymentSession(paymentCollection.id, true)
        secret = result.clientSecret
      } else {
        console.log('[Checkout] Using existing payment session')
      }

      // NOTE: Payment amount will be updated RIGHT BEFORE submission in StripePaymentFormInner
      // This ensures Stripe charges exactly what the customer sees at the moment they click "Pay now"

      if (secret) {
        setClientSecret(secret)
        console.log('[Checkout] Client secret set successfully - READY FOR PAYMENT')
      } else {
        console.error('[Checkout] No client secret returned from Stripe')
        toast.error('Failed to initialize payment. Please try again.')
        // Reset ref so user can retry
        paymentInitializationRef.current = false
      }
    } catch (error) {
      console.error('Failed to initialize Stripe payment:', error)
      // Show more specific error for price sync failures
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('sync') || errorMessage.includes('prices')) {
        toast.error('Failed to calculate discounts. Please refresh the page and try again.')
      } else {
        toast.error('Failed to initialize payment. Please try again.')
      }
      // Reset ref on error so user can retry
      paymentInitializationRef.current = false
    } finally {
      setIsInitializingPayment(false)
    }
  }, [medusaCart?.id, shippingMethod, clientSecret, isInitializingPayment, qualifiesForFreeShipping, originalShippingCost, email, updateEmail, updateCartMetadata, easyParcelRates, shippingAddressUpdated, updateShippingAddress])

  // Trigger payment initialization when shipping is ready AND email is provided
  // For free shipping orders: trigger when shippingOptionsFetched (no shippingMethod needed)
  // For regular orders: trigger when shippingMethod is selected
  useEffect(() => {
    const canInitialize = email && !clientSecret && !isInitializingPayment
    const hasFreeShipping = qualifiesForFreeShipping && shippingOptionsFetched
    const hasShippingMethod = !!shippingMethod

    if (canInitialize && (hasFreeShipping || hasShippingMethod)) {
      initializeStripePayment()
    }
  }, [shippingMethod, email, clientSecret, isInitializingPayment, initializeStripePayment, qualifiesForFreeShipping, shippingOptionsFetched])

  // Calculate effective shipping cost (0 if qualifies for free shipping)
  const SHIPPING_COST = qualifiesForFreeShipping ? 0 : (selectedShippingOption ? selectedShippingOption.amount / 100 : 0)

  // Use Medusa cart totals if available, otherwise calculate manually
  const TAX = medusaCart?.tax_total ? medusaCart.tax_total / 100 : 0

  // Calculate ORIGINAL subtotal (before PWP and variant discounts) - matching success page
  const originalSubtotalCents = items.reduce((sum, item) => {
    // Get original price (before any line-item discounts)
    const originalPrice = Number(item.metadata?.original_unit_price) || item.unit_price
    return sum + originalPrice * item.quantity
  }, 0)
  const originalSubtotalInDollars = originalSubtotalCents / 100

  // Calculate PWP discount from items (PWP items have pwp_discount_amount in metadata)
  const pwpDiscountCents = items.reduce((sum, item) => {
    if (isPWPItem(item) && item.metadata?.pwp_discount_amount) {
      return sum + (Number(item.metadata.pwp_discount_amount) || 0) * item.quantity
    }
    return sum
  }, 0)
  const pwpDiscountInDollars = pwpDiscountCents / 100

  // Calculate variant/product discount from items (variant discount items have variant_discount_amount)
  const variantDiscountCents = items.reduce((sum, item) => {
    if (hasVariantDiscount(item) && item.metadata?.variant_discount_amount) {
      return sum + (Number(item.metadata.variant_discount_amount) || 0) * item.quantity
    }
    return sum
  }, 0)
  const variantDiscountInDollars = variantDiscountCents / 100

  // Subtotal after PWP and variant discounts (this is what tier discount should be based on)
  const subtotalAfterProductDiscounts = originalSubtotalInDollars - pwpDiscountInDollars - variantDiscountInDollars

  // Calculate discount from applied coupon (stored in cart metadata)
  const discountAmount = appliedCoupon?.discount_amount ? appliedCoupon.discount_amount / 100 : 0
  // Calculate points discount from applied points (stored in cart metadata)
  const pointsDiscountAmount = appliedPoints?.discount_amount ? appliedPoints.discount_amount / 100 : 0
  // Calculate membership promo discount from applied membership promo (stored in cart metadata)
  const membershipPromoDiscountAmount = appliedMembershipPromo?.discount_amount ? appliedMembershipPromo.discount_amount / 100 : 0
  // Calculate tier discount from membership tier (automatically applied)
  const tierDiscountAmount = appliedTierDiscount?.discount_amount ? appliedTierDiscount.discount_amount / 100 : 0

  // Always calculate total ourselves - using subtotal AFTER product discounts
  // Total = subtotalAfterProductDiscounts + shipping + tax - coupon - points - memberPromo - tierDiscount
  const total = Math.max(0, subtotalAfterProductDiscounts + SHIPPING_COST + TAX - discountAmount - pointsDiscountAmount - membershipPromoDiscountAmount - tierDiscountAmount)

  const countries = ['Singapore']

  // Payment error state
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Validate checkout form fields
  const validateCheckoutForm = (): boolean => {
    // Wait for customer loading to complete before checking auth
    if (isCustomerLoading) {
      toast.error('Please wait, checking authentication...')
      return false
    }

    // Check if user is authenticated - redirect to login if not
    if (!isAuthenticated) {
      toast.error('Please log in to complete your purchase')
      router.push('/auth/login?redirect=/checkout')
      return false
    }

    // Basic validation (province not required for Singapore)
    if (!email || !firstName || !lastName || !address || !city || !postalCode || !country) {
      toast.error('Please fill in all required fields')
      return false
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(phone, phoneCountryCode)
    if (!phoneValidation.valid) {
      toast.error(phoneValidation.error || 'Invalid phone number')
      return false
    }

    if (items.length === 0) {
      toast.error('Your cart is empty')
      return false
    }

    if (!medusaCart?.id) {
      toast.error('Cart not found. Please refresh the page.')
      return false
    }

    // For free shipping orders, shipping method is optional (admin selects later)
    if (!shippingMethod && !qualifiesForFreeShipping) {
      toast.error('Please select a shipping method')
      return false
    }

    return true
  }

  // Handle successful Stripe payment - complete the order
  const handlePaymentSuccess = async (): Promise<void> => {
    if (!validateCheckoutForm() || !medusaCart?.id) {
      setIsSubmitting(false)
      return
    }

    try {
      // IMPORTANT: Cart updates were already done during initializeStripePayment
      // Do NOT update cart here as it would invalidate the payment session
      // The email, address, and shipping method were already set before payment

      // Also skip syncCartPrices here - it was already done during initializeStripePayment
      // Cart updates invalidate payment sessions in Medusa 2.x

      console.log('[Checkout] Payment confirmed, completing checkout without additional cart updates...')

      // Complete checkout (creates order in Medusa)
      const result = await completeCheckout(medusaCart.id)

      if (result.type === 'order' && result.order) {
        // Store order ID for success page
        localStorage.setItem('lastOrderId', result.order.id)

        // Update newsletter subscription if checked
        if (emailNewsletters) {
          try {
            await updateNewsletterSubscription(true)
          } catch (error) {
            // Don't block checkout if newsletter update fails
            console.error('Failed to update newsletter subscription:', error)
          }
        }

        // Clear cart
        await clearCart()

        // Show success toast
        toast.success('Order placed successfully!', {
          description: `Order #${result.order.display_id} has been confirmed.`,
        })

        // Navigate to success page
        window.location.href = `/success?order_id=${result.order.id}`
      } else {
        throw new Error('Order creation failed')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to complete order', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
      setIsSubmitting(false)
    }
  }

  // Handle payment error from Stripe
  const handlePaymentError = (error: string): void => {
    setPaymentError(error)
    toast.error('Payment failed', { description: error })
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="grid min-h-screen grid-cols-1 pt-8 sm:pt-12 lg:pt-0 lg:grid-cols-5 xl:grid-cols-3">
        {/* Left Column - Checkout Form */}
        <div className="bg-white px-4 py-8 sm:py-12 lg:py-24 sm:px-6 lg:col-span-3 lg:border-r lg:border-[#E3E3E3] lg:px-8 xl:py-28 xl:col-span-2">
          {/* Contact Section */}
          <div className="mb-8">
            <h2 className="mb-4 font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
              Contact
            </h2>
            <input
              type="text"
              id="checkout-email"
              name="email"
              placeholder="Email or phone number"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder-[#999] outline-none transition-colors focus:border-black"
            />
            <label htmlFor="newsletter" className="mt-4 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                id="newsletter"
                checked={emailNewsletters}
                onChange={(e) => setEmailNewsletters(e.target.checked)}
                className="peer sr-only"
              />
              <div className="relative flex h-4 w-4 items-center justify-center rounded border border-[#E3E3E3] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100 peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-2">
                <svg className="h-3 w-3 text-white opacity-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-inter text-[14px] font-normal leading-[100%] tracking-[-0.84px] text-black">
                Email me with news and offers
              </span>
            </label>
          </div>

          {/* Delivery Section */}
          <div className="mb-8">
            <h2 className="mb-4 font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
              Delivery
            </h2>

            {/* Country/Region */}
            <div ref={countryRef} className="relative mb-4 w-full">
              <button
                type="button"
                onClick={() => setCountryOpen(!countryOpen)}
                onKeyDown={(e) => e.key === 'Escape' && setCountryOpen(false)}
                className="flex w-full cursor-pointer items-center justify-between rounded border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black outline-none transition-colors focus:border-black"
                aria-haspopup="listbox"
                aria-expanded={countryOpen}
              >
                <span className={country ? 'text-black' : 'text-[#999]'}>
                  {country || 'Country/region'}
                </span>
                <svg className={`h-4 w-4 transition-transform ${countryOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {countryOpen && (
                <ul role="listbox" className="absolute z-50 mt-1 max-h-60 w-full overflow-auto border border-[#E3E3E3] bg-white shadow-lg">
                  {countries.map((c) => (
                    <li
                      key={c}
                      role="option"
                      aria-selected={country === c}
                      onClick={() => {
                        setCountry(c)
                        setCountryOpen(false)
                      }}
                      className="cursor-pointer px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-gray-100"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* First Name and Last Name */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <input
                type="text"
                id="checkout-firstname"
                name="firstname"
                placeholder="First name (optional)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder-[#999] outline-none transition-colors focus:border-black"
              />
              <input
                type="text"
                id="checkout-lastname"
                name="lastname"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder-[#999] outline-none transition-colors focus:border-black"
              />
            </div>

            {/* Address */}
            <div className="mb-4">
              <input
                type="text"
                id="checkout-address"
                name="address"
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder-[#999] outline-none transition-colors focus:border-black"
              />
            </div>

            {/* Apartment/Suite */}
            <div className="mb-4">
              <input
                type="text"
                id="checkout-apartment"
                name="apartment"
                placeholder="Apartment, suite, etc (optional)"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                className="w-full rounded border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder-[#999] outline-none transition-colors focus:border-black"
              />
            </div>

            {/* City and Postal Code (no province for Singapore) */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <input
                type="text"
                id="checkout-city"
                name="city"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder-[#999] outline-none transition-colors focus:border-black"
              />
              <input
                type="text"
                id="checkout-postalcode"
                name="postalcode"
                placeholder="Postal code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="rounded border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder-[#999] outline-none transition-colors focus:border-black"
              />
            </div>

            {/* Phone Number */}
            <div className="flex">
              {/* Country Code Dropdown */}
              <div ref={phoneCodeDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setPhoneCodeDropdownOpen(!phoneCodeDropdownOpen)}
                  className="flex h-full cursor-pointer items-center gap-2 rounded-l border border-r-0 border-[#E3E3E3] bg-[#F5F5F5] px-4 py-3 transition-colors hover:bg-[#EBEBEB]"
                >
                  <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                    {phoneCountryCode}
                  </span>
                  <svg
                    className={`h-4 w-4 text-black transition-transform ${phoneCodeDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {phoneCodeDropdownOpen && (
                  <ul className="absolute left-0 z-50 mt-1 max-h-60 w-56 overflow-auto rounded border border-[#E3E3E3] bg-white shadow-lg">
                    {PHONE_COUNTRY_CODES.map((countryCode) => (
                      <li
                        key={countryCode.code}
                        onClick={() => {
                          setPhoneCountryCode(countryCode.code)
                          setPhoneCodeDropdownOpen(false)
                          // Clear phone and error if switching countries (different max digits)
                          setPhone('')
                          setPhoneError(null)
                        }}
                        className={`cursor-pointer px-4 py-3 font-inter text-[14px] font-normal leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-gray-100 ${
                          phoneCountryCode === countryCode.code ? 'bg-gray-50' : ''
                        }`}
                      >
                        {countryCode.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {/* Phone Input */}
              <input
                type="tel"
                id="checkout-phone"
                name="phone"
                inputMode="numeric"
                placeholder={phoneCountryCode === '+65' ? '9123 4567' : 'Enter phone number'}
                value={phone}
                onChange={(e) => {
                  // Remove non-numeric characters except spaces
                  const value = e.target.value.replace(/[^\d\s]/g, '')
                  // Get max digits for selected country code
                  const countryConfig = PHONE_COUNTRY_CODES.find(c => c.code === phoneCountryCode)
                  const maxDigits = countryConfig?.maxDigits || 15
                  // Limit to max digits for the country
                  if (value.replace(/\s/g, '').length <= maxDigits) {
                    setPhone(value)
                    // Clear error when user starts typing
                    if (phoneError) setPhoneError(null)
                  }
                }}
                onBlur={() => {
                  // Validate on blur if phone has value
                  if (phone) {
                    const validation = validatePhoneNumber(phone, phoneCountryCode)
                    if (!validation.valid) {
                      setPhoneError(validation.error || 'Invalid phone number')
                    } else {
                      setPhoneError(null)
                    }
                  }
                }}
                className={`w-full rounded-r border bg-white px-4 py-3 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder-[#999] outline-none transition-colors focus:border-black ${
                  phoneError ? 'border-red-500' : 'border-[#E3E3E3]'
                }`}
              />
            </div>
            {/* Phone Error Message */}
            {phoneError && (
              <p className="mt-1 font-inter text-[13px] text-red-500">
                {phoneError}
              </p>
            )}
          </div>

          {/* Shipping Method Section - Show info message when free shipping applies */}
          {qualifiesForFreeShipping && shippingOptionsFetched ? (
            // Free shipping: Show simple confirmation
            <div className="mb-8">
              <h2 className="mb-4 font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
                Shipping method
              </h2>
              <div className="rounded-lg border border-[#E8F5E9] bg-[#E8F5E9] p-4">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 shrink-0 text-[#4CAF50]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="flex-1 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-[#4CAF50]">
                    Free Shipping Applied
                  </p>
                  <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-[#4CAF50]">
                    $0.00
                  </span>
                </div>
              </div>
            </div>
          ) : (
            // Normal flow: Show shipping options for selection
            <div className="mb-8">
              <h2 className="mb-4 font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
                Shipping method
              </h2>

              <div className="rounded-lg border border-[#E3E3E3]">
                {shippingOptionsLoading ? (
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-black" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <p className="font-inter text-[14px] font-normal text-[#999]">
                        Loading shipping options...
                      </p>
                    </div>
                  </div>
                ) : shippingOptions.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="font-inter text-[14px] font-normal text-[#999]">
                      Enter your shipping address to see available options
                    </p>
                  </div>
                ) : easyParcelRates.length > 0 ? (
                  // EasyParcel rates with courier logos
                  easyParcelRates.map((rate, index) => (
                    <div
                      key={rate.service_id}
                      className={`p-4 transition-colors hover:bg-gray-50 ${index < easyParcelRates.length - 1 ? 'border-b border-[#E3E3E3]' : ''}`}
                    >
                      <label className="flex cursor-pointer items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            value={rate.service_id}
                            checked={shippingMethod === rate.service_id}
                            onChange={(e) => {
                              setShippingMethod(e.target.value)
                              setSelectedEasyParcelRate(rate)
                            }}
                            className="peer sr-only"
                          />
                          <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[#E3E3E3] p-0.5 transition-all peer-checked:border-black peer-checked:[&>div]:bg-black">
                            <div className="h-full w-full rounded-full bg-white transition-all" />
                          </div>
                          {rate.courier_logo && (
                            <Image
                              src={rate.courier_logo}
                              alt={rate.courier_name}
                              width={32}
                              height={32}
                              className="h-8 w-8 object-contain"
                              unoptimized
                            />
                          )}
                          <div>
                            <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-black">
                              {rate.courier_name}
                            </p>
                            <p className="mt-1 font-inter text-[14px] font-normal leading-[100%] tracking-[-0.84px] text-[#999]">
                              {rate.service_name} {rate.delivery_eta ? `- ${rate.delivery_eta}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-black">
                          {rate.price_display}
                        </span>
                      </label>
                    </div>
                  ))
                ) : (
                  // Fallback to Medusa native shipping options
                  shippingOptions.map((option, index) => (
                    <div
                      key={option.id}
                      className={`p-4 transition-colors hover:bg-gray-50 ${index < shippingOptions.length - 1 ? 'border-b border-[#E3E3E3]' : ''}`}
                    >
                      <label className="flex cursor-pointer items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            value={option.id}
                            checked={shippingMethod === option.id}
                            onChange={(e) => setShippingMethod(e.target.value)}
                            className="peer sr-only"
                          />
                          <div className="h-5 w-5 shrink-0 rounded-full border-2 border-[#E3E3E3] p-0.5 transition-all peer-checked:border-black peer-checked:[&>div]:bg-black">
                            <div className="h-full w-full rounded-full bg-white transition-all" />
                          </div>
                          <div>
                            <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-black">
                              {option.name}
                            </p>
                            <p className="mt-1 font-inter text-[14px] font-normal leading-[100%] tracking-[-0.84px] text-[#999]">
                              Standard delivery
                            </p>
                          </div>
                        </div>
                        <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-black">
                          ${(option.amount / 100).toFixed(2)}
                        </span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Payment Method Section */}
          <div className="mb-8">
            <h2 className="mb-4 font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
              Payment
            </h2>

            <div className="rounded-lg border border-[#E3E3E3]">
              {/* Credit Card Header */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-black">
                    Credit card
                  </span>
                  <div className="flex items-center gap-2">
                    <PaymentIcons />
                    <span className="font-inter text-[12px] font-normal leading-[100%] text-[#999]">and more...</span>
                  </div>
                </div>
              </div>

              {/* Stripe Payment Element */}
              <div className="border-t border-[#E3E3E3] bg-[#F7F7F7] p-4">
                {isInitializingPayment ? (
                  <div className="flex items-center justify-center py-8">
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
                    <span className="ml-2 font-inter text-[14px] text-[#999]">
                      Initializing payment...
                    </span>
                  </div>
                ) : clientSecret && stripePromise ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: stripeAppearance,
                    }}
                  >
                    <StripePaymentFormInner
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                      isSubmitting={isSubmitting}
                      setIsSubmitting={setIsSubmitting}
                      paymentCollectionId={paymentCollectionId}
                      cartId={medusaCart?.id || null}
                      totalCents={Math.round(total * 100)}
                    />
                  </Elements>
                ) : !email ? (
                  <p className="py-4 text-center font-inter text-[14px] text-[#999]">
                    Please enter your email address to continue
                  </p>
                ) : !shippingMethod && !qualifiesForFreeShipping ? (
                  <p className="py-4 text-center font-inter text-[14px] text-[#999]">
                    Please select a shipping method to continue
                  </p>
                ) : !shippingOptionsFetched ? (
                  <p className="py-4 text-center font-inter text-[14px] text-[#999]">
                    Enter your postal code to continue
                  </p>
                ) : (
                  <p className="py-4 text-center font-inter text-[14px] text-[#999]">
                    Unable to initialize payment. Please refresh the page.
                  </p>
                )}

                {/* Payment Error Display */}
                {paymentError && (
                  <div className="mt-4 rounded-lg bg-red-50 p-4">
                    <p className="font-inter text-[14px] font-medium text-red-600">
                      {paymentError}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-[#E3E3E3]" />

          {/* Footer Links */}
          <div className="flex flex-wrap items-center gap-4 text-center">
            <Link href="/return-policy" className="font-inter text-[14px] font-normal leading-[100%] tracking-[-0.84px] text-black hover:opacity-70">
              Return policy
            </Link>
            <Link href="/terms-service" className="font-inter text-[14px] font-normal leading-[100%] tracking-[-0.84px] text-black hover:opacity-70">
              Terms of service
            </Link>
            <Link href="/privacy-policy" className="font-inter text-[14px] font-normal leading-[100%] tracking-[-0.84px] text-black hover:opacity-70">
              Privacy policy
            </Link>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="bg-[#F7F7F7] px-4 py-8 sm:py-12 lg:py-24 sm:px-6 lg:col-span-2 lg:px-8 xl:py-28 xl:col-span-1">
          <div className="space-y-6">
            {/* Free Shipping Banner */}
            {qualifiesForFreeShipping && (
              <div className="flex items-center gap-2 rounded-lg bg-[#E8F5E9] p-4">
                <svg className="h-5 w-5 shrink-0 text-[#4CAF50]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-inter text-[14px] font-medium leading-[140%] tracking-[-0.28px] text-[#4CAF50]">
                  You&apos;ve qualified for free shipping!
                </p>
              </div>
            )}

            {/* Product List */}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                {/* Product Image with Quantity Badge */}
                <div className="relative h-20 w-20 shrink-0">
                  <div className="h-full w-full overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={getLineItemThumbnail(item)}
                      alt={getLineItemName(item)}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized={getLineItemThumbnail(item).startsWith('https://')}
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
                      {getLineItemName(item)}
                    </h3>
                    <p className="mt-1 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                      {getLineItemSize(item)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    {isPWPItem(item) && getLineItemEffectivePrice(item) < item.unit_price ? (
                      /* PWP item with active discount */
                      <>
                        <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-amber-600">
                          ${(getLineItemEffectivePrice(item) / 100).toFixed(2)}
                        </span>
                        <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999] line-through">
                          ${(item.unit_price / 100).toFixed(2)}
                        </span>
                      </>
                    ) : hasWholesaleTierDiscount(item) ? (
                      /* Wholesale tier discount */
                      <>
                        <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                          ${(getWholesaleTierPrice(item) / 100).toFixed(2)}
                        </span>
                        <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999] line-through">
                          ${(getOriginalPriceBeforeWholesale(item) / 100).toFixed(2)}
                        </span>
                      </>
                    ) : hasVariantDiscount(item) ? (
                      /* Variant discount (Set Discount Global) */
                      <>
                        <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                          ${(getVariantDiscountedPrice(item) / 100).toFixed(2)}
                        </span>
                        <span className="font-inter text-[12px] tracking-[-0.72px] text-[#999] line-through">
                          ${(getOriginalPriceBeforeVariantDiscount(item) / 100).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                        ${(getLineItemEffectivePrice(item) / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Divider */}
            <div className="bg-[#E3E3E3] h-px" />

            {/* Subtotal (original, before PWP/variant discounts) */}
            <div className="flex items-center justify-between">
              <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                Subtotal ({itemCount} items)
              </span>
              <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                ${originalSubtotalInDollars.toFixed(2)}
              </span>
            </div>

            {/* PWP Discount (if any) */}
            {pwpDiscountInDollars > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  PWP Discount
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  -${pwpDiscountInDollars.toFixed(2)}
                </span>
              </div>
            )}

            {/* Product/Variant Discount (if any) */}
            {variantDiscountInDollars > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  Product Discount
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  -${variantDiscountInDollars.toFixed(2)}
                </span>
              </div>
            )}

            {/* Shipping */}
            <div className="flex items-center justify-between">
              <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                Shipping
              </span>
              {qualifiesForFreeShipping ? (
                <div className="flex items-center gap-2">
                  {originalShippingCost > 0 && (
                    <span className="font-inter text-[14px] tracking-[-0.84px] text-[#999] line-through">
                      ${originalShippingCost.toFixed(2)}
                    </span>
                  )}
                  <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#4CAF50]">
                    FREE
                  </span>
                </div>
              ) : (
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                  ${SHIPPING_COST.toFixed(2)}
                </span>
              )}
            </div>

            {/* Tax */}
            <div className="flex items-center justify-between">
              <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                Tax
              </span>
              <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
                ${TAX.toFixed(2)}
              </span>
            </div>

            {/* Divider */}
            <div className="bg-[#E3E3E3] h-px" />

            {/* Promo Code */}
            <PromoCodeInput />

            {/* Discount (if applied) */}
            {appliedCoupon && discountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  Discount ({appliedCoupon.code})
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-green-600">
                  -${discountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Points Redemption */}
            <PointsRedemptionInput />

            {/* Points Discount (if applied) */}
            {appliedPoints && pointsDiscountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-amber-600">
                  Points ({appliedPoints.points.toLocaleString()} pts)
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-amber-600">
                  -${pointsDiscountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Membership Promo Section */}
            <MembershipPromoSection />

            {/* Membership Promo Discount (if applied) */}
            {appliedMembershipPromo && membershipPromoDiscountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-purple-600">
                  Member Discount
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-purple-600">
                  -${membershipPromoDiscountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Tier Discount (automatically applied for members) */}
            {appliedTierDiscount && tierDiscountAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-blue-600">
                  {appliedTierDiscount.name} ({appliedTierDiscount.discount_percentage}% off)
                </span>
                <span className="text-right font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-blue-600">
                  -${tierDiscountAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="bg-[#E3E3E3] h-px" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
                Total
              </span>
              <span className="text-right font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
