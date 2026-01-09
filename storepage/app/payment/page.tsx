"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckoutStepper } from "@/components/shared/CheckoutStepper";
import { OrderSummary } from "@/components/shared/OrderSummary";
import { AddAddressDialog } from "@/components/AddAddressDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/lib/AuthContext";

export default function PaymentPage() {
  const router = useRouter();
  const { customer, loading } = useAuthContext();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [saveCard, setSaveCard] = useState(false);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState("address2");

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
  const shippingCost = 0;
  const estimatedTotal = subtotal + shippingCost;

  return (
    <div className="relative">
      <div className="relative mx-auto pt-4 lg:pt-8 px-4 lg:px-0">
        <CheckoutStepper currentStep="payment" />

        <div className="border-t border-gray-200"></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:pr-6">
          {/* Left Column - Payment Details */}
          <div className="lg:col-span-2 lg:border-r border-gray-200 pt-4 lg:pt-8 lg:px-10">
            {/* Payment Method */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">Payment method</h2>
              <div className="grid grid-cols-3 gap-3 lg:gap-4">
                <button
                  onClick={() => setSelectedPaymentMethod("debit")}
                  className={`p-4 lg:p-6 rounded-xl border transition-colors flex items-center justify-center ${
                    selectedPaymentMethod === "debit"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="w-10 h-6 lg:w-12 lg:h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    DEBIT
                  </div>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod("mastercard")}
                  className={`p-4 lg:p-6 rounded-xl border transition-colors flex items-center justify-center ${
                    selectedPaymentMethod === "mastercard"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex gap-1">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-red-500 opacity-80" />
                    <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-orange-400 opacity-80 -ml-3 lg:-ml-4" />
                  </div>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod("visa")}
                  className={`p-4 lg:p-6 rounded-xl border transition-colors flex items-center justify-center ${
                    selectedPaymentMethod === "visa"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-blue-600 text-xl lg:text-2xl font-bold">VISA</div>
                </button>
              </div>
            </div>

            {/* Saved Card */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">Saved card</h2>
              
              {/* Card 1 */}
              <div
                className={`border rounded-xl p-4 lg:p-6 mb-3 lg:mb-4 cursor-pointer transition-colors ${
                  selectedCard === "card1"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedCard("card1")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="flex gap-0.5">
                        <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-red-500 opacity-80" />
                        <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-orange-400 opacity-80 -ml-2 lg:-ml-3" />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm lg:text-base">{customerName}</div>
                      <div className="text-gray-600 text-xs lg:text-base">•••• •••• •••• 9980</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:gap-3">
                    <button className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium text-gray-700 hover:text-gray-900">
                      Use
                    </button>
                    <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span className="text-sm">Edit</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div
                className={`border rounded-xl p-4 lg:p-6 cursor-pointer transition-colors ${
                  selectedCard === "card2"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedCard("card2")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-blue-600 text-xs lg:text-sm font-bold">VISA</div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm lg:text-base">Adji Hermawan</div>
                      <div className="text-gray-600 text-xs lg:text-base">•••• •••• •••• 1244</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:gap-3">
                    <button className="px-3 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium text-gray-700 hover:text-gray-900">
                      Use
                    </button>
                    <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span className="text-sm">Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Or add new */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">Or add new</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
                <div className="space-y-2">
                  <Label htmlFor="cardName" className="text-xs lg:text-sm font-medium">Name of</Label>
                  <Input
                    id="cardName"
                    placeholder={customerName || "Full name on card"}
                    className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber" className="text-xs lg:text-sm font-medium">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="•••• •••• •••• 0040"
                    className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-3 lg:mb-4">
                <div className="space-y-2">
                  <Label htmlFor="expiredDate" className="text-xs lg:text-sm font-medium">Expired date</Label>
                  <Input
                    id="expiredDate"
                    placeholder="06/27"
                    className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv" className="text-xs lg:text-sm font-medium">CVV Code</Label>
                  <Input
                    id="cvv"
                    placeholder="Enter code"
                    className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
                  />
                </div>
              </div>

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveCard"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="saveCard" className="text-xs lg:text-sm text-gray-700 cursor-pointer">
                    Save for future payment
                  </Label>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-xs lg:text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>We use secure tokenization</span>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Billing address</h2>
                <AddAddressDialog />
              </div>

              {/* Address 2 */}
              <div
                className={`border rounded-xl p-4 lg:p-6 mb-3 lg:mb-4 cursor-pointer transition-colors ${
                  selectedBillingAddress === "address2"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200"
                }`}
                onClick={() => setSelectedBillingAddress("address2")}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={selectedBillingAddress === "address2"}
                    onChange={() => setSelectedBillingAddress("address2")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 mb-2 text-sm lg:text-base">Address 2</div>
                    <div className="text-gray-700 text-xs lg:text-sm">
                      45 Jalan Melor, Taman Cempaka, Kuala Lumpur, 50450, Malaysia.
                    </div>
                  </div>
                </div>
              </div>

              {/* Address 3 */}
              <div
                className={`border rounded-xl p-4 lg:p-6 cursor-pointer transition-colors ${
                  selectedBillingAddress === "address3"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200"
                }`}
                onClick={() => setSelectedBillingAddress("address3")}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={selectedBillingAddress === "address3"}
                    onChange={() => setSelectedBillingAddress("address3")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 mb-2 text-sm lg:text-base">Address 3</div>
                    <div className="text-gray-700 text-xs lg:text-sm">
                      89 Jalan Mawar, Bukit Tunku, Kuala Lumpur, 50480, Malaysia.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary & Promo */}
          <div className="lg:col-span-1 pt-8 space-y-6">
            <OrderSummary
              subtotal={subtotal}
              savings={savings}
              shippingCost={shippingCost}
              estimatedTotal={estimatedTotal}
              itemCount={cartItems.length}
            />

            {/* Promo Code */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-2">Promo code</h3>
              <p className="text-sm text-gray-600 mb-4">
                If you have a promo code, you can enter it here.
              </p>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  </svg>
                  <Input
                    placeholder="Enter promo code"
                    className="h-12 pl-10 pr-3 py-2"
                  />
                </div>
                <button
                  className="px-6 py-3 rounded-full font-semibold text-white"
                  style={{
                    background: "linear-gradient(to bottom, #23429B, #C52129)",
                  }}
                >
                  Apply code
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
