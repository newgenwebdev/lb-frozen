// @ts-nocheck - Ignore React 18/19 type conflicts with @react-email/components
import { Button, Link, Section, Text, Hr } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

/**
 * The key for the PasswordResetEmail template
 */
export const PASSWORD_RESET = 'password-reset'

/**
 * The props for the PasswordResetEmail template
 */
export interface PasswordResetEmailProps {
  /**
   * The link that the user can click to reset their password
   */
  resetLink: string
  /**
   * The preview text for the email
   */
  preview?: string
}

/**
 * Type guard for checking if the data is of type PasswordResetEmailProps
 */
export const isPasswordResetData = (data: unknown): data is PasswordResetEmailProps => {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.resetLink === 'string' && (typeof d.preview === 'string' || d.preview === undefined)
}

/**
 * The PasswordResetEmail template component
 */
export const PasswordResetEmail = ({
  resetLink,
  preview = 'Reset your password',
}: PasswordResetEmailProps): React.JSX.Element => {
  return (
    <Base preview={preview}>
      <Section className="text-center">
        <Text className="text-black text-[28px] font-bold leading-[36px] mt-0 mb-[16px]">
          Reset Your Password
        </Text>
        <Text className="text-[#666666] text-[16px] leading-[26px] mt-0 mb-[32px]">
          We received a request to reset your password. Click the button below to create a new password.
        </Text>
        <Section className="mb-[32px]">
          <Button
            className="bg-[#000000] rounded-full text-white text-[16px] font-semibold no-underline px-[32px] py-[16px]"
            href={resetLink}
          >
            Reset Password
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
            href={resetLink}
            className="text-[#000000] underline text-[13px]"
          >
            {resetLink}
          </Link>
        </Text>
      </Section>
      <Hr className="border border-solid border-[#eaeaea] my-0 mx-0 w-full" />
      <Section className="mt-[24px]">
        <Text className="text-[#999999] text-[13px] leading-[22px] mt-0 mb-[8px]">
          If you did not request a password reset, you can safely ignore this email.
          This link will expire in 1 hour for security reasons.
        </Text>
        <Text className="text-[#999999] text-[13px] leading-[22px] mt-0 mb-0">
          If you are concerned about your account&apos;s safety, please contact our support team.
        </Text>
      </Section>
    </Base>
  )
}

PasswordResetEmail.PreviewProps = {
  resetLink: 'https://example.com/auth/reset-password?token=abc123def456',
  preview: 'Reset your password',
} as PasswordResetEmailProps

export default PasswordResetEmail
