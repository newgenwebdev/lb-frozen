'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCustomer } from '@/lib/context/CustomerContext'
import { useCart } from '@/lib/context/CartContext'

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter()
  const { register, isAuthenticated, isLoading, error } = useCustomer()
  const { transferToCustomer } = useCart()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/account')
    }
  }, [isAuthenticated, router])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setFormError(null)

    if (!agreeToTerms) {
      setFormError('Please agree to the Terms of service and Privacy policy')
      return
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long')
      return
    }

    setIsSubmitting(true)

    const success = await register(email, password, {
      first_name: firstName,
      last_name: lastName,
    })

    if (success) {
      // Redirect to verification pending page - welcome message shown there
      router.push(`/auth/verify-email-sent?email=${encodeURIComponent(email)}`)
    } else {
      setFormError(error || 'Registration failed. Please try again.')
      toast.error('Registration failed', {
        description: error || 'Please try again.',
      })
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
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12 pt-24 2xl:pt-12">
      <div className="w-full max-w-md">
        {/* Create an account heading */}
        <h1 className="mb-8 text-left font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black">
          Create an account
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
          {/* First name field */}
          <div>
            <label htmlFor="firstName" className="mb-2 block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
              First name
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[#E3E3E3] bg-white p-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder:text-[#999] outline-none transition-colors focus:border-black disabled:opacity-50"
            />
          </div>

          {/* Last name field */}
          <div>
            <label htmlFor="lastName" className="mb-2 block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
              Last name
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[#E3E3E3] bg-white p-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder:text-[#999] outline-none transition-colors focus:border-black disabled:opacity-50"
            />
          </div>

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
                placeholder="************************"
                required
                minLength={8}
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
            <p className="mt-2 font-inter text-[12px] text-[#666]">
              Must be at least 8 characters
            </p>
          </div>

          {/* Terms and Privacy checkbox */}
          <div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="peer sr-only"
                disabled={isSubmitting}
              />
              <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#E3E3E3] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100 peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-2">
                <svg className="h-3 w-3 text-white opacity-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-inter text-[16px] font-normal leading-[100%] tracking-[-0.96px] text-black">
                By clicking here, I agree to the{' '}
                <Link href="/terms-service" className="underline transition-opacity hover:opacity-70">
                  Terms of service
                </Link>
                {' '}and{' '}
                <Link href="/privacy-policy" className="underline transition-opacity hover:opacity-70">
                  Privacy policy
                </Link>
                .
              </span>
            </label>
          </div>

          {/* Newsletter subscription checkbox */}
          <div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={subscribeNewsletter}
                onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                className="peer sr-only"
                disabled={isSubmitting}
              />
              <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#E3E3E3] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100 peer-focus:ring-2 peer-focus:ring-black peer-focus:ring-offset-2">
                <svg className="h-3 w-3 text-white opacity-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-inter text-[16px] font-normal leading-[100%] tracking-[-0.96px] text-black">
                Subscribe for updates on products, events, and more. Unsubscribe anytime.
              </span>
            </label>
          </div>

          {/* Create account button */}
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
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </button>

          {/* Already have an account link */}
          <div className="text-center">
            <Link href="/auth/login" className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-70">
              Already have an account? Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
