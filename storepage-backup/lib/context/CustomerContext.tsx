'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import {
  type MedusaCustomer,
  type MedusaCustomerAddress,
  type CreateCustomerData,
  type UpdateCustomerData,
  type CreateAddressData,
  type VerifyEmailResponse,
  type CheckVerificationResponse,
  getStoredAuthToken,
  clearStoredAuthToken,
  registerCustomer,
  createCustomer,
  loginCustomer,
  logoutCustomer,
  checkEmailExists,
  verifyEmail as verifyEmailApi,
  checkEmailVerification,
  resendVerificationEmail as resendVerificationApi,
  requestPasswordReset,
  updatePassword,
  getCurrentCustomer,
  updateCustomer as updateCustomerApi,
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress as updateAddressApi,
  deleteCustomerAddress,
  setAuthToken,
} from '@/lib/api/customer'

// ============================================================================
// Types
// ============================================================================

export type CustomerContextType = {
  // Customer state
  customer: MedusaCustomer | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Auth operations
  register: (email: string, password: string, data?: Partial<CreateCustomerData>) => Promise<boolean>
  login: (email: string, password: string) => Promise<boolean>
  loginWithToken: (token: string) => Promise<boolean>
  logout: () => Promise<void>
  checkEmail: (email: string) => Promise<boolean>
  resetPassword: (email: string) => Promise<boolean>
  confirmPasswordReset: (newPassword: string, token: string) => Promise<boolean>

  // Email verification operations
  verifyEmail: (token: string) => Promise<VerifyEmailResponse>
  resendVerification: (email: string) => Promise<boolean>
  checkVerification: (email: string) => Promise<CheckVerificationResponse>
  pendingVerificationEmail: string | null
  setPendingVerificationEmail: (email: string | null) => void

  // Profile operations
  updateProfile: (data: UpdateCustomerData) => Promise<boolean>
  refreshCustomer: () => Promise<void>

  // Address operations
  addresses: MedusaCustomerAddress[]
  loadAddresses: () => Promise<void>
  addAddress: (data: CreateAddressData) => Promise<boolean>
  updateAddress: (addressId: string, data: Partial<CreateAddressData>) => Promise<boolean>
  removeAddress: (addressId: string) => Promise<boolean>
}

// ============================================================================
// Context
// ============================================================================

const CustomerContext = createContext<CustomerContextType | undefined>(undefined)

