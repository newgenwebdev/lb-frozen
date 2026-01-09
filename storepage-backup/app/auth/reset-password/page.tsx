'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'

function ResetPasswordForm(): React.JSX.Element {
  const searchParams = useSearchParams()
  const { confirmPasswordReset } = useCustomer()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isTokenExpired, setIsTokenExpired] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Mark as hydrated after mount to avoid hydration mismatch
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Extract token from URL on mount
  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setErrorMessage(null)

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match')
      return
    }

    // Validate password length
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long')
      return
    }

    // Validate token exists
    if (!token) {
      setErrorMessage('Invalid or missing reset token. Please request a new password reset link.')
      return
    }

    setIsSubmitting(true)

    try {
      const success = await confirmPasswordReset(newPassword, token)
      if (success) {
        setIsSuccess(true)
      } else {
        // Token is invalid or expired - show the expired link UI
        setIsTokenExpired(true)
      }
    } catch {
      // Token is invalid or expired - show the expired link UI
      setIsTokenExpired(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // No token or token expired - show error state
  if ((isHydrated && !token) || isTokenExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="mb-4 font-inter text-[32px] font-medium leading-[100%] tracking-[-1.92px] text-black">
            {isTokenExpired ? 'Link Expired' : 'Invalid Link'}
          </h1>

          <p className="mb-8 font-inter text-[16px] font-normal leading-[150%] tracking-[-0.96px] text-[#999]">
            {isTokenExpired
              ? 'This password reset link has expired. Please request a new password reset link.'
              : 'This password reset link is invalid. Please request a new password reset link.'}
          </p>

          <Link
            href="/auth/forgot-password"
            className="inline-block cursor-pointer rounded-[48px] bg-black px-12 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90"
          >
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="mb-4 font-inter text-[32px] font-medium leading-[100%] tracking-[-1.92px] text-black">
            Password Reset Successful
          </h1>

          <p className="mb-8 font-inter text-[16px] font-normal leading-[150%] tracking-[-0.96px] text-[#999]">
            Your password has been successfully reset.
            You can now log in with your new password.
          </p>

          <Link
            href="/auth/login"
            className="inline-block cursor-pointer rounded-[48px] bg-black px-12 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90"
          >
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Reset password heading */}
        <h1 className="mb-4 text-left font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black">
          Reset password
        </h1>

        {/* Subtitle */}
        <p className="mb-8 text-left font-inter text-[16px] font-normal leading-[100%] tracking-[-0.96px] text-[#999]">
          Enter a new password for your account.
        </p>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-inter text-[14px] font-medium text-red-600">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New password field */}
          <div>
            <label htmlFor="newPassword" className="mb-2 block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
              New password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="*************"
                required
                disabled={isSubmitting}
                minLength={8}
                className="w-full rounded-lg border border-[#E3E3E3] bg-white p-6 pr-16 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder:text-[#999] outline-none transition-colors focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 cursor-pointer text-black transition-opacity hover:opacity-70"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? (
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
            <p className="mt-2 font-inter text-[12px] text-[#999]">
              Must be at least 8 characters
            </p>
          </div>

          {/* Re-enter new password field */}
          <div>
            <label htmlFor="confirmPassword" className="mb-2 block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
              Re-enter new password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="*************"
                required
                disabled={isSubmitting}
                minLength={8}
                className="w-full rounded-lg border border-[#E3E3E3] bg-white p-6 pr-16 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder:text-[#999] outline-none transition-colors focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 cursor-pointer text-black transition-opacity hover:opacity-70"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
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

          {/* Save password button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-[48px] bg-black px-12 py-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save password'}
          </button>

          {/* Back to login link */}
          <div className="text-center">
            <Link href="/auth/login" className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-70">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

// Loading fallback for Suspense
function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
        <p className="font-inter text-[16px] text-[#999]">Loading...</p>
      </div>
    </div>
  )
}

// Main export with Suspense wrapper for useSearchParams
export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
