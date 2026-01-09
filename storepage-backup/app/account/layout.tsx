import React from 'react'
import { AccountSidebar } from '@/components/layout/AccountSidebar'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white px-4 py-12 pt-28 sm:px-6 lg:px-8">
      {/* Page Title */}
      <h1 className="mb-8 font-inter text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-black lg:mb-12">
        My account
      </h1>

      {/* Layout with Sidebar */}
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <AccountSidebar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
