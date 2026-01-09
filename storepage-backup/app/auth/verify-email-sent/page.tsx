'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useCustomer } from '@/lib/context/CustomerContext'

function VerifyEmailSentContent(): React.JSX.Element {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const { resendVerification, pendingVerificationEmail } = useCustomer()

  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const displayEmail = email || pendingVerificationEmail || ''

  // Handle cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [resendCooldown])

  async function handleResend(): Promise<void> {
    if (!displayEmail || isResending || resendCooldown > 0) return

    setIsResending(true)
    const success = await resendVerification(displayEmail)

    if (success) {
      toast.success('Email sent!', {
        description: 'Please check your inbox for the verification link.',
      })
      // Set 60 second cooldown
      setResendCooldown(60)
    } else {
      toast.error('Failed to send email', {
        description: 'Please try again later.',
      })
    }

    setIsResending(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Success checkmark icon */}
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
          Welcome to KingJess!
        </h1>

        <p className="mb-4 font-inter text-[18px] font-medium leading-[150%] tracking-[-1.08px] text-black">
          Your account has been created successfully.
        </p>

        <p className="mb-8 font-inter text-[16px] font-normal leading-[150%] tracking-[-0.96px] text-[#999]">
          We have sent a verification link to{' '}
          {displayEmail && (
            <span className="font-medium text-black">{displayEmail}</span>
          )}
          . Please check your inbox and click the link to verify your account.
        </p>

        {/* Resend button */}
        <button
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0}
          className="mb-4 w-full cursor-pointer rounded-[48px] bg-black px-12 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </span>
          ) : resendCooldown > 0 ? (
            `Resend in ${resendCooldown}s`
          ) : (
            'Resend verification email'
          )}
        </button>

        <Link
          href="/auth/login"
          className="inline-block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-70"
        >
          Back to login
        </Link>

        {/* Help text */}
        <p className="mt-8 font-inter text-[14px] font-normal leading-[150%] tracking-[-0.84px] text-[#999]">
          Didn&apos;t receive the email? Check your spam folder or try resending.
        </p>
      </div>
    </div>
  )
}

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

export default function VerifyEmailSentPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailSentContent />
    </Suspense>
  )
}
