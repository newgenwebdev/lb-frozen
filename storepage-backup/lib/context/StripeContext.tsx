'use client'

import React, { createContext, useContext } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import type { Appearance } from '@stripe/stripe-js'

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

// Shared appearance configuration for Stripe Elements
export const stripeAppearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#000000',
    colorBackground: '#ffffff',
    colorText: '#000000',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px',
  },
  rules: {
    '.Input': {
      border: '1px solid #E3E3E3',
      padding: '12px 16px',
    },
    '.Input:focus': {
      border: '1px solid #000000',
      boxShadow: 'none',
    },
    '.Label': {
      fontWeight: '500',
      marginBottom: '8px',
    },
  },
}

type StripeContextType = {
  isStripeLoaded: boolean
}

const StripeContext = createContext<StripeContextType>({ isStripeLoaded: false })

type StripeProviderProps = {
  children: React.ReactNode
}

export const StripeProvider = ({ children }: StripeProviderProps): React.JSX.Element => {
  const isStripeLoaded = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  if (!isStripeLoaded) {
    // If Stripe is not configured, render children without Stripe Elements
    console.warn('Stripe publishable key not configured. Payment features will be disabled.')
    return (
      <StripeContext.Provider value={{ isStripeLoaded: false }}>
        {children}
      </StripeContext.Provider>
    )
  }

  // Note: For dynamic clientSecret (PaymentIntent), Elements should be rendered
  // at the component level with the clientSecret option.
  // This provider just sets up the context for Stripe availability.
  return (
    <StripeContext.Provider value={{ isStripeLoaded: true }}>
      {children}
    </StripeContext.Provider>
  )
}

export const useStripeContext = (): StripeContextType => {
  return useContext(StripeContext)
}

// Export the stripe promise for direct usage with Elements
export { stripePromise }
