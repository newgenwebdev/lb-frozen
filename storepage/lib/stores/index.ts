// Zustand stores for storepage

// Auth Store - authentication state (replaces AuthContext)
export { useAuthStore, useIsAuthenticated, useIsVIP, useIsBulk, useIsSupplier, useCanSeeBulkPrices, useCanSeeVIPPrices } from "./authStore";

// Cart Store - cart state (replaces CartContext)
export { useCartStore, useCartItemCount, useCartTotal, useCartItems } from "./cartStore";

// Wishlist Store - wishlist state (replaces WishlistContext)
export { useWishlistStore, useWishlistCount, useWishlistItems } from "./wishlistStore";
export type { WishlistItem } from "./wishlistStore";

// UI Store - global UI state (dialogs, modals, etc.)
export { useUIStore } from "./uiStore";
export type { CartSuccessProduct } from "./uiStore";

// Checkout Store - checkout & payment flow state
export { useCheckoutStore, clearPersistedCheckout } from "./checkoutStore";
export type { GuestAddress, GuestBillingAddress } from "./checkoutStore";

// Profile Store - profile form state
export { useProfileStore } from "./profileStore";
export type { ProfileFormState } from "./profileStore";

// Address Store - address management state
export { useAddressStore } from "./addressStore";
export type { CustomerAddress } from "./addressStore";

// Payment Store - payment flow state
export { usePaymentStore } from "./paymentStore";
export type { GuestBillingAddress as PaymentGuestBillingAddress, CompletedOrder } from "./paymentStore";
