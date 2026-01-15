"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCartContext } from "@/lib/CartContext";
import { useToast } from "@/components/ui/toast";

// Type for item to remove
interface RemoveItemData {
  id: string;
  title: string;
  price: number;
  image?: string;
}

export default function CartPage() {
  const router = useRouter();
  const { cart, loading, updateItem, removeItem } = useCartContext();
  const { showToast } = useToast();
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<RemoveItemData | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateItem(itemId, newQuantity);
    } catch (error) {
      console.error("Failed to update quantity:", error);
      showToast("Failed to update quantity", "error");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
      setRemoveDialogOpen(false);
      setItemToRemove(null);
    } catch (error) {
      console.error("Failed to remove item:", error);
      showToast("Failed to remove item", "error");
    }
  };

  const openRemoveDialog = (item: RemoveItemData) => {
    setItemToRemove(item);
    setRemoveDialogOpen(true);
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      // Remove items one by one
      for (const item of cartItems) {
        await removeItem(item.id);
      }
      setClearAllDialogOpen(false);
      showToast("Cart cleared successfully", "success");
    } catch (error) {
      console.error("Failed to clear cart:", error);
      showToast("Failed to clear cart", "error");
    } finally {
      setClearingAll(false);
    }
  };

  const cartItems = cart?.items || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#23429B] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  const subtotal = cart?.subtotal || 0;
  const total = cart?.total || 0;
  const shipping = 0; // Free shipping

  return (
    <div className="relative">
      {/* Border vertical yang nyambung dari navbar */}
      <div className="hidden lg:block absolute left-0 right-0 top-0 bottom-0 mx-auto pr-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          <div className="lg:col-span-2 border-r border-gray-200" />
        </div>
      </div>

      {/* Content */}
      <div className="relative mx-auto px-4 lg:px-0 lg:pr-6 pt-4">
        <div className="flex items-center align-middle justify-between mb-6 lg:mb-8 lg:ml-10 lg:mr-8">
          <h1 className="text-xl lg:text-3xl font-bold text-gray-900">
            Your cart ({cartItems.length} items)
          </h1>
          {cartItems.length > 0 && (
            <button 
              className="text-sm lg:text-base text-red-600 font-medium hover:text-red-700 transition-colors"
              onClick={() => setClearAllDialogOpen(true)}
            >
              Clear all
            </button>
          )}
          <div className=""></div>
        </div>
        
        {cartItems.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Empty Cart Illustration */}
            <div className="lg:col-span-2 lg:border lg:border-gray-200 flex flex-col items-center justify-center py-16 lg:py-24">
              <Image
                src="/illustration-cart-empty.png"
                alt="Empty cart"
                width={200}
                height={200}
                className="mb-6"
              />
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">No products yet</h2>
              <p className="text-gray-500 mb-6">Added products will appear here</p>
              <button
                onClick={() => router.push("/")}
                className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-full hover:bg-gray-50 transition-colors font-medium"
              >
                Explore products
              </button>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-2xl p-4 lg:p-6 sticky top-4">
                {/* Shipping Address */}
                <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Shipping to</p>
                    <p className="text-sm text-gray-500">Select delivery address</p>
                  </div>
                  <button className="text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Order Summary */}
                <div className="pt-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Order summary</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal (0 items)</span>
                      <span className="font-medium">RM0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 flex items-center gap-1">
                        Savings
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                          <path strokeLinecap="round" strokeWidth={1.5} d="M12 16v-4m0-4h.01" />
                        </svg>
                      </span>
                      <span className="font-medium text-green-600">-RM0.00</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-3">
                      <span className="text-gray-500">Shipping</span>
                      <span className="font-medium text-green-600">RM0</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Estimated total</span>
                    <span className="text-xl font-bold text-[#23429B]">RM0.00</span>
                  </div>

                  <button
                    disabled
                    className="w-full mt-4 py-3.5 rounded-full font-medium text-white bg-linear-to-r from-[#23429B] to-[#C52129] opacity-50 cursor-not-allowed"
                  >
                    Proceed to Checkout
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-3 flex items-center justify-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                      <path strokeLinecap="round" strokeWidth={1.5} d="M12 16v-4m0-4h.01" />
                    </svg>
                    You can apply promo code and coin on the next step
                  </p>
                </div>

                {/* Premium Member Banner */}
                <div className="mt-6 bg-linear-to-r from-[#8B1538] to-[#C52129] rounded-2xl p-4 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 opacity-20">
                    <svg viewBox="0 0 100 100" fill="currentColor">
                      <circle cx="80" cy="20" r="60" />
                    </svg>
                  </div>
                  <span className="inline-block bg-yellow-400 text-yellow-900 text-xs font-semibold px-3 py-1 rounded-full mb-2">
                    Premium member
                  </span>
                  <h4 className="font-semibold mb-1">Save more with LB Frozen Premium</h4>
                  <p className="text-sm text-white/80 mb-3">More discount, more benefits, just for you</p>
                  <button className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors">
                    Learn more
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Cart Items */}
            <div className="lg:col-span-2 lg:border lg:border-gray-200">
              <div className="space-y-6 px-4 py-4 lg:px-6 lg:py-6">
                {cartItems.map((item) => {
                  const variant = item.variant;
                  const product = variant?.product;
                  const unitPrice = item.unit_price || 0;
                  const originalPrice = variant?.calculated_price?.original_amount || unitPrice;
                  
                  return (
                    <div
                      key={item.id}
                      className="flex items-start lg:items-center gap-3 lg:gap-6 bg-white lg:bg-transparent p-4 lg:p-0 rounded-2xl lg:rounded-none border lg:border-0 border-gray-200"
                    >
                      {/* Product Image */}
                      <div className="w-20 h-20 lg:w-65 lg:h-50 bg-gray-100 rounded-2xl lg:rounded-3xl flex items-center justify-center shrink-0 overflow-hidden">
                        {product?.thumbnail ? (
                          <Image
                            src={product.thumbnail}
                            alt={item.title}
                            width={100}
                            height={100}
                            className="object-contain"
                          />
                        ) : (
                          <div className="text-gray-400 text-xs lg:text-sm">No Image</div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 flex flex-col justify-between min-h-20 lg:min-h-50">
                        <div>
                          <h3 className="text-base lg:text-xl font-semibold text-gray-900 mb-2 lg:mb-4">
                            {item.title}
                          </h3>
                          
                          {/* Variant Info */}
                          {variant?.title && variant.title !== "Default Variant" && (
                            <div className="px-3 lg:px-4 py-2 lg:py-2.5 border border-gray-300 rounded-full text-xs lg:text-sm bg-white inline-block">
                              {variant.title}
                            </div>
                          )}
                        </div>

                        {/* Price and Quantity Row */}
                        <div className="flex items-center justify-between mt-auto">
                          {/* Price */}
                          <div>
                            <div className="text-lg lg:text-2xl font-bold text-gray-900 mb-0.5 lg:mb-1">
                              RM{(unitPrice / 100).toFixed(2)}
                            </div>
                            {originalPrice > unitPrice && (
                              <div className="text-xs lg:text-sm text-red-500 line-through">
                                RM{(originalPrice / 100).toFixed(2)}
                              </div>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 lg:gap-4">
                            {item.quantity > 1 ? (
                              <button 
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg lg:rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
                              >
                                <span className="text-lg lg:text-xl text-gray-600">−</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => openRemoveDialog({
                                  id: item.id,
                                  title: item.title,
                                  price: unitPrice,
                                  image: product?.thumbnail,
                                })}
                                className="w-8 h-8 lg:w-10 lg:h-10 bg-red-50 rounded-lg lg:rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors"
                              >
                                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                            <span className="text-sm lg:text-lg font-medium w-6 lg:w-8 text-center">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg lg:rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                              <span className="text-lg lg:text-xl text-gray-600">+</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-2xl p-3 lg:p-4 mb-4">
              {/* Shipping Address */}
              <div className="bg-white rounded-2xl p-4 mb-4">
                <button
                  onClick={() => setIsShippingOpen(!isShippingOpen)}
                  className="w-full flex items-start gap-3 text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <svg
                      className="w-5 h-5 text-gray-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        Shipping to
                      </h3>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isShippingOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Jakarta, Indonesia, Kebayoran Baru, South Jakarta
                    </p>
                  </div>
                </button>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 text-lg mb-6">
                  Order summary
                </h3>

                <div className="space-y-4 mb-4">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium">RM{(subtotal / 100).toFixed(2)}</span>
                  </div>

                  <div className="border-t border-dotted border-gray-300 my-4"></div>

                  <div className="flex justify-between text-gray-700">
                    <span>Shipping</span>
                    <span className="font-medium text-green-600">
                      Free
                    </span>
                  </div>
                </div>

                <div className="border-t border-dotted border-gray-300 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">
                      Estimated total
                    </span>
                    <span className="text-2xl font-bold text-[#23429B]">
                      RM{(total / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={() => {
                    router.push("/checkout");
                  }}
                  className="w-full py-3.5 rounded-full font-semibold text-white mb-3"
                  style={{
                    background: "linear-gradient(to bottom, #23429B, #C52129)",
                  }}
                >
                  Proceed to Checkout
                </button>

                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <svg
                    className="w-4 h-4 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    You can apply promo code and coin on the next step
                  </span>
                </div>
              </div>
            </div>

            {/* Premium Banner */}
            <div
              className="mt-4 rounded-2xl p-6 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #23429B 0%, #8B3A8F 50%, #C52129 100%)",
              }}
            >
              <div className="relative z-10">
                <div className="inline-block bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full mb-3">
                  Premium member
                </div>
                <h4 className="text-white font-bold text-lg mb-1">
                  Save more with LB Frozen Premium
                </h4>
                <p className="text-white/80 text-sm mb-4">
                  More discount, more benefits, just for you
                </p>
                <button className="bg-white text-gray-900 px-6 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors">
                  Learn more
                </button>
              </div>

              {/* Decorative circles */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full"></div>
              <div className="absolute -right-4 top-4 w-20 h-20 bg-white/10 rounded-full"></div>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Remove Item Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl">
          <DialogTitle className="sr-only">Remove item from cart</DialogTitle>
          <div className="flex flex-col items-center text-center">
            {/* Close Button */}
            <button
              onClick={() => setRemoveDialogOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Illustration */}
            <div className="mb-6">
              <Image
                src="/illustration-remove-cart.png"
                alt="Remove from cart"
                width={200}
                height={160}
                className="mx-auto"
              />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Remove item from cart?</h2>
            <p className="text-gray-500 mb-6">
              Remove this item? You can add it again later if you change your mind.
            </p>

            {/* Product Info */}
            {itemToRemove && (
              <div className="w-full bg-gray-50 rounded-2xl p-4 flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {itemToRemove.image ? (
                    <Image
                      src={itemToRemove.image}
                      alt={itemToRemove.title}
                      width={60}
                      height={60}
                      className="object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 text-xs">No Image</div>
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 line-clamp-1">{itemToRemove.title}</p>
                  <p className="text-lg font-bold text-gray-900">RM{(itemToRemove.price / 100).toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full space-y-3">
              <button
                onClick={() => itemToRemove && handleRemoveItem(itemToRemove.id)}
                className="w-full py-3.5 rounded-full font-medium text-white bg-[#C52129] hover:bg-[#a51b22] transition-colors"
              >
                Remove
              </button>
              <button
                onClick={() => setRemoveDialogOpen(false)}
                className="w-full py-3.5 rounded-full font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                No, keep this
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 rounded-2xl overflow-hidden">
          <DialogTitle className="sr-only">Clear cart confirmation</DialogTitle>
          <button
            onClick={() => setClearAllDialogOpen(false)}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6 text-center">
            {/* Warning Icon */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">Clear your cart?</h2>
            <p className="text-gray-500 mb-6">
              Are you sure you want to remove all {cartItems.length} items from your cart? This action cannot be undone.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="w-full py-3.5 rounded-full font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {clearingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Clearing...
                  </>
                ) : (
                  "Yes, clear all"
                )}
              </button>
              <button
                onClick={() => setClearAllDialogOpen(false)}
                disabled={clearingAll}
                className="w-full py-3.5 rounded-full font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
