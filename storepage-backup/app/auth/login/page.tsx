'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useCustomer } from '@/lib/context/CustomerContext'
import { useCart } from '@/lib/context/CartContext'
import { getSafeRedirectUrl } from '@/lib/utils/safe-redirect'

// Loading component for Suspense
function LoginPageLoading(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex items-center gap-3">
        <svg className="h-6 w-6 animate-spin text-black" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    </div>
  )
}

// Content component that uses useSearchParams
function LoginPageContent(): React.JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Validate redirect URL to prevent open redirect attacks
  const redirect = getSafeRedirectUrl(searchParams.get('redirect'), '/account')
  const { login, isAuthenticated, isLoading, error } = useCustomer()
  const { transferToCustomer } = useCart()

  // Pre-fill email from URL query param (e.g., after email verification)
  const emailParam = searchParams.get('email')
  const [email, setEmail] = useState(emailParam || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirect)
    }
  }, [isAuthenticated, redirect, router])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    const success = await login(email, password)

    if (success) {
      // Transfer the guest cart to the logged-in customer
      // This links the cart (with any items added before login) to their account
      await transferToCustomer()

      // Check if this is first login after email verification
      const isFirstLogin = searchParams.get('verified') === 'true'

      if (isFirstLogin) {
        toast.success('Welcome to KingJess!', {
          description: 'Your account is now active.',
        })
      } else {
        toast.success('Welcome back!', {
          description: 'You have been logged in successfully.',
        })
      }
      router.push(redirect)
    } else {
      // Check if error is about email verification
      if (error?.includes('verify your email')) {
        toast.error('Email not verified', {
          description: 'Please verify your email before logging in.',
        })
        router.push(`/auth/verify-email-sent?email=${encodeURIComponent(email)}`)
      } else {
        setFormError(error || 'Invalid email or password')
        toast.error('Login failed', {
          description: error || 'Invalid email or password',
        })
      }
    }

    setIsSubmitting(false)
  }

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
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
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Log in heading */}
        <h1 className="mb-8 text-left font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black">
          Log in
        </h1>

        {/* Error message */}
        {formError && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <p className="font-inter text-[14px] font-medium text-red-600">
              {formError}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email address field */}
          <div>
            <label htmlFor="email" className="mb-2 block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="johndoe@example.com"
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[#E3E3E3] bg-white p-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder:text-[#999] outline-none transition-colors focus:border-black disabled:opacity-50"
            />
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="mb-2 block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******************"
                required
                disabled={isSubmitting}
                className="w-full rounded-lg border border-[#E3E3E3] bg-white p-6 pr-16 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder:text-[#999] outline-none transition-colors focus:border-black disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 cursor-pointer text-black transition-opacity hover:opacity-70"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot password link */}
          <div className="text-left">
            <Link href="/auth/forgot-password" className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-70">
              Forgot password?
            </Link>
          </div>

          {/* Log in button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-[48px] bg-black px-12 py-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
                Logging in...
              </span>
            ) : (
              'Log in'
            )}
          </button>

          {/* Create an account link */}
          <div className="text-center">
            <Link href="/auth/register" className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-70">
              Create an account
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

// Default export wrapped in Suspense
export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  )
}
