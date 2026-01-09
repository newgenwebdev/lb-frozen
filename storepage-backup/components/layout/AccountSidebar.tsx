'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCustomer } from '@/lib/context/CustomerContext'

export const AccountSidebar = (): React.JSX.Element => {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useCustomer()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const isActive = (path: string): boolean => {
    return pathname === path
  }

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true)
    try {
      await logout()
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to log out')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <aside className="w-full lg:w-64 lg:shrink-0">
      <nav className="flex max-sm:flex-row flex-col gap-4">
        {/* Order History Link */}
        <Link
          href="/account/orders"
          className={`font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-70 ${
            isActive('/account/orders') ? 'underline' : ''
          }`}
        >
          Order history
        </Link>

        {/* Membership Link */}
        <Link
          href="/account/membership"
          className={`font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-70 ${
            isActive('/account/membership') ? 'underline' : ''
          }`}
        >
          Membership
        </Link>

        {/* Profile Settings Link */}
        <Link
          href="/account"
          className={`font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-70 ${
            isActive('/account') ? 'underline' : ''
          }`}
        >
          Profile settings
        </Link>

        {/* Log Out Link */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-left font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black transition-opacity hover:opacity-70 disabled:opacity-50"
        >
          {isLoggingOut ? 'Logging out...' : 'Log out'}
        </button>
      </nav>
    </aside>
  )
}
