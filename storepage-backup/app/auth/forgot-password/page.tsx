'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'

export default function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { checkEmail, resetPassword } = useCustomer()

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      // First check if email exists in the system
      const emailExists = await checkEmail(email)

      if (!emailExists) {
        setErrorMessage('Email does not exist in system. Please register an account.')
        setIsSubmitting(false)
        return
      }

      // Email exists, proceed with password reset
      const success = await resetPassword(email)
      if (success) {
        setIsSuccess(true)
      } else {
        setErrorMessage('Failed to send reset link. Please try again.')
      }
    } catch {
      setErrorMessage('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
            Check your email
          </h1>

          <p className="mb-8 font-inter text-[16px] font-normal leading-[150%] tracking-[-0.96px] text-[#999]">
            We have sent a password reset link to <span className="font-medium text-black">{email}</span>.
            Please check your inbox.
          </p>

          <Link
            href="/auth/login"
            className="inline-block cursor-pointer rounded-[48px] bg-black px-12 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90"
          >
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Forgot password heading */}
        <h1 className="mb-4 text-left font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black">
          Forgot password?
        </h1>

        {/* Subtitle */}
        <p className="mb-8 text-left font-inter text-[16px] font-normal leading-[100%] tracking-[-0.96px] text-[#999]">
          Enter your email address to receive a password reset link.
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
              className="w-full rounded-lg border border-[#E3E3E3] bg-white p-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black placeholder:font-medium placeholder:tracking-[-0.96px] placeholder:text-[#999] outline-none transition-colors focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Send link button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full cursor-pointer rounded-[48px] bg-black px-12 py-6 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send link'}
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
