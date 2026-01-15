"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { CheckoutStepper } from "@/components/shared/CheckoutStepper";
import { OrderSummary } from "@/components/shared/OrderSummary";
import { AddAddressDialog } from "@/components/AddAddressDialog";
import { AddCardDialog } from "@/components/AddCardDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/lib/AuthContext";
import { useCartQuery } from "@/lib/queries";
import { completeCart, updateCart, clearStoredCartId } from "@/lib/api/cart";
import { initializeStripePayment, payWithSavedCard } from "@/lib/api/payment";
import { getCardBrandName, type SavedPaymentMethod } from "@/lib/api/payment-methods";
import type { Address } from "@/lib/api/types";
import { usePaymentStore, useCartStore, useCheckoutStore, clearPersistedCheckout } from "@/lib/stores";
import { usePaymentMethodsQuery } from "@/lib/queries";

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

// Stripe Payment Form Component
function StripePaymentForm({
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
  saveCard,
}: {
  onSuccess: (orderId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  saveCard: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    onError("");

    try {
      // Confirm the payment
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders`,
        },
        redirect: "if_required",
      });

      if (stripeError) {
        onError(stripeError.message || "Payment failed");
        setIsProcessing(false);
        return;
      }

      // Handle various successful payment statuses
      // "requires_capture" happens when capture_method is "manual" (Medusa default)
      // "succeeded" happens when capture_method is "automatic"
      // "processing" happens for async payment methods
      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing" || paymentIntent?.status === "requires_capture") {
        // Complete the cart to create the order
        const result = await completeCart();
        if (result.order) {
          onSuccess(result.order.id);
        }
      } else {
        console.error("Unexpected payment status:", paymentIntent?.status);
        onError("Payment was not completed. Please try again.");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      onError(err.message || "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="border border-gray-300 rounded-lg p-4 bg-white">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full mt-4 py-3 rounded-full font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: "linear-gradient(to bottom, #23429B, #C52129)",
        }}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing Payment...
          </span>
        ) : (
          "Pay Now"
        )}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { customer, loading: authLoading } = useAuthContext();
  const { data: cart, isLoading: paymentLoading } = useCartQuery();
  const { clearCart } = useCartStore();
  const processing = false; // Will be managed by local state
  
  // React Query for payment methods
  const { data: fetchedCards = [], isLoading: queryLoadingCards, refetch: refetchCards } = usePaymentMethodsQuery();
  
  // Get payment state from store
  const {
    selectedPaymentMethod,
    selectedCard,
    savedCards,
    loadingCards,
    saveCard,
    selectedBillingAddress,
    promoCode,
    isProcessingPayment,
    addCardDialogOpen,
    stripeClientSecret,
    paymentCollectionId,
    paymentError,
    initializingStripe,
    completedOrder,
    guestEmail,
    guestBillingAddress,
    guestAddressError,
    // Actions
    setSelectedPaymentMethod,
    setSelectedCard,
    setSavedCards,
    setLoadingCards,
    setSaveCard,
    setSelectedBillingAddress,
    setPromoCode,
    setIsProcessingPayment,
    setAddCardDialogOpen,
    setStripeClientSecret,
    setPaymentCollectionId,
    setPaymentError,
    setInitializingStripe,
    setCompletedOrder,
    setGuestEmail,
    setGuestBillingAddress,
    setGuestAddressError,
    reset: resetPaymentStore,
  } = usePaymentStore();
  
  // Get checkout store reset
  const resetCheckoutStore = useCheckoutStore((state) => state.resetCheckout);
  
  // Helper function to clear cart completely after order success
  const clearCartAfterOrder = useCallback(() => {
    // Clear localStorage cart ID
    clearStoredCartId();
    // Clear Zustand cart store
    clearCart();
    // Clear checkout store (guest address form, selected shipping, etc.)
    resetCheckoutStore();
    clearPersistedCheckout(); // Also clear localStorage
    // Invalidate React Query cart cache
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.removeQueries({ queryKey: ['cart'] });
  }, [clearCart, queryClient, resetCheckoutStore]);
  
  // Sync fetched cards to store and auto-select
  useEffect(() => {
    if (!queryLoadingCards && customer && fetchedCards.length > 0) {
      // Only update if cards actually changed
      if (JSON.stringify(savedCards) !== JSON.stringify(fetchedCards)) {
        setSavedCards(fetchedCards as SavedPaymentMethod[]);
      }
      // Auto-select first card if available and none selected
      if (!selectedCard && fetchedCards[0]?.id) {
        setSelectedCard(fetchedCards[0].id);
      }
      if (selectedPaymentMethod !== "saved") {
        setSelectedPaymentMethod("saved");
      }
    } else if (!queryLoadingCards && customer && fetchedCards.length === 0) {
      if (selectedPaymentMethod !== "new") {
        setSelectedPaymentMethod("new");
      }
    }
  }, [fetchedCards, queryLoadingCards, customer, savedCards, selectedCard, selectedPaymentMethod]);

  // Initialize Stripe payment
  const initializeNewCardPayment = async (emailForGuest?: string) => {
    if (stripeClientSecret || initializingStripe) return;
    
    setInitializingStripe(true);
    setPaymentError(null);
    
    try {
      // Make sure cart has email (for guest or logged-in user)
      const emailToUse = customer?.email || emailForGuest || guestEmail;
      if (cart && !cart.email && emailToUse) {
        await updateCart({ email: emailToUse });
      }
      
      // For guest, also set billing address
      if (!customer && guestBillingAddress.first_name) {
        await updateCart({
          billing_address: {
            ...guestBillingAddress,
            country_code: guestBillingAddress.country_code.toLowerCase(),
          },
        });
      }
      
      // Initialize Stripe payment
      const { clientSecret, paymentCollectionId: pcId } = await initializeStripePayment();
      setStripeClientSecret(clientSecret);
      setPaymentCollectionId(pcId);
    } catch (error: any) {
      console.error("Failed to initialize payment:", error);
      setPaymentError(error.message || "Failed to initialize payment");
    } finally {
      setInitializingStripe(false);
    }
  };

  // When user selects "new card" or guest checkout, initialize payment
  useEffect(() => {
    if (
      selectedPaymentMethod === "new" &&
      !stripeClientSecret &&
      !initializingStripe &&
      cart &&
      customer
    ) {
      initializeNewCardPayment();
    }
  }, [selectedPaymentMethod, stripeClientSecret, initializingStripe, cart, customer]);

  // For guest users, set payment method to "new" automatically
  useEffect(() => {
    if (!customer && !authLoading) {
      if (selectedPaymentMethod !== "new") {
        setSelectedPaymentMethod("new");
      }
      if (loadingCards) {
        setLoadingCards(false);
      }
    }
  }, [customer, authLoading, selectedPaymentMethod, loadingCards, setSelectedPaymentMethod]);

  // Redirect to cart if cart is empty (but not if we just completed an order)
  useEffect(() => {
    if (!paymentLoading && cart && cart.items.length === 0 && !completedOrder) {
      router.push("/cart");
    }
  }, [paymentLoading, cart, router, completedOrder]);

  // IMPORTANT: Set email on cart when customer is logged in
  // This ensures order will be associated with the customer
  useEffect(() => {
    if (customer?.email && cart && !cart.email) {
      updateCart({ email: customer.email }).catch((err) => {
        console.error("Failed to set customer email on cart:", err);
      });
    }
  }, [customer?.email, cart?.id]); // Only run when customer email or cart changes

  // Get customer name for display
  const customerName = customer 
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "User"
    : "Guest";

  // Get customer addresses for billing
  const addresses = customer?.addresses || customer?.shipping_addresses || [];
  
  // Set default billing address and update cart
  useEffect(() => {
    if (addresses.length > 0 && !selectedBillingAddress) {
      const defaultAddress = addresses[0];
      setSelectedBillingAddress(defaultAddress.id || "address1");
      // Update cart with both shipping and billing address - only send valid Medusa fields
      updateCart({ 
        shipping_address: {
          first_name: defaultAddress.first_name || "",
          last_name: defaultAddress.last_name || "",
          address_1: defaultAddress.address_1 || "",
          address_2: defaultAddress.address_2 || "",
          city: defaultAddress.city || "",
          province: defaultAddress.province || "",
          postal_code: defaultAddress.postal_code || "",
          country_code: defaultAddress.country_code || "my",
          phone: defaultAddress.phone || "",
        },
        billing_address: {
          first_name: defaultAddress.first_name || "",
          last_name: defaultAddress.last_name || "",
          address_1: defaultAddress.address_1 || "",
          address_2: defaultAddress.address_2 || "",
          city: defaultAddress.city || "",
          province: defaultAddress.province || "",
          postal_code: defaultAddress.postal_code || "",
          country_code: defaultAddress.country_code || "my",
          phone: defaultAddress.phone || "",
        }
      }).catch(err => {
        console.error("Failed to set default addresses:", err);
      });
    }
  }, [addresses, selectedBillingAddress]);

  // Calculate totals from cart
  const cartItems = cart?.items || [];
  const subtotal = cart?.subtotal ? cart.subtotal / 100 : 0;
  const discountTotal = cart?.discount_total ? cart.discount_total / 100 : 0;
  const shippingCost = cart?.shipping_total ? cart.shipping_total / 100 : 0;
  const total = cart?.total ? cart.total / 100 : 0;

  // Handle payment submission with saved card
  const handlePayment = async () => {
    if (selectedPaymentMethod === "saved" && selectedCard) {
      try {
        setIsProcessingPayment(true);
        setPaymentError(null);
        
        // IMPORTANT: Set email on cart before payment - this associates order with customer
        if (customer?.email && cart && !cart.email) {
          await updateCart({ email: customer.email });
        }
        
        // Make sure address is set before payment - only send valid Medusa fields
        const selectedAddress = addresses.find((a: any) => a.id === selectedBillingAddress) || addresses[0];
        if (selectedAddress) {
          await updateCart({
            shipping_address: {
              first_name: selectedAddress.first_name || "",
              last_name: selectedAddress.last_name || "",
              address_1: selectedAddress.address_1 || "",
              address_2: selectedAddress.address_2 || "",
              city: selectedAddress.city || "",
              province: selectedAddress.province || "",
              postal_code: selectedAddress.postal_code || "",
              country_code: selectedAddress.country_code || "my",
              phone: selectedAddress.phone || "",
            },
            billing_address: {
              first_name: selectedAddress.first_name || "",
              last_name: selectedAddress.last_name || "",
              address_1: selectedAddress.address_1 || "",
              address_2: selectedAddress.address_2 || "",
              city: selectedAddress.city || "",
              province: selectedAddress.province || "",
              postal_code: selectedAddress.postal_code || "",
              country_code: selectedAddress.country_code || "my",
              phone: selectedAddress.phone || "",
            }
          });
        }
        
        // Pay with saved card
        const result = await payWithSavedCard(selectedCard);
        
        if (result.success) {
          // Complete the cart to create the order
          const orderResult = await completeCart();
          if (orderResult.order) {
            // IMPORTANT: Clear cart completely to prevent "Could not delete all payment sessions" error
            // This clears localStorage, Zustand store, and React Query cache
            clearCartAfterOrder();
            
            // Show success page instead of redirecting
            setCompletedOrder({
              id: orderResult.order.id,
              display_id: cart?.id ? parseInt(cart.id.slice(-4), 16) : 0,
              email: customer?.email || '',
              items: cart?.items.map(item => ({
                title: item.title || (item as any).product_title || 'Product',
                thumbnail: item.thumbnail || null,
                quantity: item.quantity,
                total: item.total,
              })) || [],
              total: cart?.total || 0,
              currency_code: (cart as any)?.region?.currency_code || 'myr',
              shipping_address: cart?.shipping_address ? {
                city: cart.shipping_address.city || '',
                province: cart.shipping_address.province || '',
                country_code: cart.shipping_address.country_code || 'my',
              } : null,
            });
          }
        } else if (result.requiresAction && result.clientSecret) {
          // 3D Secure required - need to handle this
          setPaymentError("This card requires additional authentication. Please use 'Use a different card' option.");
        } else {
          setPaymentError(result.error || "Payment was not completed. Please try again.");
        }
      } catch (error: any) {
        console.error("Payment failed:", error);
        setPaymentError(error.message || "Payment failed. Please try again.");
      } finally {
        setIsProcessingPayment(false);
      }
    }
  };

  // Handle promo code apply
  const handleApplyPromo = async () => {
    // TODO: Implement promo code application
    console.log("Applying promo code:", promoCode);
  };

  if (paymentLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#23429B] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  // Guest Order Success Page
  if (completedOrder) {
    const formatPrice = (amount: number) => {
      return `RM${(amount / 100).toFixed(2)}`;
    };

    const getCountryName = (code: string) => {
      const countries: Record<string, string> = {
        my: 'Malaysia',
        sg: 'Singapore',
        id: 'Indonesia',
      };
      return countries[code.toLowerCase()] || code.toUpperCase();
    };

    return (
      <div className="min-h-screen bg-white py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                <Image
                  src="/Payment-icon.png"
                  alt="Payment Success"
                  width={120}
                  height={120}
                  className="object-contain"
                />
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Payment successful!
            </h1>
            <p className="text-center text-gray-600 mb-8">
              Thank you for your purchase. Your order has been placed successfully.
            </p>

            {/* Order Info Card */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              {completedOrder.items?.map((item, index) => (
                <div key={index} className="flex items-center gap-4 mb-4 last:mb-0">
                  <div className="w-16 h-16 bg-white rounded-lg overflow-hidden shrink-0">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">ID : #ORD-{completedOrder.display_id || completedOrder.id.slice(-8).toUpperCase()}</p>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-blue-600 font-semibold">
                      Total : {formatPrice(completedOrder.total ?? 0)}
                    </p>
                  </div>
                </div>
              ))}

              <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Payment method</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">VISA</span>
                    <span className="text-gray-900 font-medium">•••• 4242</span>
                  </div>
                </div>

                {completedOrder.shipping_address && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Shipping to</span>
                    </div>
                    <span className="text-gray-900">
                      {[
                        completedOrder.shipping_address.city,
                        completedOrder.shipping_address.province,
                        getCountryName(completedOrder.shipping_address.country_code)
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Email notification */}
            <p className="text-center text-sm text-gray-500 mb-6">
              Order confirmation has been sent to <span className="font-medium text-gray-700">{completedOrder.email}</span>
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-full font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to home
              </button>
              {customer && (
                <button
                  onClick={() => router.push(`/orders/${completedOrder.id}`)}
                  className="flex-1 px-6 py-3 rounded-full font-semibold text-white transition-colors"
                  style={{
                    background: "linear-gradient(to bottom, #23429B, #C52129)",
                  }}
                >
                  Track order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative mx-auto pt-4 lg:pt-8 px-4 lg:px-0">
        <CheckoutStepper currentStep="payment" />

        <div className="border-t border-gray-200"></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:pr-6">
          {/* Left Column - Payment Details */}
          <div className="lg:col-span-2 lg:border-r border-gray-200 pt-4 lg:pt-8 lg:px-10">
            {/* Guest Email Section */}
            {!customer && (
              <div className="mb-6 lg:mb-8">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">We&apos;ll send your order confirmation to this email</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Payment method</h2>
                {customer && (
                  <button
                    onClick={() => setAddCardDialogOpen(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add new card
                  </button>
                )}
              </div>

              {/* Payment Error */}
              {paymentError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {paymentError}
                </div>
              )}

              {/* Guest Checkout - Show instruction */}
              {!customer ? (
                <div className="text-sm text-gray-600 mb-2">
                  {stripeClientSecret 
                    ? "Enter your card details below to complete your purchase."
                    : "Fill in your billing information below, then proceed to enter card details."
                  }
                </div>
              ) : loadingCards ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : savedCards.length > 0 ? (
                <div className="space-y-3">
                  {/* Saved Cards */}
                  {savedCards.map((card) => (
                    <div
                      key={card.id}
                      className={`border rounded-xl p-4 lg:p-5 cursor-pointer transition-colors ${
                        selectedPaymentMethod === "saved" && selectedCard === card.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => {
                        setSelectedPaymentMethod("saved");
                        setSelectedCard(card.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={selectedPaymentMethod === "saved" && selectedCard === card.id}
                          onChange={() => {
                            setSelectedPaymentMethod("saved");
                            setSelectedCard(card.id);
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          {/* Card Brand Icon */}
                          <div className={`w-12 h-8 rounded flex items-center justify-center text-white text-xs font-bold ${
                            card.card?.brand === 'visa' ? 'bg-blue-600' :
                            card.card?.brand === 'mastercard' ? 'bg-gray-900' :
                            card.card?.brand === 'amex' ? 'bg-blue-400' :
                            'bg-gray-600'
                          }`}>
                            {card.card?.brand === 'visa' ? 'VISA' :
                             card.card?.brand === 'mastercard' ? (
                               <div className="flex -space-x-2">
                                 <div className="w-4 h-4 rounded-full bg-red-500" />
                                 <div className="w-4 h-4 rounded-full bg-orange-400" />
                               </div>
                             ) :
                             getCardBrandName(card.card?.brand || '')}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm lg:text-base">
                              {getCardBrandName(card.card?.brand || 'Card')} •••• {card.card?.last4}
                            </div>
                            <div className="text-gray-500 text-xs lg:text-sm">
                              Expires {String(card.card?.exp_month).padStart(2, '0')}/{String(card.card?.exp_year).slice(-2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Option to use a new card */}
                  <div
                    className={`border rounded-xl p-4 lg:p-5 cursor-pointer transition-colors ${
                      selectedPaymentMethod === "new"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedPaymentMethod("new")}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={selectedPaymentMethod === "new"}
                        onChange={() => setSelectedPaymentMethod("new")}
                        className="w-4 h-4"
                      />
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="font-medium text-gray-700">Use a different card</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="text-gray-600 mb-4">No saved payment methods</p>
                  <button
                    onClick={() => setAddCardDialogOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Add a Card
                  </button>
                </div>
              )}
            </div>

            {/* New Card Form - Only show if "new" is selected AND (logged in OR stripe initialized for guest) */}
            {selectedPaymentMethod === "new" && (customer || stripeClientSecret || initializingStripe) && (
              <div className="mb-6 lg:mb-8">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">Card details</h2>
                
                {stripeClientSecret ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret: stripeClientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#23429B',
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      onSuccess={async (orderId) => {
                        // IMPORTANT: Clear cart completely to prevent "Could not delete all payment sessions" error
                        // This clears localStorage, Zustand store, and React Query cache
                        clearCartAfterOrder();
                        
                        // Show success page for both guest and logged-in users
                        setCompletedOrder({
                          id: orderId,
                          display_id: cart?.id ? parseInt(cart.id.slice(-4), 16) : 0,
                          email: customer?.email || guestEmail,
                          items: cart?.items.map(item => ({
                            title: item.title || (item as any).product_title || 'Product',
                            thumbnail: item.thumbnail || null,
                            quantity: item.quantity,
                            total: item.total,
                          })) || [],
                          total: cart?.total || 0,
                          currency_code: (cart as any)?.region?.currency_code || 'myr',
                          shipping_address: cart?.shipping_address ? {
                            city: cart.shipping_address.city || '',
                            province: cart.shipping_address.province || '',
                            country_code: cart.shipping_address.country_code || 'my',
                          } : null,
                        });
                      }}
                      onError={(error) => setPaymentError(error)}
                      isProcessing={isProcessingPayment}
                      setIsProcessing={setIsProcessingPayment}
                      saveCard={saveCard}
                    />
                  </Elements>
                ) : initializingStripe ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Initializing secure payment...</span>
                  </div>
                ) : paymentError ? (
                  <div className="space-y-3">
                    <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                      {paymentError}
                    </div>
                    <button
                      onClick={() => {
                        setPaymentError(null);
                        setStripeClientSecret(null);
                        initializeNewCardPayment(guestEmail);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  </div>
                ) : customer ? (
                  // For logged in users, show loading while initializing
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Initializing secure payment...</span>
                  </div>
                ) : null}

                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-0 mt-4">
                  {customer && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="saveCard"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="saveCard" className="text-xs lg:text-sm text-gray-700 cursor-pointer">
                        Save for future payments
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500 text-xs lg:text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Secure payment</span>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Address */}
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Billing address</h2>
                {customer && <AddAddressDialog />}
              </div>

              {customer ? (
                addresses.length > 0 ? (
                  <div className="space-y-3">
                    {addresses.map((address, index) => (
                      <div
                        key={address.id || index}
                        className={`border rounded-xl p-4 lg:p-6 cursor-pointer transition-colors ${
                          selectedBillingAddress === (address.id || `address${index}`)
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedBillingAddress(address.id || `address${index}`)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={selectedBillingAddress === (address.id || `address${index}`)}
                            onChange={() => setSelectedBillingAddress(address.id || `address${index}`)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 mb-2 text-sm lg:text-base">
                              {address.first_name} {address.last_name}
                            </div>
                            <div className="text-gray-700 text-xs lg:text-sm">
                              {address.address_1}
                              {address.address_2 && `, ${address.address_2}`}
                              , {address.city}, {address.postal_code}, {address.country_code?.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <p className="text-gray-600 mb-4">No billing addresses found</p>
                    <AddAddressDialog />
                  </div>
                )
              ) : (
                /* Guest Billing Address Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={guestBillingAddress.first_name}
                        onChange={(e) => setGuestBillingAddress({ ...guestBillingAddress, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={guestBillingAddress.last_name}
                        onChange={(e) => setGuestBillingAddress({ ...guestBillingAddress, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={guestBillingAddress.address_1}
                      onChange={(e) => setGuestBillingAddress({ ...guestBillingAddress, address_1: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={guestBillingAddress.address_2}
                      onChange={(e) => setGuestBillingAddress({ ...guestBillingAddress, address_2: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={guestBillingAddress.city}
                        onChange={(e) => setGuestBillingAddress({ ...guestBillingAddress, city: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Province/State</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={guestBillingAddress.province}
                        onChange={(e) => setGuestBillingAddress({ ...guestBillingAddress, province: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={guestBillingAddress.postal_code}
                        onChange={(e) => setGuestBillingAddress({ ...guestBillingAddress, postal_code: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={guestBillingAddress.country_code}
                        onChange={(e) => setGuestBillingAddress({ ...guestBillingAddress, country_code: e.target.value })}
                        required
                      >
                        <option value="my">Malaysia</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={guestBillingAddress.phone}
                      onChange={(e) => setGuestBillingAddress({ ...guestBillingAddress, phone: e.target.value })}
                    />
                  </div>
                  {guestAddressError && <div className="text-red-600 text-sm">{guestAddressError}</div>}
                  
                  {/* Initialize Payment Button for Guest */}
                  {!stripeClientSecret && !initializingStripe && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!guestEmail) {
                          setGuestAddressError("Please enter your email address");
                          return;
                        }
                        if (!guestBillingAddress.first_name || !guestBillingAddress.last_name || !guestBillingAddress.address_1 || !guestBillingAddress.city || !guestBillingAddress.postal_code) {
                          setGuestAddressError("Please fill in all required billing address fields");
                          return;
                        }
                        setGuestAddressError("");
                        initializeNewCardPayment(guestEmail);
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                    >
                      Continue to Payment
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Order Items Preview */}
            <div className="mb-6 lg:mb-8">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">
                Order items ({cartItems.length})
              </h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                      {item.variant?.product?.thumbnail ? (
                        <Image
                          src={item.variant.product.thumbnail}
                          alt={item.title}
                          width={56}
                          height={56}
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
                      <div className="font-bold text-gray-900 text-sm">
                        RM{(item.unit_price / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary & Promo */}
          <div className="lg:col-span-1 pt-4 lg:pt-8 space-y-6">
            <OrderSummary
              subtotal={subtotal}
              savings={discountTotal}
              shippingCost={shippingCost}
              estimatedTotal={total}
              itemCount={cartItems.length}
              onProceedToPayment={selectedPaymentMethod === "saved" ? handlePayment : undefined}
              isProcessing={isProcessingPayment || processing}
              buttonText={selectedPaymentMethod === "saved" ? `Pay RM${total.toFixed(2)}` : undefined}
              hideButton={selectedPaymentMethod === "new"}
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
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="h-12 pl-10 pr-3 py-2"
                  />
                </div>
                <button
                  onClick={handleApplyPromo}
                  className="px-6 py-3 rounded-full font-semibold text-white"
                  style={{
                    background: "linear-gradient(to bottom, #23429B, #C52129)",
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Card Dialog */}
      <AddCardDialog
        open={addCardDialogOpen}
        onOpenChange={setAddCardDialogOpen}
        onSuccess={async () => {
          // Refresh saved cards via React Query
          await refetchCards();
        }}
      />
    </div>
  );
}
