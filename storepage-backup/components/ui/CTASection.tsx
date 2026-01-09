'use client'

import React, { useState } from 'react'

export const CTASection = (): React.JSX.Element => {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    // Handle email submission
    // TODO: Implement email subscription logic
    setEmail('')
  }

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 bg-[url(/homepage/homepage-cta.jpg)] bg-gray-300 bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative flex h-full items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <h2 className="mb-4 text-[40px] font-medium leading-[100%] tracking-[-2.4px] text-white">
            Subscribe for
            <br />
            exclusive deals
          </h2>

          <p className="mb-8 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white">
            Get exclusive access to the latest natural skincare deals and tips
            delivered straight to your inbox!
          </p>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
              <input
                type="email"
                id="email-subscription"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full border-b-2 border-white bg-transparent py-3 pr-12 text-[16px] font-medium leading-[100%] tracking-[-0.96px] text-white placeholder-white outline-none transition-colors focus:border-white/90"
                required
              />
              <button
                type="submit"
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-white transition-opacity hover:opacity-70"
                aria-label="Submit email"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <mask
                    id="mask0_25562_15185"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="16"
                    height="16"
                  >
                    <rect width="16" height="16" fill="#D9D9D9" />
                  </mask>
                  <g mask="url(#mask0_25562_15185)">
                    <path
                      d="M9.23083 11.7688L8.52817 11.0458L11.0743 8.49964H3V7.49964H11.0743L8.52817 4.95347L9.23083 4.23047L13 7.99964L9.23083 11.7688Z"
                      fill="white"
                    />
                  </g>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