export const CustomerProvider = ({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element => {
  const [customer, setCustomer] = useState<MedusaCustomer | null>(null)
  const [addresses, setAddresses] = useState<MedusaCustomerAddress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)

  const isAuthenticated = customer !== null

  // Initialize - check for existing session
  useEffect(() => {
    const initializeCustomer = async (): Promise<void> => {
      const token = getStoredAuthToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const existingCustomer = await getCurrentCustomer()
        if (existingCustomer) {
          setCustomer(existingCustomer)
        } else {
          // Token is invalid, clear it
          clearStoredAuthToken()
        }
      } catch {
        clearStoredAuthToken()
      } finally {
        setIsLoading(false)
      }
    }

    initializeCustomer()
  }, [])

  const refreshCustomer = useCallback(async (): Promise<void> => {
    try {
      const updatedCustomer = await getCurrentCustomer()
      setCustomer(updatedCustomer)
    } catch (err) {
      console.error('Failed to refresh customer:', err)
    }
  }, [])

  const register = useCallback(
    async (
      email: string,
      password: string,
      data?: Partial<CreateCustomerData>
    ): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        // Step 1: Register with auth provider
        const token = await registerCustomer(email, password)

        // Step 2: Create customer with registration token
        // This triggers the email-verification subscriber which sends verification email
        await createCustomer(
          {
            email,
            first_name: data?.first_name,
            last_name: data?.last_name,
            phone: data?.phone,
          },
          token
        )

        // Step 3: Set pending email for verification page
        // DO NOT auto-login - user must verify email first
        setPendingVerificationEmail(email)

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        // Try to login first - this validates the password
        await loginCustomer(email, password)

        // Login succeeded, now check if email is verified
        const verification = await checkEmailVerification(email)

        if (verification.exists && !verification.verified) {
          // Email not verified - logout and redirect to verification
          await logoutCustomer()
          setPendingVerificationEmail(email)
          setError('Please verify your email before logging in')
          return false
        }

        // Email is verified, proceed with login
        const loggedInCustomer = await getCurrentCustomer()
        setCustomer(loggedInCustomer)
        return true
      } catch (err) {
        // Login failed - show the actual error (wrong password, etc.)
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const loginWithToken = useCallback(
    async (token: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      try {
        // Set the auth token directly
        setAuthToken(token)

        // Fetch the customer data
        const loggedInCustomer = await getCurrentCustomer()
        if (loggedInCustomer) {
          setCustomer(loggedInCustomer)
          return true
        } else {
          // Token was invalid, clear it
          clearStoredAuthToken()
          setError('Failed to authenticate')
          return false
        }
      } catch (err) {
        clearStoredAuthToken()
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      await logoutCustomer()
    } finally {
      setCustomer(null)
      setAddresses([])
      setIsLoading(false)
    }
  }, [])

  const checkEmail = useCallback(async (email: string): Promise<boolean> => {
    try {
      return await checkEmailExists(email)
    } catch {
      // If check fails, return true to allow password reset attempt
      return true
    }
  }, [])

  // Email verification methods
  const verifyEmail = useCallback(
    async (token: string): Promise<VerifyEmailResponse> => {
      try {
        return await verifyEmailApi(token)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Verification failed'
        return { success: false, message }
      }
    },
    []
  )

  const resendVerification = useCallback(
    async (email: string): Promise<boolean> => {
      setError(null)
      try {
        await resendVerificationApi(email)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to resend verification email'
        setError(message)
        return false
      }
    },
    []
  )

  const checkVerification = useCallback(
    async (email: string): Promise<CheckVerificationResponse> => {
      return await checkEmailVerification(email)
    },
    []
  )

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    setError(null)

    try {
      await requestPasswordReset(email)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset request failed'
      setError(message)
      return false
    }
  }, [])

  const confirmPasswordReset = useCallback(
    async (newPassword: string, token: string): Promise<boolean> => {
      setError(null)

      try {
        await updatePassword(newPassword, token)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Password reset failed'
        setError(message)
        return false
      }
    },
    []
  )

  const updateProfile = useCallback(
    async (data: UpdateCustomerData): Promise<boolean> => {
      setError(null)

      try {
        const updatedCustomer = await updateCustomerApi(data)
        setCustomer(updatedCustomer)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Profile update failed'
        setError(message)
        return false
      }
    },
    []
  )

  const loadAddresses = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return

    try {
      const customerAddresses = await getCustomerAddresses()
      setAddresses(customerAddresses)
    } catch (err) {
      console.error('Failed to load addresses:', err)
    }
  }, [isAuthenticated])

  const addAddress = useCallback(
    async (data: CreateAddressData): Promise<boolean> => {
      setError(null)

      try {
        await createCustomerAddress(data)
        await loadAddresses()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add address'
        setError(message)
        return false
      }
    },
    [loadAddresses]
  )

  const updateAddress = useCallback(
    async (
      addressId: string,
      data: Partial<CreateAddressData>
    ): Promise<boolean> => {
      setError(null)

      try {
        await updateAddressApi(addressId, data)
        await loadAddresses()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update address'
        setError(message)
        return false
      }
    },
    [loadAddresses]
  )

  const removeAddress = useCallback(
    async (addressId: string): Promise<boolean> => {
      setError(null)

      try {
        await deleteCustomerAddress(addressId)
        await loadAddresses()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove address'
        setError(message)
        return false
      }
    },
    [loadAddresses]
  )

  const value: CustomerContextType = {
    customer,
    isAuthenticated,
    isLoading,
    error,
    register,
    login,
    loginWithToken,
    logout,
    checkEmail,
    resetPassword,
    confirmPasswordReset,
    verifyEmail,
    resendVerification,
    checkVerification,
    pendingVerificationEmail,
    setPendingVerificationEmail,
    updateProfile,
    refreshCustomer,
    addresses,
    loadAddresses,
    addAddress,
    updateAddress,
    removeAddress,
  }

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  )
}

export const useCustomer = (): CustomerContextType => {
  const context = useContext(CustomerContext)
  if (!context) {
    throw new Error('useCustomer must be used within CustomerProvider')
  }
  return context
}
