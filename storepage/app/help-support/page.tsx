"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProfileSidebar from "@/components/layout/ProfileSidebar";

export default function HelpSupportPage() {
  return (
    <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-8">
        <Link href="/" className="hover:text-gray-900">
          Home
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Profile & settings</span>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left Sidebar */}
        <ProfileSidebar activeMenu="Help and Support" />

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="border rounded-t-lg border-gray-200 p-6 mb-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Help and support
            </h2>
            <p className="text-sm text-gray-500">
              Get help with orders or matters related to Bartar
            </p>
          </div>

          {/* Contact Cards */}
          <div className="bg-white border-l border-r border-gray-200 p-6 mb-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Send Email Card */}
              <div className="border border-gray-200 rounded-lg p-6 flex gap-6">
                <div className="shrink-0">
                  <div className="relative">
                    {/* Illustration - Person with phone */}
                    <div className="w-24 h-24">
                      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Person */}
                        <ellipse cx="50" cy="75" rx="20" ry="8" fill="#E5E7EB" />
                        <path d="M35 55C35 55 35 45 40 40C42 38 45 35 50 35C55 35 58 38 60 40C65 45 65 55 65 55V70C65 70 60 75 50 75C40 75 35 70 35 70V55Z" fill="#4F46E5" />
                        {/* Head */}
                        <circle cx="50" cy="30" r="12" fill="#FCD9BD" />
                        {/* Hair */}
                        <path d="M38 28C38 22 42 18 50 18C58 18 62 22 62 28C62 30 61 32 60 33C58 27 55 25 50 25C45 25 42 27 40 33C39 32 38 30 38 28Z" fill="#1F2937" />
                        {/* Phone in hand */}
                        <rect x="55" y="48" width="12" height="20" rx="2" fill="#1F2937" />
                        <rect x="57" y="50" width="8" height="14" rx="1" fill="#60A5FA" />
                        {/* Chat bubble */}
                        <rect x="68" y="20" width="24" height="18" rx="4" fill="#FCD34D" />
                        <circle cx="75" cy="29" r="2" fill="#1F2937" />
                        <circle cx="81" cy="29" r="2" fill="#1F2937" />
                        <circle cx="87" cy="29" r="2" fill="#1F2937" />
                        <path d="M80 38L80 43L85 38Z" fill="#FCD34D" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Need help? Send us an email
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Got a question? Message us, we&apos;ll reply within 24 hours.
                  </p>
                  <Button 
                    className="text-white"
                    style={{
                      background: "linear-gradient(90deg, #7c3aed 0%, #c026d3 100%)",
                    }}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Send email
                  </Button>
                </div>
              </div>

              {/* Call Us Card */}
              <div className="border border-gray-200 rounded-lg p-6 flex gap-6">
                <div className="shrink-0">
                  <div className="relative">
                    {/* Illustration - Person with phone call */}
                    <div className="w-24 h-24">
                      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Person */}
                        <ellipse cx="50" cy="75" rx="20" ry="8" fill="#E5E7EB" />
                        <path d="M35 55C35 55 35 45 40 40C42 38 45 35 50 35C55 35 58 38 60 40C65 45 65 55 65 55V70C65 70 60 75 50 75C40 75 35 70 35 70V55Z" fill="#4F46E5" />
                        {/* Head */}
                        <circle cx="50" cy="30" r="12" fill="#FCD9BD" />
                        {/* Hair */}
                        <path d="M38 28C38 22 42 18 50 18C58 18 62 22 62 28C62 30 61 32 60 33C58 27 55 25 50 25C45 25 42 27 40 33C39 32 38 30 38 28Z" fill="#1F2937" />
                        {/* Large Phone */}
                        <rect x="58" y="40" width="20" height="32" rx="3" fill="#4F46E5" />
                        <rect x="60" y="43" width="16" height="24" rx="2" fill="#60A5FA" />
                        <circle cx="68" cy="70" r="2" fill="#E5E7EB" />
                        {/* Shine effect */}
                        <path d="M78 25L82 20L85 25L82 27Z" fill="#FCD34D" />
                        <path d="M80 32L83 28L86 32L83 34Z" fill="#FCD34D" />
                        <path d="M75 35L78 31L81 35L78 37Z" fill="#FCD34D" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Prefer to talk? Give us a call
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Our customer service line is open from Mon–Fri, 9AM–6PM (GMT+7).
                  </p>
                  <Button 
                    className="text-white"
                    style={{
                      background: "linear-gradient(90deg, #7c3aed 0%, #c026d3 100%)",
                    }}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    Call now
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white border-l border-r border-b rounded-b-lg border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  What is your category of difficulty?
                </h3>
                <p className="text-sm text-gray-500">
                  Find answers to frequently asked questions that may help you.
                </p>
              </div>
              <div className="relative w-64">
                <Input
                  type="text"
                  placeholder="Search FAQ Category"
                  className="pr-10"
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Account */}
              <div 
                className="border border-gray-200 rounded-lg p-6"
                style={{
                  background: "linear-gradient(to bottom, #EBF0FEB2, #EBF0FE00)",
                }}
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Account</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Billing, security, access control, and more account management features.
                </p>
                <Button variant="outline" className="w-full text-gray-700 border-gray-300 hover:bg-gray-50">
                  View all
                </Button>
              </div>

              {/* Orders */}
              <div 
                className="border border-gray-200 rounded-lg p-6"
                style={{
                  background: "linear-gradient(to bottom, #EBF0FEB2, #EBF0FE00)",
                }}
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Orders</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Order placement, tracking, cancellation, and order history management.
                </p>
                <Button variant="outline" className="w-full text-gray-700 border-gray-300 hover:bg-gray-50">
                  View all
                </Button>
              </div>

              {/* Shipping & Delivery */}
              <div 
                className="border border-gray-200 rounded-lg p-6"
                style={{
                  background: "linear-gradient(to bottom, #EBF0FEB2, #EBF0FE00)",
                }}
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Shipping & Delivery</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Shipping options, estimated delivery time, and tracking details.
                </p>
                <Button variant="outline" className="w-full text-gray-700 border-gray-300 hover:bg-gray-50">
                  View all
                </Button>
              </div>

              {/* Payment & Billing */}
              <div 
                className="border border-gray-200 rounded-lg p-6"
                style={{
                  background: "linear-gradient(to bottom, #EBF0FEB2, #EBF0FE00)",
                }}
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Payment & Billing</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Accepted payment methods, failed payments, and refund process.
                </p>
                <Button variant="outline" className="w-full text-gray-700 border-gray-300 hover:bg-gray-50">
                  View all
                </Button>
              </div>

              {/* Returns */}
              <div 
                className="border border-gray-200 rounded-lg p-6"
                style={{
                  background: "linear-gradient(to bottom, #EBF0FEB2, #EBF0FE00)",
                }}
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Returns</h4>
                <p className="text-sm text-gray-500 mb-4">
                  All about the return policy, process, and refund timeline. Can help for future.
                </p>
                <Button variant="outline" className="w-full text-gray-700 border-gray-300 hover:bg-gray-50">
                  View all
                </Button>
              </div>

              {/* Technical Support */}
              <div 
                className="border border-gray-200 rounded-lg p-6"
                style={{
                  background: "linear-gradient(to bottom, #EBF0FEB2, #EBF0FE00)",
                }}
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Technical Support</h4>
                <p className="text-sm text-gray-500 mb-4">
                  The FAQ for our app, website, and login troubleshooting.
                </p>
                <Button variant="outline" className="w-full text-gray-700 border-gray-300 hover:bg-gray-50">
                  View all
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
