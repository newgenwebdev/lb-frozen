// @ts-nocheck - Ignore React 18/19 type conflicts with @react-email/components
import { Html, Body, Container, Preview, Tailwind, Head, Img, Section, Text } from '@react-email/components'
import * as React from 'react'
import { EMAIL_LOGO_URL } from '../../../lib/constants'

interface BaseProps {
  preview?: string
  children: React.ReactNode
}

export const Base: React.FC<BaseProps> = ({ preview, children }) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#f6f6f6] my-auto mx-auto font-sans py-[40px] px-2">
          <Container className="bg-white border border-solid border-[#eaeaea] rounded-lg my-0 mx-auto p-[40px] max-w-[500px] w-full overflow-hidden">
            <Section className="text-center mb-[32px]">
              {EMAIL_LOGO_URL ? (
                <Img
                  src={EMAIL_LOGO_URL}
                  width="180"
                  alt="King Jess"
                  className="mx-auto"
                  style={{ height: 'auto' }}
                />
              ) : (
                <Text className="text-black text-[24px] font-bold tracking-[-1px] mt-0 mb-0">
                  KING JESS
                </Text>
              )}
            </Section>
            <div className="max-w-full break-words">
              {children}
            </div>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
