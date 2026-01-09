"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AddAddressDialog } from "@/components/AddAddressDialog";
import { CheckoutStepper } from "@/components/shared/CheckoutStepper";
import { OrderSummary } from "@/components/shared/OrderSummary";
import { useAuthContext } from "@/lib/AuthContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { customer, loading } = useAuthContext();
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [shippingMethod, setShippingMethod] = useState("shipping");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !customer) {
      router.push("/login");
    }
  }, [loading, customer, router]);

  // Get customer name for display
  const customerName = customer 
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "User"
    : "Guest";

  const cartItems = [
    {
      id: 1,
      name: "Frozen Beef Striploin",
      price: 45.99,
      originalPrice: 55.99,
      quantity: 1,
    },
    {
      id: 2,
      name: "Frozen Chicken Breast",
      price: 12.99,
      originalPrice: 15.99,
      quantity: 2,
    },
    {
      id: 3,
      name: "Frozen Salmon Fillet",
      price: 28.5,
      originalPrice: 32.5,
      quantity: 1,
    },
  ];

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const savings = cartItems.reduce(
    (sum, item) => sum + (item.originalPrice - item.price) * item.quantity,
    0
  );
  const shippingCost =
    selectedShipping === "standard"
      ? 0
      : selectedShipping === "express"
      ? 5.99
      : 12.99;
  const estimatedTotal = subtotal + shippingCost;

  const handleProceedToPayment = () => {
    router.push("/payment");
  };

  return (
    <div className="relative">
      {/* Content */}
      <div className="relative mx-auto pt-4 lg:pt-8 px-4 lg:px-0">
        {/* Progress Steps */}
        <CheckoutStepper currentStep="shipping" />

        {/* Horizontal Border after steps */}
        <div className="border-t border-gray-200"></div>

        {/* Main content grid with borders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:pr-6">
          {/* Left Column - Checkout Details */}
          <div className="lg:col-span-2 lg:border-r border-gray-200 pt-4 lg:pt-8 lg:px-10">
            {/* Shipping/Pickup Toggle */}
            <div className="flex gap-3 lg:gap-4 mb-6 lg:mb-8">
              <button
                onClick={() => setShippingMethod("shipping")}
                className={`flex-1 py-3 lg:py-4 px-4 lg:px-6 rounded-xl border transition-colors ${
                  shippingMethod === "shipping"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 lg:w-5 lg:h-5"
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
                  <span className="font-medium text-sm lg:text-base">Shipping</span>
                </div>
              </button>
              <button
                onClick={() => setShippingMethod("pickup")}
                className={`flex-1 py-3 lg:py-4 px-4 lg:px-6 rounded-xl border transition-colors ${
                  shippingMethod === "pickup"
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 lg:w-5 lg:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <span className="font-medium text-sm lg:text-base">Pickup</span>
                </div>
              </button>
            </div>

            {/* Shipping Type */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">
                Shipping type
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
                {/* Standard Shipping */}
                <button
                  onClick={() => setSelectedShipping("standard")}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    selectedShipping === "standard"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <svg
                      className="w-5 h-5 mt-0.5"
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
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1 text-sm lg:text-base">
                        Standard Shipping
                      </div>
                      <div className="text-xs lg:text-sm text-gray-600">
                        5-7 business days
                      </div>
                    </div>
                  </div>
                  <div className="text-base lg:text-lg font-bold text-gray-900">
                    RM0.00 (Free)
                  </div>
                </button>

                {/* Express Shipping */}
                <button
                  onClick={() => setSelectedShipping("express")}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    selectedShipping === "express"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <svg
                      className="w-5 h-5 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1 text-sm lg:text-base">
                        Express Shipping
                      </div>
                      <div className="text-xs lg:text-sm text-gray-600">
                        1-3 business days
                      </div>
                    </div>
                  </div>
                  <div className="text-base lg:text-lg font-bold text-gray-900">+RM5.99</div>
                </button>

                {/* Same-Day Delivery */}
                <button
                  onClick={() => setSelectedShipping("sameday")}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    selectedShipping === "sameday"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <svg
                      className="w-5 h-5 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1 text-sm lg:text-base">
                        Same-Day Delivery
                      </div>
                      <div className="text-xs lg:text-sm text-gray-600">
                        orders before 12:00 pm
                      </div>
                    </div>
                  </div>
                  <div className="text-base lg:text-lg font-bold text-gray-900">
                    +RM12.99
                  </div>
                </button>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">
                  Select shipping address
                </h2>
                <AddAddressDialog />
              </div>

              {/* Default Address */}
              <div className="border border-blue-600 rounded-xl p-4 lg:p-6 mb-3 lg:mb-4 bg-blue-50">
                <div className="flex items-start justify-between mb-3 lg:mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900 text-sm lg:text-base">
                        {customerName}
                      </span>
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                        Default
                      </span>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    <span className="text-sm">Edit</span>
                  </button>
                </div>
                <div className="text-gray-700 mb-3">
                  <div>12 Jalan Sultan Ismail, Bukit Bintang, 50450</div>
                  <div>Kuala Lumpur, Malaysia</div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg
                    className="w-4 h-4"
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
                  <span className="text-sm">(+60) 12-345 6789</span>
                </div>
              </div>

              {/* Office Address */}
              <div className="border border-gray-200 rounded-xl p-4 lg:p-6">
                <div className="flex items-start justify-between mb-3 lg:mb-4">
                  <div>
                    <div className="font-bold text-gray-900 mb-2 text-sm lg:text-base">
                      Office Address
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    <span className="text-xs lg:text-sm">Edit</span>
                  </button>
                </div>
                <div className="text-gray-700 mb-3 text-sm lg:text-base">
                  <div>45 Jalan Titiwangsa, Titiwangsa, 53200 Kuala</div>
                  <div>Lumpur, Malaysia</div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg
                    className="w-4 h-4"
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
                  <span className="text-sm">(+60) 3-1234 5678</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1 pt-4 lg:pt-8">
            <OrderSummary
              subtotal={subtotal}
              savings={savings}
              shippingCost={shippingCost}
              estimatedTotal={estimatedTotal}
              itemCount={cartItems.length}
              onProceedToPayment={handleProceedToPayment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
