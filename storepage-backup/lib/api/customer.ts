import { medusa } from './medusa'

// ============================================================================
// Constants
// ============================================================================

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY || ''

// ============================================================================
// Types
// ============================================================================

export type MedusaCustomer = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  has_account: boolean
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

export type MedusaCustomerAddress = {
  id: string
  customer_id: string
  first_name: string
  last_name: string
  company: string | null
  address_1: string
  address_2: string | null
  city: string
  province: string | null
  postal_code: string
  country_code: string
  phone: string | null
  is_default_shipping: boolean
  is_default_billing: boolean
  metadata?: Record<string, unknown>
}

export type CreateCustomerData = {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

export type UpdateCustomerData = {
  first_name?: string
  last_name?: string
  phone?: string
  metadata?: Record<string, unknown>
}

export type CreateAddressData = {
  first_name: string
  last_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
  phone?: string
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

// ============================================================================
// Token Storage
// ============================================================================

const AUTH_TOKEN_KEY = 'lb-frozen-auth-token'

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

// ============================================================================
// Authentication Operations
// ============================================================================

/**
 * Cleanup unverified customer registration
 * This allows re-registration with the same email if the previous registration
 * was never verified.
 */
export async function cleanupUnverifiedRegistration(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/store/auth/cleanup-unverified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
      },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()
    return data.success === true
  } catch {
    return false
  }
}

/**
 * Register a new customer
 * Returns a token that should be used to create the customer
 *
 * If the email already exists but is unverified, it will automatically
 * cleanup the old registration and retry.
 */
export async function registerCustomer(
  email: string,
  password: string
): Promise<string> {
  try {
    const token = await medusa.auth.register('customer', 'emailpass', {
      email,
      password,
    })
    return token
  } catch (error) {
    // Check for duplicate email error from Medusa
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : ''
    if (
      errorMessage.includes('already exists') ||
      errorMessage.includes('duplicate') ||
      errorMessage.includes('identity with email already exists')
    ) {
      // Check if this is an unverified registration that can be cleaned up
      const verification = await checkEmailVerification(email)

      if (verification.exists && !verification.verified) {
        // Cleanup the unverified registration and retry
        const cleaned = await cleanupUnverifiedRegistration(email)

        if (cleaned) {
          // Retry registration after cleanup
          try {
            const token = await medusa.auth.register('customer', 'emailpass', {
              email,
              password,
            })
            return token
          } catch {
            // If retry also fails, show the original error
            throw new Error(
              'Registration failed. Email already exists in the system. Please use different email to register an account.'
            )
          }
        }
      }

      throw new Error(
        'Registration failed. Email already exists in the system. Please use different email to register an account.'
      )
    }
    throw error
  }
}

/**
 * Create customer after registration
 * Must be called after registerCustomer with the registration token
 */
export async function createCustomer(
  data: CreateCustomerData,
  token: string
): Promise<MedusaCustomer> {
  const response = await medusa.store.customer.create(
    {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
    },
    {},
    { Authorization: `Bearer ${token}` }
  )
  return response.customer as unknown as MedusaCustomer
}

/**
 * Login customer with email and password
 */
export async function loginCustomer(
  email: string,
  password: string
): Promise<string> {
  const result = await medusa.auth.login('customer', 'emailpass', {
    email,
    password,
  })

  // If result is a string, it's the JWT token
  if (typeof result === 'string') {
    setStoredAuthToken(result)
    return result
  }

  // If result has a location, third-party auth is required
  if ('location' in result) {
    throw new Error('Third-party authentication required')
  }

  throw new Error('Login failed')
}

/**
 * Logout current customer
 */
export async function logoutCustomer(): Promise<void> {
  try {
    await medusa.auth.logout()
  } finally {
    clearStoredAuthToken()
  }
}

/**
 * Check if a customer email exists in the system
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/store/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      // If API fails, assume email exists to avoid blocking users
      return true
    }

    const data = await response.json()
    return data.exists === true
  } catch {
    // If request fails, assume email exists to avoid blocking users
    return true
  }
}

// ============================================================================
// Email Verification Operations
// ============================================================================

export type VerifyEmailResponse = {
  success: boolean
  message: string
  already_verified?: boolean
  email?: string
  token?: string | null
}

export type CheckVerificationResponse = {
  verified: boolean
  exists: boolean
}

export type ResendVerificationResponse = {
  success: boolean
  message: string
  already_verified?: boolean
  retry_after?: number
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  const response = await fetch(`${BACKEND_URL}/store/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    },
    body: JSON.stringify({ token }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to verify email')
  }

  return data
}

/**
 * Check if customer email is verified
 */
