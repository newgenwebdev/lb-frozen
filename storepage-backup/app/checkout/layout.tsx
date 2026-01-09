import { StripeProvider } from '@/lib/context/StripeContext'
import { CheckoutProvider } from '@/lib/context/CheckoutContext'

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <StripeProvider>
      <CheckoutProvider>
        {children}
      </CheckoutProvider>
    </StripeProvider>
  )
}
