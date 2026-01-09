'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCustomer } from '@/lib/context/CustomerContext'

function VerifyEmailForm(): React.JSX.Element {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { verifyEmail } = useCustomer()

  const [isVerifying, setIsVerifying] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [token, setToken] = useState<string | null>(null)
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)

  // Extract token from URL
  useEffect(() => {
    const tokenParam = searchParams.get('token')
    setToken(tokenParam)
  }, [searchParams])

  // Verify email when token is available
  useEffect(() => {
    async function verify(): Promise<void> {
      if (!token) {
        setIsVerifying(false)
        setIsError(true)
        setErrorMessage('Invalid verification link')
        return
      }

      try {
        const result = await verifyEmail(token)

        if (result.success) {
          setIsSuccess(true)
          if (result.email) {
            setVerifiedEmail(result.email)
          }
        } else {
          setIsError(true)
          setErrorMessage(result.message || 'Verification failed')
        }
      } catch {
        setIsError(true)
        setErrorMessage('An error occurred during verification')
      } finally {
        setIsVerifying(false)
      }
    }

    if (token !== null) {
      verify()
    }
  }, [token, verifyEmail])

  // Loading state
  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <h1 className="mb-4 font-inter text-[24px] font-medium leading-[100%] tracking-[-1.44px] text-black">
            Verifying your email...
          </h1>
          <p className="font-inter text-[16px] text-[#999]">
            Please wait while we verify your email address.
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
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
            Verification Failed
          </h1>

          <p className="mb-8 font-inter text-[16px] font-normal leading-[150%] tracking-[-0.96px] text-[#999]">
            {errorMessage}
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
            Email Verified!
          </h1>

          <p className="mb-8 font-inter text-[16px] font-normal leading-[150%] tracking-[-0.96px] text-[#999]">
            Your email has been successfully verified. You can now log in to your account.
          </p>

          <Link
            href={verifiedEmail ? `/auth/login?email=${encodeURIComponent(verifiedEmail)}&verified=true` : '/auth/login?verified=true'}
            className="inline-block cursor-pointer rounded-[48px] bg-black px-12 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white transition-opacity hover:opacity-90"
          >
            Log in to your account
          </Link>
        </div>
      </div>
    )
  }

  return <></>
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

export default function VerifyEmailPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailForm />
    </Suspense>
  )
}
