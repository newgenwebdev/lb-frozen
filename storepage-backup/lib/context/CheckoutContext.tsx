'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useCart } from './CartContext'
import type { MedusaCartAddress } from '@/lib/api/cart'
import {
  prepareCartForCheckout,
  completeCheckout,
  getShippingOptions,
  type ShippingOption,
  type MedusaOrder,
} from '@/lib/api/checkout'

// ============================================================================
// Types
// ============================================================================

export type CheckoutStep = 'information' | 'shipping' | 'payment' | 'complete'

export type CheckoutFormData = {
  email: string
  firstName: string
  lastName: string
  address: string
  apartment: string
  city: string
  province: string
  postalCode: string
  country: string
  countryCode: string
  phone: string
  saveInfo: boolean
  emailOffers: boolean
}

export type CheckoutContextType = {
  // Form data
  formData: CheckoutFormData
  updateFormData: (data: Partial<CheckoutFormData>) => void

  // Shipping
  shippingOptions: ShippingOption[]
  selectedShippingOption: string | null
  setSelectedShippingOption: (id: string) => void
  loadShippingOptions: () => Promise<void>

  // Billing
  useSameAddressForBilling: boolean
  setUseSameAddressForBilling: (same: boolean) => void
  billingAddress: CheckoutFormData | null
  setBillingAddress: (address: CheckoutFormData | null) => void

  // Payment
  paymentMethod: 'card' | 'paypal'
  setPaymentMethod: (method: 'card' | 'paypal') => void

  // Checkout flow
  isProcessing: boolean
  error: string | null
  prepareCheckout: () => Promise<boolean>
  completeOrder: () => Promise<MedusaOrder | null>

  // Order result
  completedOrder: MedusaOrder | null
}

const defaultFormData: CheckoutFormData = {
  email: '',
  firstName: '',
  lastName: '',
  address: '',
  apartment: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'Singapore',
  countryCode: 'sg',
  phone: '',
  saveInfo: false,
  emailOffers: false,
}

// ============================================================================
// Context
// ============================================================================

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined)

export const CheckoutProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const { medusaCart, clearCart } = useCart()

  // Form state
  const [formData, setFormData] = useState<CheckoutFormData>(defaultFormData)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShippingOption, setSelectedShippingOption] = useState<string | null>(null)
  const [useSameAddressForBilling, setUseSameAddressForBilling] = useState(true)
  const [billingAddress, setBillingAddress] = useState<CheckoutFormData | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card')

  // Flow state
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedOrder, setCompletedOrder] = useState<MedusaOrder | null>(null)

  const updateFormData = useCallback((data: Partial<CheckoutFormData>): void => {
    setFormData((prev) => ({ ...prev, ...data }))
  }, [])

  const loadShippingOptions = useCallback(async (): Promise<void> => {
    if (!medusaCart?.id) return

    try {
      const options = await getShippingOptions(medusaCart.id)
      setShippingOptions(options)
      if (options.length > 0 && !selectedShippingOption) {
        setSelectedShippingOption(options[0].id)
      }
    } catch (err) {
      console.error('Failed to load shipping options:', err)
    }
  }, [medusaCart?.id, selectedShippingOption])

  const prepareCheckout = useCallback(async (): Promise<boolean> => {
    if (!medusaCart?.id) {
      setError('No cart found')
      return false
    }

    if (!selectedShippingOption) {
      setError('Please select a shipping method')
      return false
    }

    setIsProcessing(true)
    setError(null)

    try {
      const shippingAddress: MedusaCartAddress = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        address_1: formData.address,
        address_2: formData.apartment || undefined,
        city: formData.city,
        province: formData.province,
        postal_code: formData.postalCode,
        country_code: formData.countryCode,
        phone: formData.phone || undefined,
      }

      await prepareCartForCheckout(medusaCart.id, {
        email: formData.email,
        shippingAddress,
        billingAddress: useSameAddressForBilling ? undefined : billingAddress ? {
          first_name: billingAddress.firstName,
          last_name: billingAddress.lastName,
          address_1: billingAddress.address,
          address_2: billingAddress.apartment || undefined,
          city: billingAddress.city,
          province: billingAddress.province,
          postal_code: billingAddress.postalCode,
          country_code: billingAddress.countryCode,
          phone: billingAddress.phone || undefined,
        } : undefined,
        shippingOptionId: selectedShippingOption,
      })

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to prepare checkout'
      setError(message)
      return false
    } finally {
      setIsProcessing(false)
    }
  }, [
    medusaCart?.id,
    formData,
    selectedShippingOption,
    useSameAddressForBilling,
    billingAddress,
  ])

  const completeOrder = useCallback(async (): Promise<MedusaOrder | null> => {
    if (!medusaCart?.id) {
      setError('No cart found')
      return null
    }

    setIsProcessing(true)
    setError(null)

    try {
      const result = await completeCheckout(medusaCart.id)

      if (result.type === 'order' && result.order) {
        setCompletedOrder(result.order)
        await clearCart()
        return result.order
      } else {
        setError('Order could not be completed. Please try again.')
        return null
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete order'
      setError(message)
      return null
    } finally {
      setIsProcessing(false)
    }
  }, [medusaCart?.id, clearCart])

  const value: CheckoutContextType = {
    formData,
    updateFormData,
    shippingOptions,
    selectedShippingOption,
    setSelectedShippingOption,
    loadShippingOptions,
    useSameAddressForBilling,
    setUseSameAddressForBilling,
    billingAddress,
    setBillingAddress,
    paymentMethod,
    setPaymentMethod,
    isProcessing,
    error,
    prepareCheckout,
    completeOrder,
    completedOrder,
  }

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
}

export const useCheckout = (): CheckoutContextType => {
  const context = useContext(CheckoutContext)
  if (!context) {
    throw new Error('useCheckout must be used within CheckoutProvider')
  }
  return context
}
