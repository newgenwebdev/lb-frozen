'use client'

import React, { useState, useEffect } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise, stripeAppearance } from '@/lib/context/StripeContext'
import {
  formatCurrency,
  createMembershipPaymentIntent,
  completeMembershipPurchase,
} from '@/lib/api/membership'
import type { MembershipConfig } from '@/lib/types/membership'

type MembershipPurchaseModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  config: MembershipConfig
}

type PaymentFormProps = {
  onSuccess: () => void
  onError: (error: string) => void
  formattedPrice: string
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
}

function PaymentForm({
  onSuccess,
  onError,
  formattedPrice,
  isProcessing,
  setIsProcessing,
}: PaymentFormProps): React.JSX.Element {
  const stripe = useStripe()
  const elements = useElements()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account/membership`,
        },
        redirect: 'if_required',
      })

      if (error) {
        setErrorMessage(error.message || 'Payment failed')
        onError(error.message || 'Payment failed')
        return
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Complete the membership purchase on the backend
        await completeMembershipPurchase(paymentIntent.id)
        onSuccess()
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        setErrorMessage('Additional authentication required. Please follow the prompts.')
      } else {
        setErrorMessage(`Unexpected payment status: ${paymentIntent?.status}`)
        onError(`Unexpected payment status: ${paymentIntent?.status}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      setErrorMessage(message)
      onError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card', 'google_pay', 'apple_pay'],
        }}
      />

      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-3">
          <p className="font-inter text-[14px] text-red-600">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full cursor-pointer rounded-full bg-black px-6 py-3 font-inter text-[14px] font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
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
          `Pay ${formattedPrice}`
        )}
      </button>
    </form>
  )
}

export function MembershipPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  config,
}: MembershipPurchaseModalProps): React.JSX.Element | null {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null)
      setError(null)
      setIsLoading(false)
      setIsProcessing(false)
    }
  }, [isOpen])

  // Create PaymentIntent when modal opens
  useEffect(() => {
    if (isOpen && !clientSecret && !isLoading && !error) {
      const initializePayment = async (): Promise<void> => {
        setIsLoading(true)
        setError(null)

        try {
          const result = await createMembershipPaymentIntent()
          setClientSecret(result.client_secret)
        } catch (err) {
          console.error('Failed to create payment intent:', err)
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment'
          // Provide more helpful message for auth errors
          if (errorMessage === 'Authentication required') {
            setError('Please log in to purchase a membership. Your session may have expired.')
          } else {
            setError(errorMessage)
          }
        } finally {
          setIsLoading(false)
        }
      }

      initializePayment()
    }
  }, [isOpen, clientSecret, isLoading, error])

  if (!isOpen) return null

  // Format price and duration
  const formattedPrice = formatCurrency(config.price, config.currency)
  const getDurationText = (): string => {
    if (config.duration_months === null) {
      return 'Lifetime Access'
    }
    if (config.duration_months === 1) {
      return '1 Month'
    }
    if (config.duration_months === 12) {
      return '1 Year'
    }
    return `${config.duration_months} Months`
  }

  const handleSuccess = (): void => {
    onSuccess()
    onClose()
  }

  const handleError = (errorMessage: string): void => {
    setError(errorMessage)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer text-[#999] transition-colors hover:text-black"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center">
          <h2 className="font-inter text-[24px] font-medium text-black">
            Join Membership
          </h2>
          <p className="mt-2 font-inter text-[14px] text-[#999]">
            Complete your purchase to unlock exclusive benefits
          </p>
        </div>

        {/* Price Card */}
        <div className="mt-6 rounded-xl bg-[#FAFAFA] p-4 text-center">
          <p className="font-inter text-[32px] font-bold text-black">
            {formattedPrice}
          </p>
          <p className="font-inter text-[14px] text-[#999]">
            {getDurationText()}
          </p>
        </div>

        {/* Benefits Summary */}
        <div className="mt-6 space-y-2">
          <p className="font-inter text-[12px] font-medium uppercase tracking-wider text-[#999]">
            What you get
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-inter text-[14px] text-black">Earn points on every purchase</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-inter text-[14px] text-black">Exclusive member discounts</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-inter text-[14px] text-black">Birthday rewards</span>
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-inter text-[14px] text-black">Tier upgrades based on activity</span>
            </li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3">
            <p className="font-inter text-[14px] text-red-600">{error}</p>
          </div>
        )}

        {/* Payment Section */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="h-8 w-8 animate-spin text-black" viewBox="0 0 24 24" fill="none">
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
              <span className="ml-3 font-inter text-[14px] text-[#999]">Initializing payment...</span>
            </div>
          ) : clientSecret && stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: stripeAppearance,
              }}
            >
              <PaymentForm
                onSuccess={handleSuccess}
                onError={handleError}
                formattedPrice={formattedPrice}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </Elements>
          ) : !error ? (
            <div className="rounded-xl border border-dashed border-[#E3E3E3] p-4">
              <p className="text-center font-inter text-[14px] text-[#999]">
                Unable to initialize payment. Please try again.
              </p>
            </div>
          ) : null}
        </div>

        {/* Cancel Button */}
        <div className="mt-4">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full cursor-pointer rounded-full border border-[#E3E3E3] bg-white px-6 py-3 font-inter text-[14px] font-medium text-black transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        {/* Security Note */}
        <p className="mt-4 text-center font-inter text-[12px] text-[#999]">
          Secured by Stripe. Your payment information is encrypted.
        </p>
      </div>
    </div>
  )
}
