'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getAll, getCitiesByState, getPostcodesByCity } from 'npm-malaysia-postcodes'
import { useCustomer } from '@/lib/context/CustomerContext'

type EditField = 'fullName' | 'email' | 'shippingAddress' | 'phoneNumber' | 'password' | 'birthDate' | null

type SupportedCountry = 'Malaysia' | 'Singapore'

type ShippingAddress = {
  country: SupportedCountry
  address: string
  apartment: string
  state: string // Used for Malaysia only
  city: string
  postalCode: string
}

// Supported countries configuration
const SUPPORTED_COUNTRIES: { value: SupportedCountry; label: string; code: string }[] = [
  { value: 'Malaysia', label: 'Malaysia', code: 'my' },
  { value: 'Singapore', label: 'Singapore', code: 'sg' },
]

// Phone country codes configuration
const PHONE_COUNTRY_CODES: { code: string; label: string; maxDigits: number }[] = [
  { code: '+65', label: 'Singapore (+65)', maxDigits: 8 },
  { code: '+60', label: 'Malaysia (+60)', maxDigits: 11 },
  { code: '+62', label: 'Indonesia (+62)', maxDigits: 12 },
  { code: '+63', label: 'Philippines (+63)', maxDigits: 10 },
  { code: '+66', label: 'Thailand (+66)', maxDigits: 9 },
  { code: '+84', label: 'Vietnam (+84)', maxDigits: 10 },
  { code: '+91', label: 'India (+91)', maxDigits: 10 },
  { code: '+86', label: 'China (+86)', maxDigits: 11 },
  { code: '+81', label: 'Japan (+81)', maxDigits: 10 },
  { code: '+82', label: 'South Korea (+82)', maxDigits: 10 },
]

