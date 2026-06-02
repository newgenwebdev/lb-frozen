"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { DELIVERY_AREAS, findDeliveryArea } from "@/lib/data/deliveryZones";
import type { DeliveryArea } from "@/lib/data/deliveryZones";

export default function CheckoutPage() {
  const router = useRouter();
  const { customer, loading: authLoading } = useAuthContext();
  
  // React Query hooks
  const { data: checkoutData, isLoading: checkoutLoading } = useCheckoutQuery();
  const cart = checkoutData?.cart || null;
  const shippingOptions = checkoutData?.shippingOptions || [];

  // Zustand checkout store
  const {
    selectedAddressId,
    setSelectedAddressId,
    guestAddress,
    setGuestAddress,
    selectedShippingOptionId,
    setSelectedShippingOptionId,
    selectedArea,
    setSelectedArea,
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
      updateShippingAddress(defaultAddress).catch(err => {
        console.error("Failed to set default shipping address:", err);
      });
    }
  }, [addresses, selectedAddressId, updateShippingAddress]);

  // Auto-detect delivery zone from default address metadata on page load
  const autoZoneRef = useRef(false);
  useEffect(() => {
    if (autoZoneRef.current) return;
    if (!addresses.length || !shippingOptions.length) return;
    if (selectedArea) { autoZoneRef.current = true; return; }
    const defaultAddress = addresses.find((a: Address) => a.id === selectedAddressId) || addresses[0];
    const area = defaultAddress?.metadata?.area as string | undefined;
    if (!area) return;
    const areaData = findDeliveryArea(area);
    if (!areaData) return;
    const matched = shippingOptions.find((o) => o.amount === areaData.amountCents);
    if (!matched) return;
    autoZoneRef.current = true;
    setSelectedArea(area);
    setSelectedShippingOptionId(matched.id);
    selectShippingMethod(matched.id).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses, shippingOptions]);


  // Calculate totals from cart. cart.subtotal includes shipping; use
  // item_subtotal so the row stays items-only while HIDDEN_SHIPPING is on.
  const cartItems = cart?.items || [];
  const subtotal = cart?.item_subtotal ? cart.item_subtotal / 100 : 0;
  
  // Get discount from cart.discount_total OR from membership promo in metadata
  const membershipPromoDiscount = cart?.metadata?.applied_membership_promo_discount 
    ? Number(cart.metadata.applied_membership_promo_discount) / 100 
    : 0;
  const discountTotal = (cart?.discount_total ? cart.discount_total / 100 : 0) + membershipPromoDiscount;
  
  const selectedAreaData = selectedArea ? findDeliveryArea(selectedArea) : undefined;
  const shippingCost = selectedAreaData ? selectedAreaData.amountCents / 100 : 0;

  const total = cart?.total
    ? (cart.total / 100) - membershipPromoDiscount
    : subtotal - discountTotal + shippingCost;

  const handleAreaChange = useCallback(
    async (area: DeliveryArea, matchedOptionId: string | null) => {
      setSelectedArea(area.name);
      setShippingTypeError("");
      if (!matchedOptionId) {
        setShippingTypeError("Shipping option not available for this zone. Please contact support.");
        return;
      }
      try {
        await selectShippingMethod(matchedOptionId);
        setSelectedShippingOptionId(matchedOptionId);
      } catch {
        setShippingTypeError("Failed to apply shipping. Please try again.");
      }
    },
    [selectShippingMethod, setSelectedShippingOptionId, setSelectedArea]
  );

  // Handle address selection — auto-detect zone from metadata.area if present
  const handleAddressSelect = async (address: Address) => {
    try {
      setSelectedAddressId(address.id || null);
      await updateShippingAddress(address);
      const area = address.metadata?.area as string | undefined;
      if (area) {
        const areaData = findDeliveryArea(area);
        if (areaData) {
          const matched = shippingOptions.find((o) => o.amount === areaData.amountCents);
          if (matched) {
            setSelectedArea(area);
            setShippingTypeError("");
            await selectShippingMethod(matched.id);
            setSelectedShippingOptionId(matched.id);
            return;
          }
        }
      }
      // No valid area in metadata — clear so fallback selector shows
      setSelectedArea(null);
      setSelectedShippingOptionId(null);
    } catch (error) {
      console.error("Failed to update shipping address:", error);
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedArea || !selectedShippingOptionId) {
      setShippingTypeError("Please add or update your delivery address with a Klang Valley delivery area.");
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
                          {address.metadata?.area && (
                            <div className="text-xs text-neutral-500 mt-0.5">Area: {address.metadata.area as string}</div>
                          )}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Area *</label>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-neutral-900 cursor-pointer"
                      value={guestAddress.area || ""}
                      onChange={(e) => {
                        const areaData = findDeliveryArea(e.target.value);
                        if (!areaData) return;
                        setGuestAddress({ area: e.target.value });
                        const matched = shippingOptions.find((o) => o.amount === areaData.amountCents);
                        handleAreaChange(areaData, matched?.id ?? null);
                      }}
                    >
                      <option value="" disabled>Select delivery area...</option>
                      <optgroup label="Zone A — RM18.00">
                        {DELIVERY_AREAS.filter((a) => a.zone === "A").map((a) => (
                          <option key={a.name} value={a.name}>{a.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Zone B — RM20.00">
                        {DELIVERY_AREAS.filter((a) => a.zone === "B").map((a) => (
                          <option key={a.name} value={a.name}>{a.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Zone C — RM23.00">
                        {DELIVERY_AREAS.filter((a) => a.zone === "C").map((a) => (
                          <option key={a.name} value={a.name}>{a.name}</option>
                        ))}
                      </optgroup>
                    </select>
                    {shippingTypeError && <p className="text-red-600 text-xs mt-1">{shippingTypeError}</p>}
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
