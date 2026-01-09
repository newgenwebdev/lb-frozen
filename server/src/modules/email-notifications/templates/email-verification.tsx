// @ts-nocheck - Ignore React 18/19 type conflicts with @react-email/components
import { Button, Link, Section, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

/**
 * The key for the EmailVerification template
 */
export const EMAIL_VERIFICATION = 'email-verification'

/**
 * The props for the EmailVerification template
 */
export interface EmailVerificationProps {
  /**
   * The link that the user can click to verify their email
   */
  verificationLink: string
  /**
   * Customer's first name for personalization
   */
  firstName?: string
  /**
   * The preview text for the email
   */
  preview?: string
}

/**
 * Type guard for checking if the data is of type EmailVerificationProps
 */
export const isEmailVerificationData = (data: unknown): data is EmailVerificationProps => {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.verificationLink === 'string' &&
    (typeof d.firstName === 'string' || d.firstName === undefined) &&
    (typeof d.preview === 'string' || d.preview === undefined)
  )
}

/**
 * The EmailVerification template component
 */
export const EmailVerificationEmail = ({
  verificationLink,
  firstName,
  preview = 'Verify your email address',
}: EmailVerificationProps): React.JSX.Element => {
  return (
    <Base preview={preview}>
      <Section className="text-center">
        <Text className="text-black text-[28px] font-bold leading-[36px] mt-0 mb-[16px]">
          Verify Your Email
        </Text>
        <Text className="text-[#666666] text-[16px] leading-[26px] mt-0 mb-[32px]">
          {firstName ? `Hi ${firstName}, welcome` : 'Welcome'} to KingJess!
          Please verify your email address to activate your account.
        </Text>
        <Section className="mb-[32px]">
          <Button
            className="bg-[#000000] rounded-full text-white text-[16px] font-semibold no-underline px-[32px] py-[16px]"
            href={verificationLink}
          >
            Verify Email
          </Button>
        </Section>
        <Text className="text-[#999999] text-[14px] leading-[22px] mt-0 mb-[8px]">
          Or copy and paste this URL into your browser:
        </Text>
        <Text style={{
          maxWidth: '100%',
          wordBreak: 'break-all',
          overflowWrap: 'break-word',
          margin: '0 0 32px'
        }}>
          <Link
            href={verificationLink}
            className="text-[#000000] underline text-[13px]"
          >
            {verificationLink}
          </Link>
        </Text>
      </Section>
      <Hr className="border border-solid border-[#eaeaea] my-0 mx-0 w-full" />
      <Section className="mt-[24px]">
        <Text className="text-[#999999] text-[13px] leading-[22px] mt-0 mb-[8px]">
          If you did not create an account, you can safely ignore this email.
          This link will expire in 24 hours for security reasons.
        </Text>
      </Section>
    </Base>
  )
}

EmailVerificationEmail.PreviewProps = {
  verificationLink: 'https://example.com/auth/verify-email?token=abc123def456',
  firstName: 'John',
  preview: 'Verify your email address',
} as EmailVerificationProps

export default EmailVerificationEmail
