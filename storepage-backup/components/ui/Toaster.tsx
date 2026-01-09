'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster(): React.JSX.Element {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'font-inter',
          title: 'font-medium text-[14px] leading-[140%] tracking-[-0.28px]',
          description: 'text-[12px] leading-[150%] tracking-[-0.24px]',
          actionButton: 'bg-black text-white hover:bg-black/80',
          cancelButton: 'bg-[#F5F5F5] text-black hover:bg-[#E3E3E3]',
          closeButton: 'bg-white border-[#E3E3E3]',
        },
      }}
    />
  )
}