export async function checkEmailVerification(email: string): Promise<CheckVerificationResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/store/auth/check-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      return { verified: false, exists: false }
    }

    return await response.json()
  } catch {
    return { verified: false, exists: false }
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<ResendVerificationResponse> {
  const response = await fetch(`${BACKEND_URL}/store/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
    },
    body: JSON.stringify({ email }),
  })

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(`Please wait ${data.retry_after} seconds before requesting again`)
    }
    throw new Error(data.message || 'Failed to resend verification email')
  }

  return data
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await medusa.auth.resetPassword('customer', 'emailpass', {
    identifier: email,
  })
}

/**
 * Update password after reset
 */
export async function updatePassword(
  newPassword: string,
  resetToken: string
): Promise<void> {
  await medusa.auth.updateProvider(
    'customer',
    'emailpass',
    { password: newPassword },
    resetToken
  )
}

/**
 * Refresh authentication token
 */
export async function refreshAuthToken(): Promise<string> {
  const token = await medusa.auth.refresh()
  setStoredAuthToken(token)
  return token
}

/**
 * Set auth token directly (used for auto-login after email verification)
 */
export function setAuthToken(token: string): void {
  setStoredAuthToken(token)
}

// ============================================================================
// Customer Operations
// ============================================================================

/**
 * Get current logged-in customer
 */
export async function getCurrentCustomer(): Promise<MedusaCustomer | null> {
  try {
    const response = await medusa.store.customer.retrieve()
    return response.customer as unknown as MedusaCustomer
  } catch (error) {
    // Customer not logged in or token invalid
    console.error('Failed to get current customer:', error)
    return null
  }
}

/**
 * Update customer profile
 */
export async function updateCustomer(
  data: UpdateCustomerData
): Promise<MedusaCustomer> {
  const response = await medusa.store.customer.update(data)
  return response.customer as unknown as MedusaCustomer
}

// ============================================================================
// Address Operations
// ============================================================================

/**
 * Get customer addresses
 */
export async function getCustomerAddresses(): Promise<MedusaCustomerAddress[]> {
  const response = await medusa.store.customer.listAddress()
  return (response.addresses || []) as MedusaCustomerAddress[]
}

/**
 * Create customer address
 */
export async function createCustomerAddress(
  data: CreateAddressData
): Promise<MedusaCustomer> {
  const response = await medusa.store.customer.createAddress(data)
  return response.customer as unknown as MedusaCustomer
}

/**
 * Update customer address
 */
export async function updateCustomerAddress(
  addressId: string,
  data: Partial<CreateAddressData>
): Promise<MedusaCustomer> {
  const response = await medusa.store.customer.updateAddress(addressId, data)
  return response.customer as unknown as MedusaCustomer
}

/**
 * Delete customer address
 */
export async function deleteCustomerAddress(addressId: string): Promise<void> {
  await medusa.store.customer.deleteAddress(addressId)
}

// ============================================================================
// Newsletter Operations
// ============================================================================

export type NewsletterStatusResponse = {
  subscribed: boolean
  email: string
}

export type NewsletterUpdateResponse = {
  success: boolean
  subscribed: boolean
  message: string
}

/**
 * Get customer's newsletter subscription status
 * Requires authentication
 */
export async function getNewsletterStatus(): Promise<NewsletterStatusResponse | null> {
  const token = getStoredAuthToken()

  if (!token) {
    return null
  }

  try {
    const response = await fetch(`${BACKEND_URL}/store/customer/newsletter`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 401) {
        return null
      }
      throw new Error('Failed to fetch newsletter status')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching newsletter status:', error)
    return null
  }
}

/**
 * Update customer's newsletter subscription preference
 * Requires authentication
 */
export async function updateNewsletterSubscription(
  subscribed: boolean
): Promise<NewsletterUpdateResponse> {
  const token = getStoredAuthToken()

  if (!token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${BACKEND_URL}/store/customer/newsletter`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-publishable-api-key': PUBLISHABLE_API_KEY,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ subscribed }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update newsletter subscription')
  }

  return await response.json()
}
