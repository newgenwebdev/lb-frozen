"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AddAddressDialog } from "@/components/AddAddressDialog";
import { CheckoutStepper } from "@/components/shared/CheckoutStepper";
import { OrderSummary } from "@/components/shared/OrderSummary";
import { useAuthContext } from "@/lib/AuthContext";
import { 
  useCheckoutQuery, 
  useAddShippingMethodMutation, 
  useUpdateShippingAddressMutation 
} from "@/lib/queries";
import { useCheckoutStore } from "@/lib/stores";
import type { Address } from "@/lib/api/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { customer, loading: authLoading } = useAuthContext();
  
  // React Query hooks
  const { data: checkoutData, isLoading: checkoutLoading } = useCheckoutQuery();
  const cart = checkoutData?.cart || null;
  const shippingOptions = checkoutData?.shippingOptions || [];

  // Zustand checkout store
  const {
    shippingMethod,
    setShippingMethod,
    selectedAddressId,
    setSelectedAddressId,
    guestAddress,
    setGuestAddress,
    selectedShippingOptionId,
    setSelectedShippingOptionId,
  } = useCheckoutStore();
  
  const addShippingMethodMutation = useAddShippingMethodMutation();
  const updateShippingAddressMutation = useUpdateShippingAddressMutation();
  
  const selectShippingMethod = useCallback(async (optionId: string) => {
    return await addShippingMethodMutation.mutateAsync(optionId);
  }, [addShippingMethodMutation]);
  
  const updateShippingAddress = useCallback(async (address: Address) => {
    return await updateShippingAddressMutation.mutateAsync(address);
  }, [updateShippingAddressMutation]);



  // Local error states (keep as useState since they're transient)
  const [guestAddressError, setGuestAddressError] = useState("");
  const [shippingTypeError, setShippingTypeError] = useState("");

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (!checkoutLoading && cart && cart.items.length === 0) {
      router.push("/cart");
    }
  }, [checkoutLoading, cart, router]);

  // Get customer name for display
  const customerName = customer 
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "User"
    : "Guest";

  // Get customer addresses
  const addresses = customer?.addresses || customer?.shipping_addresses || [];
  
  // Set default address on load and update cart with the address
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses[0];
      setSelectedAddressId(defaultAddress.id || null);
      // Also update the cart with the shipping address
      updateShippingAddress(defaultAddress).catch(err => {
        console.error("Failed to set default shipping address:", err);
      });
    }
  }, [addresses, selectedAddressId, updateShippingAddress]);

  // Calculate totals from cart
  const cartItems = cart?.items || [];
  const subtotal = cart?.subtotal ? cart.subtotal / 100 : 0;
  
  // Get discount from cart.discount_total OR from membership promo in metadata
  const membershipPromoDiscount = cart?.metadata?.applied_membership_promo_discount 
    ? Number(cart.metadata.applied_membership_promo_discount) / 100 
    : 0;
  const discountTotal = (cart?.discount_total ? cart.discount_total / 100 : 0) + membershipPromoDiscount;
  
  const shippingCost = cart?.shipping_total ? cart.shipping_total / 100 : 0;
  
  // Recalculate total with membership promo discount
  const total = cart?.total 
    ? (cart.total / 100) - membershipPromoDiscount 
    : subtotal - discountTotal + shippingCost;

  // Handle shipping option selection
  const handleShippingOptionSelect = async (optionId: string) => {
    try {
      setShippingTypeError("");
      await selectShippingMethod(optionId);
      setSelectedShippingOptionId(optionId);
    } catch (error) {
      console.error("Failed to select shipping method:", error);
    }
  };

  // Handle address selection
  const handleAddressSelect = async (address: Address) => {
    try {
      setSelectedAddressId(address.id || null);
      await updateShippingAddress(address);
    } catch (error) {
      console.error("Failed to update shipping address:", error);
    }
  };

  const handleProceedToPayment = async () => {
    // Validate shipping type is selected
    if (!selectedShippingOptionId) {
      setShippingTypeError("Please select a shipping type");
      return;
    }
    setShippingTypeError("");

    if (!customer) {
      // Validate guest address
      if (!guestAddress.first_name || !guestAddress.last_name || !guestAddress.address_1 || !guestAddress.city || !guestAddress.postal_code || !guestAddress.country_code) {
        setGuestAddressError("Please fill in all required fields.");
        return;
      }
      setGuestAddressError("");
      try {
        // Ensure country_code is lowercase (Medusa requirement)
        const addressToSubmit = {
          ...guestAddress,
          country_code: guestAddress.country_code.toLowerCase(),
        };
        await updateShippingAddress(addressToSubmit);
        router.push("/payment");
      } catch (error) {
        setGuestAddressError("Failed to set shipping address. Please try again.");
      }
    } else {
      // Make sure address is set before proceeding
      const selectedAddress = addresses.find((a: Address) => a.id === selectedAddressId) || addresses[0];
      if (selectedAddress) {
        try {
          await updateShippingAddress({
            first_name: selectedAddress.first_name || "",
            last_name: selectedAddress.last_name || "",
            address_1: selectedAddress.address_1 || "",
            address_2: selectedAddress.address_2 || "",
            city: selectedAddress.city || "",
            province: selectedAddress.province || "",
            postal_code: selectedAddress.postal_code || "",
            country_code: selectedAddress.country_code || "my",
            phone: selectedAddress.phone || "",
          });
        } catch (error) {
          console.error("Failed to update shipping address:", error);
        }
      }
      router.push("/payment");
    }
  };

  if (checkoutLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#23429B] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

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
                className={`flex-1 py-3 lg:py-4 px-4 lg:px-6 rounded-xl border transition-colors cursor-pointer ${
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
                className={`cursor-pointer flex-1 py-3 lg:py-4 px-4 lg:px-6 rounded-xl border transition-colors ${
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

            {/* Shipping Options */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">
                Shipping type
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
                {shippingOptions.length > 0 ? (
                  shippingOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleShippingOptionSelect(option.id)}
                      className={`cursor-pointer p-4 rounded-xl border text-left transition-colors ${
                        selectedShippingOptionId === option.id
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
                            {option.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-base lg:text-lg font-bold text-gray-900">
                        {option.amount === 0 ? "Free" : `RM${(option.amount / 100).toFixed(2)}`}
                      </div>
                    </button>
                  ))
                ) : (
                  <>
                    {/* Fallback shipping options */}
                    <button
                      onClick={() => handleShippingOptionSelect("standard")}
                      className={`p-4 rounded-xl border text-left transition-colors ${
                        selectedShippingOptionId === "standard"
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                        </svg>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1 text-sm lg:text-base">Standard Shipping</div>
                          <div className="text-xs lg:text-sm text-gray-600">5-7 business days</div>
                        </div>
                      </div>
                      <div className="text-base lg:text-lg font-bold text-gray-900">RM0.00 (Free)</div>
                    </button>
                    <button
                      onClick={() => handleShippingOptionSelect("express")}
                      className={`p-4 rounded-xl border text-left transition-colors ${
                        selectedShippingOptionId === "express"
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1 text-sm lg:text-base">Express Shipping</div>
                          <div className="text-xs lg:text-sm text-gray-600">1-3 business days</div>
                        </div>
                      </div>
                      <div className="text-base lg:text-lg font-bold text-gray-900">+RM5.99</div>
                    </button>
                    <button
                      onClick={() => handleShippingOptionSelect("sameday")}
                      className={`p-4 rounded-xl border text-left transition-colors ${
                        selectedShippingOptionId === "sameday"
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1 text-sm lg:text-base">Same-Day Delivery</div>
                          <div className="text-xs lg:text-sm text-gray-600">orders before 12:00 pm</div>
                        </div>
                      </div>
                      <div className="text-base lg:text-lg font-bold text-gray-900">+RM12.99</div>
                    </button>
                  </>
                )}
              </div>
              {shippingTypeError && (
                <p className="text-red-600 text-sm mt-2">{shippingTypeError}</p>
              )}
            </div>

            {/* Shipping Address */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">
                  Shipping address
                </h2>
                {customer && <AddAddressDialog />}
              </div>
              {customer ? (
                addresses.length > 0 ? (
                  <div className="space-y-3 lg:space-y-4">
                    {addresses.map((address, index) => (
                      <div
                        key={address.id || index}
                        onClick={() => handleAddressSelect(address)}
                        className={`border rounded-xl p-4 lg:p-6 cursor-pointer transition-colors ${
                          selectedAddressId === address.id
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3 lg:mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-gray-900 text-sm lg:text-base">
                                {address.first_name} {address.last_name}
                              </span>
                              {index === 0 && (
                                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span className="text-sm">Edit</span>
                          </button>
                        </div>
                        <div className="text-gray-700 mb-3">
                          <div>{address.address_1}</div>
                          {address.address_2 && <div>{address.address_2}</div>}
                          <div>{address.city}, {address.postal_code}</div>
                          <div>{address.country_code?.toUpperCase()}</div>
                        </div>
                        {address.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-sm">{address.phone}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <p className="text-gray-600 mb-4">No shipping addresses found</p>
                    <AddAddressDialog />
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={guestAddress.first_name} onChange={e => setGuestAddress({ first_name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={guestAddress.last_name} onChange={e => setGuestAddress({ last_name: e.target.value })} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                    <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={guestAddress.address_1} onChange={e => setGuestAddress({ address_1: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={guestAddress.address_2} onChange={e => setGuestAddress({ address_2: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                      <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={guestAddress.city} onChange={e => setGuestAddress({ city: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Province/State</label>
                      <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={guestAddress.province} onChange={e => setGuestAddress({ province: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                      <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={guestAddress.postal_code} onChange={e => setGuestAddress({ postal_code: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                      <select 
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                        value={guestAddress.country_code} 
                        onChange={e => setGuestAddress({ country_code: e.target.value })} 
                        required
                      >
                        <option value="my">Malaysia</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={guestAddress.phone} onChange={e => setGuestAddress({ phone: e.target.value })} />
                  </div>
                  {guestAddressError && <div className="text-red-600 text-sm">{guestAddressError}</div>}
                </div>
              )}
            </div>

            {/* Cart Items Preview */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">
                Items in your cart ({cartItems.length})
              </h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                      {item.variant?.product?.thumbnail ? (
                        <Image
                          src={item.variant.product.thumbnail}
                          alt={item.title}
                          width={64}
                          height={64}
                          className="object-contain"
                        />
                      ) : (
                        <div className="text-gray-400 text-xs">No Image</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">{item.title}</h3>
                      <p className="text-gray-600 text-xs">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        RM{(item.unit_price / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1 pt-4 lg:pt-8">
            <OrderSummary
              subtotal={subtotal}
              savings={discountTotal}
              shippingCost={shippingCost}
              estimatedTotal={total}
              itemCount={cartItems.length}
              onProceedToPayment={handleProceedToPayment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