export default function AccountPage(): React.JSX.Element {
  const router = useRouter()
  const {
    customer,
    isAuthenticated,
    isLoading: authLoading,
    updateProfile,
    resetPassword,
    addresses,
    loadAddresses,
    addAddress,
    updateAddress,
  } = useCustomer()

  const [editingField, setEditingField] = useState<EditField>(null)

  // Name editing states
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  // Phone editing state
  const [editPhone, setEditPhone] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+65')
  const [phoneCodeDropdownOpen, setPhoneCodeDropdownOpen] = useState(false)
  const phoneCodeDropdownRef = useRef<HTMLDivElement>(null)

  // Password reset flow
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Birth date editing state
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')

  // Loading states
  const [isUpdating, setIsUpdating] = useState(false)

  const [shippingAddressData, setShippingAddressData] = useState<ShippingAddress>({
    country: 'Singapore',
    address: '',
    apartment: '',
    state: '',
    city: 'Singapore',
    postalCode: '',
  })

  // Get available states, cities, and postcodes
  const [availableStates, setAvailableStates] = useState<string[]>([])
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [availablePostcodes, setAvailablePostcodes] = useState<string[]>([])

  // Dropdown open states
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false)
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const [postcodeDropdownOpen, setPostcodeDropdownOpen] = useState(false)

  // Dropdown refs for outside click detection
  const countryDropdownRef = useRef<HTMLDivElement>(null)
  const stateDropdownRef = useRef<HTMLDivElement>(null)
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  const postcodeDropdownRef = useRef<HTMLDivElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/account')
    }
  }, [authLoading, isAuthenticated, router])

  // Load addresses when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses()
    }
  }, [isAuthenticated, loadAddresses])

  useEffect(() => {
    // Load all states when component mounts
    const allData = getAll()
    if (allData && allData.state && Array.isArray(allData.state)) {
      const states = allData.state.map((state: { name: string }) => state.name)
      setAvailableStates(states)
    }
  }, [])

  useEffect(() => {
    // Load cities when state changes
    if (shippingAddressData.state) {
      const cities = getCitiesByState(shippingAddressData.state)
      if (cities && Array.isArray(cities)) {
        setAvailableCities(cities)
      }
      // Reset city and postcode when state changes
      setShippingAddressData((prev) => ({ ...prev, city: '', postalCode: '' }))
      setAvailablePostcodes([])
    }
  }, [shippingAddressData.state])

  useEffect(() => {
    // Load postcodes when city changes
    if (shippingAddressData.state && shippingAddressData.city) {
      const postcodes = getPostcodesByCity(shippingAddressData.state, shippingAddressData.city)
      if (postcodes && Array.isArray(postcodes)) {
        setAvailablePostcodes(postcodes)
      }
      // Reset postcode when city changes
      setShippingAddressData((prev) => ({ ...prev, postalCode: '' }))
    }
  }, [shippingAddressData.city])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false)
      }
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setStateDropdownOpen(false)
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setCityDropdownOpen(false)
      }
      if (postcodeDropdownRef.current && !postcodeDropdownRef.current.contains(event.target as Node)) {
        setPostcodeDropdownOpen(false)
      }
      if (phoneCodeDropdownRef.current && !phoneCodeDropdownRef.current.contains(event.target as Node)) {
        setPhoneCodeDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get customer data
  const fullName = customer
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Not set'
    : 'Loading...'
  const email = customer?.email || 'Loading...'
  const phone = customer?.phone || 'Not set'

  // Get birth date from metadata
  const birthDateValue = customer?.metadata?.birth_date as string | undefined
  const formattedBirthDate = birthDateValue
    ? new Date(birthDateValue).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Not set'

  // Get default shipping address
  const defaultAddress = addresses.find(
    (addr) => addr.is_default_shipping
  ) || addresses[0]

  const formattedAddress = defaultAddress
    ? [
        defaultAddress.address_1,
        defaultAddress.address_2,
        defaultAddress.city,
        defaultAddress.province,
        defaultAddress.postal_code,
        defaultAddress.country_code?.toUpperCase(),
      ]
        .filter(Boolean)
        .join(', ')
    : 'Not set'

  const openEditModal = (field: EditField): void => {
    if (field === 'fullName') {
      setFirstName(customer?.first_name || '')
      setLastName(customer?.last_name || '')
    } else if (field === 'phoneNumber') {
      // Parse existing phone to extract country code and number
      const phone = customer?.phone || ''
      let foundCode = '+65' // Default to Singapore
      let phoneNumber = phone

      // Try to match against known country codes (sorted by length desc to match longer codes first)
      const sortedCodes = [...PHONE_COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
      for (const countryCode of sortedCodes) {
        if (phone.startsWith(countryCode.code)) {
          foundCode = countryCode.code
          phoneNumber = phone.slice(countryCode.code.length)
          break
        }
      }

      setPhoneCountryCode(foundCode)
      setEditPhone(phoneNumber)
    } else if (field === 'shippingAddress') {
      // Determine country from saved address country_code
      let country: SupportedCountry = 'Singapore' // Default to Singapore
      if (defaultAddress?.country_code) {
        const code = defaultAddress.country_code.toLowerCase()
        if (code === 'my') country = 'Malaysia'
        else if (code === 'sg') country = 'Singapore'
      }

      setShippingAddressData({
        country,
        address: defaultAddress?.address_1 || '',
        apartment: defaultAddress?.address_2 || '',
        state: defaultAddress?.province || '',
        city: defaultAddress?.city || 'Singapore',
        postalCode: defaultAddress?.postal_code || '',
      })
    } else if (field === 'birthDate') {
      // Parse existing birth date from metadata
      if (birthDateValue) {
        const date = new Date(birthDateValue)
        setBirthDay(date.getDate().toString())
        setBirthMonth((date.getMonth() + 1).toString())
        setBirthYear(date.getFullYear().toString())
      } else {
        setBirthDay('')
        setBirthMonth('')
        setBirthYear('')
      }
    }
    setEditingField(field)
  }

  const closeEditModal = (): void => {
    setEditingField(null)
    setFirstName('')
    setLastName('')
    setEditPhone('')
    setPhoneCountryCode('+65')
    setPhoneCodeDropdownOpen(false)
    setShowSuccessMessage(false)
    setBirthDay('')
    setBirthMonth('')
    setBirthYear('')
    setShippingAddressData({
      country: 'Singapore',
      address: '',
      apartment: '',
      state: '',
      city: 'Singapore',
      postalCode: '',
    })
  }

  const handleUpdate = async (): Promise<void> => {
    setIsUpdating(true)

    try {
      if (editingField === 'fullName') {
        const success = await updateProfile({
          first_name: firstName,
          last_name: lastName,
        })
        if (success) {
          toast.success('Name updated successfully')
          closeEditModal()
        } else {
          toast.error('Failed to update name')
        }
      } else if (editingField === 'phoneNumber') {
        // Format phone with selected country code
        const cleanPhone = editPhone.replace(/\s/g, '') // Remove spaces
        const formattedPhone = cleanPhone ? `${phoneCountryCode}${cleanPhone}` : ''

        const success = await updateProfile({
          phone: formattedPhone,
        })
        if (success) {
          toast.success('Phone number updated successfully')
          closeEditModal()
        } else {
          toast.error('Failed to update phone number')
        }
      } else if (editingField === 'shippingAddress') {
        // Get country code from configuration
        const countryConfig = SUPPORTED_COUNTRIES.find(c => c.value === shippingAddressData.country)
        const countryCode = countryConfig?.code || 'sg'

        // For Singapore, city is always "Singapore" and no state/province
        const addressData = {
          first_name: customer?.first_name || '',
          last_name: customer?.last_name || '',
          address_1: shippingAddressData.address,
          address_2: shippingAddressData.apartment || undefined,
          city: shippingAddressData.country === 'Singapore' ? 'Singapore' : shippingAddressData.city,
          province: shippingAddressData.country === 'Singapore' ? '' : shippingAddressData.state,
          postal_code: shippingAddressData.postalCode,
          country_code: countryCode,
          is_default_shipping: true,
        }

        let success: boolean
        if (defaultAddress) {
          // Update existing address
          success = await updateAddress(defaultAddress.id, addressData)
        } else {
          // Add new address
          success = await addAddress(addressData)
        }

        if (success) {
          toast.success('Address updated successfully')
          closeEditModal()
        } else {
          toast.error('Failed to update address')
        }
      } else if (editingField === 'birthDate') {
        // Validate birth date fields
        const day = parseInt(birthDay, 10)
        const month = parseInt(birthMonth, 10)
        const year = parseInt(birthYear, 10)

        if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
          toast.error('Please enter a valid date of birth')
          setIsUpdating(false)
          return
        }

        // Create ISO date string (YYYY-MM-DD)
        const birthDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`

        // Validate the date is real (e.g., not Feb 30)
        const dateObj = new Date(birthDate)
        if (dateObj.getDate() !== day || dateObj.getMonth() + 1 !== month || dateObj.getFullYear() !== year) {
          toast.error('Please enter a valid date of birth')
          setIsUpdating(false)
          return
        }

        const success = await updateProfile({
          metadata: {
            ...customer?.metadata,
            birth_date: birthDate,
          },
        })
        if (success) {
          toast.success('Date of birth updated successfully')
          closeEditModal()
        } else {
          toast.error('Failed to update date of birth')
        }
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('An error occurred while updating')
    } finally {
      setIsUpdating(false)
    }
  }

  const getFieldLabel = (field: EditField): string => {
    switch (field) {
      case 'fullName':
        return 'Full name'
      case 'email':
        return 'Email address'
      case 'shippingAddress':
        return 'Shipping address'
      case 'phoneNumber':
        return 'Phone number'
      case 'password':
        return 'Password'
      case 'birthDate':
        return 'Date of birth'
      default:
        return ''
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 animate-spin text-black" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="font-inter text-[14px] text-black">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Full Name Box */}
        <button
          onClick={() => openEditModal('fullName')}
          className="flex cursor-pointer flex-col justify-center gap-4 rounded-lg border border-[#E3E3E3] bg-white p-12 text-left transition-colors hover:border-black"
        >
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
            Full name
          </p>
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
            {fullName}
          </p>
        </button>

        {/* Email Address Box - Read Only */}
        <div
          className="flex flex-col justify-center gap-4 rounded-lg border border-[#E3E3E3] bg-white p-12 text-left opacity-60"
          title="Email cannot be changed"
        >
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
            Email address
          </p>
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
            {email}
          </p>
        </div>

        {/* Shipping Address Box */}
        <button
          onClick={() => openEditModal('shippingAddress')}
          className="flex cursor-pointer flex-col justify-center gap-4 rounded-lg border border-[#E3E3E3] bg-white p-12 text-left transition-colors hover:border-black"
        >
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
            Shipping address
          </p>
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
            {formattedAddress}
          </p>
        </button>

        {/* Phone Number Box */}
        <button
          onClick={() => openEditModal('phoneNumber')}
          className="flex cursor-pointer flex-col justify-center gap-4 rounded-lg border border-[#E3E3E3] bg-white p-12 text-left transition-colors hover:border-black"
        >
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
            Phone number
          </p>
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
            {phone}
          </p>
        </button>

        {/* Password Box */}
        <button
          onClick={() => openEditModal('password')}
          className="flex cursor-pointer flex-col justify-center gap-4 rounded-lg border border-[#E3E3E3] bg-white p-12 text-left transition-colors hover:border-black lg:col-span-1"
        >
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
            Password
          </p>
          <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
            ****************
          </p>
        </button>

        {/* Date of Birth Box - Can only be set once */}
        {birthDateValue ? (
          /* Read-only state when DOB is already set */
          <div
            className="flex flex-col justify-center gap-4 rounded-lg border border-[#E3E3E3] bg-white p-12 text-left opacity-60 lg:col-span-1"
            title="Date of birth can only be set once"
          >
            <div className="flex items-center gap-2">
              <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
                Date of birth
              </p>
              <svg className="h-4 w-4 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
              {formattedBirthDate}
            </p>
          </div>
        ) : (
          /* Editable state when DOB is not set */
          <button
            onClick={() => openEditModal('birthDate')}
            className="flex cursor-pointer flex-col justify-center gap-4 rounded-lg border border-[#E3E3E3] bg-white p-12 text-left transition-colors hover:border-black lg:col-span-1"
          >
            <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-[#999]">
              Date of birth
            </p>
            <p className="font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black">
              {formattedBirthDate}
            </p>
          </button>
        )}
      </div>

      {/* Edit Modal */}
      {editingField && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeEditModal}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Modal */}
          <div className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-8 shadow-lg">
            {/* Close Button */}
            <button
              onClick={closeEditModal}
              className="absolute right-6 top-6 cursor-pointer text-2xl text-black transition-opacity hover:opacity-70"
              aria-label="Close"
            >
              ×
            </button>

            {/* Modal Title */}
            <h2 className="mb-6 font-inter text-[24px] font-medium leading-[100%] tracking-[-0.48px] text-black">
              {showSuccessMessage ? 'Reset link sent'
                : editingField === 'password' ? 'Reset password'
                : `Edit ${getFieldLabel(editingField).toLowerCase()}`}
            </h2>

            {/* Shipping Address Fields */}
            {editingField === 'shippingAddress' ? (
              <div className="mb-6 space-y-4">
                {/* Country/Region Dropdown */}
                <div className="space-y-2">
                  <label
                    htmlFor="country"
                    className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                  >
                    Country/region
                  </label>
                  <div ref={countryDropdownRef} className="relative w-full">
                    <button
                      type="button"
                      onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                      className="flex w-full cursor-pointer items-center justify-between border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors focus:border-black"
                    >
                      <span className="text-black">{shippingAddressData.country}</span>
                      <svg
                        className={`h-4 w-4 text-black transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {countryDropdownOpen && (
                      <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto border border-[#E3E3E3] bg-white shadow-lg">
                        {SUPPORTED_COUNTRIES.map((country) => (
                          <li
                            key={country.value}
                            onClick={() => {
                              setShippingAddressData({
                                ...shippingAddressData,
                                country: country.value,
                                // Reset location fields when country changes
                                state: '',
                                city: country.value === 'Singapore' ? 'Singapore' : '',
                                postalCode: '',
                              })
                              setCountryDropdownOpen(false)
                            }}
                            className="cursor-pointer px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-gray-100"
                          >
                            {country.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Address - Different placeholder based on country */}
                <div className="space-y-2">
                  <label
                    htmlFor="address"
                    className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                  >
                    {shippingAddressData.country === 'Singapore' ? 'Block and street name' : 'Address'}
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={shippingAddressData.address}
                    onChange={(e) =>
                      setShippingAddressData({ ...shippingAddressData, address: e.target.value })
                    }
                    placeholder={shippingAddressData.country === 'Singapore' ? 'e.g., 11 Orchard Turn' : 'Street address'}
                    className="w-full border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors placeholder:text-[#999] focus:border-black"
                  />
                </div>

                {/* Unit/Apartment - Different label based on country */}
                <div className="space-y-2">
                  <label
                    htmlFor="apartment"
                    className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                  >
                    {shippingAddressData.country === 'Singapore' ? 'Unit number (optional)' : 'Apartment, suite, etc (optional)'}
                  </label>
                  <input
                    id="apartment"
                    type="text"
                    value={shippingAddressData.apartment}
                    onChange={(e) =>
                      setShippingAddressData({ ...shippingAddressData, apartment: e.target.value })
                    }
                    placeholder={shippingAddressData.country === 'Singapore' ? 'e.g., #01-13' : 'Apartment, suite, etc'}
                    className="w-full border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors placeholder:text-[#999] focus:border-black"
                  />
                </div>

                {/* Conditional fields based on country */}
                {shippingAddressData.country === 'Singapore' ? (
                  /* Singapore: Just postal code (6 digits, no state/city selection needed) */
                  <div className="space-y-2">
                    <label
                      htmlFor="postalCode"
                      className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                    >
                      Postal code
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={shippingAddressData.postalCode}
                      onChange={(e) => {
                        // Only allow numeric input
                        const value = e.target.value.replace(/\D/g, '')
                        setShippingAddressData({ ...shippingAddressData, postalCode: value })
                      }}
                      placeholder="e.g., 238800"
                      className="w-full border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors placeholder:text-[#999] focus:border-black"
                    />
                    <p className="font-inter text-[12px] text-[#999]">
                      Singapore postal codes are 6 digits
                    </p>
                  </div>
                ) : (
                  /* Malaysia: State → City → Postal Code dropdowns */
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* State */}
                    <div className="space-y-2">
                      <label
                        htmlFor="state"
                        className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                      >
                        State
                      </label>
                      <div ref={stateDropdownRef} className="relative w-full">
                        <button
                          type="button"
                          onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
                          className="flex w-full cursor-pointer items-center justify-between border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors focus:border-black"
                        >
                          <span className={shippingAddressData.state ? 'text-black' : 'text-[#999]'}>
                            {shippingAddressData.state || 'Select state'}
                          </span>
                          <svg
                            className={`h-4 w-4 text-black transition-transform ${stateDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {stateDropdownOpen && (
                          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto border border-[#E3E3E3] bg-white shadow-lg">
                            {availableStates.map((state) => (
                              <li
                                key={state}
                                onClick={() => {
                                  setShippingAddressData({ ...shippingAddressData, state })
                                  setStateDropdownOpen(false)
                                }}
                                className="cursor-pointer px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-gray-100"
                              >
                                {state}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                      <label
                        htmlFor="city"
                        className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                      >
                        City
                      </label>
                      <div ref={cityDropdownRef} className="relative w-full">
                        <button
                          type="button"
                          onClick={() => shippingAddressData.state && setCityDropdownOpen(!cityDropdownOpen)}
                          disabled={!shippingAddressData.state}
                          className="flex w-full cursor-pointer items-center justify-between border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className={shippingAddressData.city ? 'text-black' : 'text-[#999]'}>
                            {shippingAddressData.city || 'Select city'}
                          </span>
                          <svg
                            className={`h-4 w-4 text-black transition-transform ${cityDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {cityDropdownOpen && (
                          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto border border-[#E3E3E3] bg-white shadow-lg">
                            {availableCities.map((city) => (
                              <li
                                key={city}
                                onClick={() => {
                                  setShippingAddressData({ ...shippingAddressData, city })
                                  setCityDropdownOpen(false)
                                }}
                                className="cursor-pointer px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-gray-100"
                              >
                                {city}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Postal Code */}
                    <div className="space-y-2">
                      <label
                        htmlFor="postalCode"
                        className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                      >
                        Postal code
                      </label>
                      <div ref={postcodeDropdownRef} className="relative w-full">
                        <button
                          type="button"
                          onClick={() => shippingAddressData.city && setPostcodeDropdownOpen(!postcodeDropdownOpen)}
                          disabled={!shippingAddressData.city}
                          className="flex w-full cursor-pointer items-center justify-between border border-[#E3E3E3] bg-white px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className={shippingAddressData.postalCode ? 'text-black' : 'text-[#999]'}>
                            {shippingAddressData.postalCode || 'Select postal code'}
                          </span>
                          <svg
                            className={`h-4 w-4 text-black transition-transform ${postcodeDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {postcodeDropdownOpen && (
                          <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto border border-[#E3E3E3] bg-white shadow-lg">
                            {availablePostcodes.map((postcode) => (
                              <li
                                key={postcode}
                                onClick={() => {
                                  setShippingAddressData({ ...shippingAddressData, postalCode: postcode })
                                  setPostcodeDropdownOpen(false)
                                }}
                                className="cursor-pointer px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-gray-100"
                              >
                                {postcode}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : editingField === 'password' && !showSuccessMessage ? (
              /* Reset Password Form */
              <div className="mb-6 space-y-4">
                <p className="font-inter text-[14px] font-normal leading-[140%] text-[#999]">
                  We&apos;ll send a password reset link to your email address.
                </p>
                <div className="space-y-2">
                  <label
                    htmlFor="resetEmail"
                    className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                  >
                    Email address
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    value={customer?.email || ''}
                    disabled
                    className="w-full border border-[#E3E3E3] bg-[#F5F5F5] px-4 py-3 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-[#666] outline-none"
                  />
                </div>
              </div>
            ) : showSuccessMessage ? (
              /* Success Message */
              <div className="mb-6">
                <p className="font-inter text-[14px] font-normal leading-[140%] text-[#999]">
                  Please check your email. Instructions for password reset will be dispatched shortly.
                </p>
              </div>
            ) : editingField === 'fullName' ? (
              /* Full Name - Split into First & Last Name */
              <div className="mb-6 space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="firstName"
                    className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                  >
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-[#E3E3E3] bg-white px-4 py-4 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors focus:border-black"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="lastName"
                    className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                  >
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-[#E3E3E3] bg-white px-4 py-4 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors focus:border-black"
                  />
                </div>
              </div>
            ) : editingField === 'phoneNumber' ? (
              /* Phone Number */
              <div className="mb-6 space-y-2">
                <label
                  htmlFor="editPhone"
                  className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                >
                  Phone number
                </label>
                <div className="flex">
                  {/* Country Code Dropdown */}
                  <div ref={phoneCodeDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setPhoneCodeDropdownOpen(!phoneCodeDropdownOpen)}
                      className="flex h-full cursor-pointer items-center gap-2 rounded-l-xl border border-r-0 border-[#E3E3E3] bg-[#F5F5F5] px-4 py-4 transition-colors hover:bg-[#EBEBEB]"
                    >
                      <span className="font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black">
                        {phoneCountryCode}
                      </span>
                      <svg
                        className={`h-4 w-4 text-black transition-transform ${phoneCodeDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {phoneCodeDropdownOpen && (
                      <ul className="absolute left-0 z-50 mt-1 max-h-60 w-56 overflow-auto rounded-lg border border-[#E3E3E3] bg-white shadow-lg">
                        {PHONE_COUNTRY_CODES.map((country) => (
                          <li
                            key={country.code}
                            onClick={() => {
                              setPhoneCountryCode(country.code)
                              setPhoneCodeDropdownOpen(false)
                              // Clear phone if switching countries (different max digits)
                              setEditPhone('')
                            }}
                            className={`cursor-pointer px-4 py-3 font-inter text-[14px] font-normal leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-gray-100 ${
                              phoneCountryCode === country.code ? 'bg-gray-50' : ''
                            }`}
                          >
                            {country.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Phone Input */}
                  <input
                    id="editPhone"
                    type="tel"
                    inputMode="numeric"
                    value={editPhone}
                    onChange={(e) => {
                      // Remove non-numeric characters except spaces
                      const value = e.target.value.replace(/[^\d\s]/g, '')
                      // Get max digits for selected country code
                      const countryConfig = PHONE_COUNTRY_CODES.find(c => c.code === phoneCountryCode)
                      const maxDigits = countryConfig?.maxDigits || 15
                      // Limit to max digits for the country
                      if (value.replace(/\s/g, '').length <= maxDigits) {
                        setEditPhone(value)
                      }
                    }}
                    placeholder={phoneCountryCode === '+65' ? '9123 4567' : 'Enter phone number'}
                    className="w-full rounded-r-xl border border-[#E3E3E3] bg-white px-4 py-4 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors focus:border-black"
                  />
                </div>
                <p className="font-inter text-[12px] text-[#999]">
                  {(() => {
                    const countryConfig = PHONE_COUNTRY_CODES.find(c => c.code === phoneCountryCode)
                    return countryConfig
                      ? `Enter up to ${countryConfig.maxDigits} digits for ${countryConfig.label.split(' (')[0]}`
                      : 'Enter your phone number'
                  })()}
                </p>
              </div>
            ) : editingField === 'birthDate' ? (
              /* Date of Birth Fields */
              <div className="mb-6 space-y-4">
                <p className="font-inter text-[14px] font-normal leading-[140%] text-[#999]">
                  Enter your date of birth to receive special birthday rewards.
                </p>
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="font-inter text-[13px] font-medium leading-[140%] text-amber-800">
                    Please enter your date of birth carefully. This can only be set once and cannot be changed later.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Day */}
                  <div className="space-y-2">
                    <label
                      htmlFor="birthDay"
                      className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                    >
                      Day
                    </label>
                    <input
                      id="birthDay"
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={birthDay}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (parseInt(value, 10) <= 31 || value === '') {
                          setBirthDay(value)
                        }
                      }}
                      placeholder="DD"
                      className="w-full rounded-xl border border-[#E3E3E3] bg-white px-4 py-4 text-center font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors placeholder:text-[#999] focus:border-black"
                    />
                  </div>

                  {/* Month */}
                  <div className="space-y-2">
                    <label
                      htmlFor="birthMonth"
                      className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                    >
                      Month
                    </label>
                    <input
                      id="birthMonth"
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={birthMonth}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        if (parseInt(value, 10) <= 12 || value === '') {
                          setBirthMonth(value)
                        }
                      }}
                      placeholder="MM"
                      className="w-full rounded-xl border border-[#E3E3E3] bg-white px-4 py-4 text-center font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors placeholder:text-[#999] focus:border-black"
                    />
                  </div>

                  {/* Year */}
                  <div className="space-y-2">
                    <label
                      htmlFor="birthYear"
                      className="block font-inter text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-black"
                    >
                      Year
                    </label>
                    <input
                      id="birthYear"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={birthYear}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setBirthYear(value)
                      }}
                      placeholder="YYYY"
                      className="w-full rounded-xl border border-[#E3E3E3] bg-white px-4 py-4 text-center font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black outline-none transition-colors placeholder:text-[#999] focus:border-black"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            {showSuccessMessage ? (
              <button
                onClick={closeEditModal}
                className="w-full cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-white transition-colors hover:bg-white hover:text-black hover:ring-2 hover:ring-black"
              >
                Done
              </button>
            ) : editingField === 'password' ? (
              <div className="flex gap-4">
                {/* Send Reset Link Button */}
                <button
                  onClick={async () => {
                    setIsUpdating(true)
                    try {
                      const success = await resetPassword(customer?.email || '')
                      if (success) {
                        setShowSuccessMessage(true)
                        toast.success('Password reset link sent!')
                      } else {
                        toast.error('Failed to send reset link')
                      }
                    } catch (error) {
                      console.error('Reset password error:', error)
                      toast.error('An error occurred')
                    } finally {
                      setIsUpdating(false)
                    }
                  }}
                  disabled={isUpdating}
                  className="flex-1 cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-white transition-colors hover:bg-white hover:text-black hover:ring-2 hover:ring-black disabled:opacity-50"
                >
                  {isUpdating ? 'Sending...' : 'Send reset link'}
                </button>

                {/* Cancel Button */}
                <button
                  onClick={closeEditModal}
                  disabled={isUpdating}
                  className="flex-1 cursor-pointer rounded-full border border-black bg-white px-8 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                {/* Update Button */}
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex-1 cursor-pointer rounded-full bg-black px-8 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-white transition-colors hover:bg-white hover:text-black hover:ring-2 hover:ring-black disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Update'}
                </button>

                {/* Cancel Button */}
                <button
                  onClick={closeEditModal}
                  disabled={isUpdating}
                  className="flex-1 cursor-pointer rounded-full border border-black bg-white px-8 py-4 font-inter text-[16px] font-medium leading-[100%] tracking-[-0.32px] text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
