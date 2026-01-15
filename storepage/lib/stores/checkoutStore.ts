import { create } from "zustand";
import { persist } from "zustand/middleware";

// Guest address type
interface GuestAddress {
  first_name: string;
  last_name: string;
  phone: string;
  address_1: string;
  address_2: string;
  city: string;
  postal_code: string;
  province: string;
  country_code: string;
}

// Guest billing address type
interface GuestBillingAddress extends GuestAddress {
  email?: string;
}

// Checkout store state
interface CheckoutState {
  // Shipping
  shippingMethod: "shipping" | "pickup";
  selectedAddressId: string | null;
  guestAddress: GuestAddress;
  selectedShippingOptionId: string | null;
  
  // Payment
  selectedPaymentMethod: "saved" | "new";
  selectedCardId: string | null;
  saveCardForFuture: boolean;
  selectedBillingAddressId: string | null;
  guestBillingAddress: GuestBillingAddress;
  promoCode: string;
  guestEmail: string;
}

// Checkout store actions
interface CheckoutActions {
  // Shipping actions
  setShippingMethod: (method: "shipping" | "pickup") => void;
  setSelectedAddressId: (id: string | null) => void;
  setGuestAddress: (address: Partial<GuestAddress>) => void;
  setSelectedShippingOptionId: (id: string | null) => void;
  
  // Payment actions
  setSelectedPaymentMethod: (method: "saved" | "new") => void;
  setSelectedCardId: (id: string | null) => void;
  setSaveCardForFuture: (save: boolean) => void;
  setSelectedBillingAddressId: (id: string | null) => void;
  setGuestBillingAddress: (address: Partial<GuestBillingAddress>) => void;
  setPromoCode: (code: string) => void;
  setGuestEmail: (email: string) => void;
  
  // Reset
  resetCheckout: () => void;
  resetPayment: () => void;
}

// Initial guest address
const initialGuestAddress: GuestAddress = {
  first_name: "",
  last_name: "",
  phone: "",
  address_1: "",
  address_2: "",
  city: "",
  postal_code: "",
  province: "",
  country_code: "my",
};

// Initial guest billing address
const initialGuestBillingAddress: GuestBillingAddress = {
  ...initialGuestAddress,
  email: "",
};

// Initial state
const initialState: CheckoutState = {
  // Shipping
  shippingMethod: "shipping",
  selectedAddressId: null,
  guestAddress: initialGuestAddress,
  selectedShippingOptionId: null,
  
  // Payment
  selectedPaymentMethod: "saved",
  selectedCardId: null,
  saveCardForFuture: false,
  selectedBillingAddressId: null,
  guestBillingAddress: initialGuestBillingAddress,
  promoCode: "",
  guestEmail: "",
};

// Storage name for clearing
const CHECKOUT_STORAGE_NAME = "lb-checkout-store";

// Helper to clear persisted checkout data from localStorage
export function clearPersistedCheckout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CHECKOUT_STORAGE_NAME);
  }
}

// Create checkout store with persistence
export const useCheckoutStore = create<CheckoutState & CheckoutActions>()(
  persist(
    (set) => ({
      ...initialState,
      
      // Shipping actions
      setShippingMethod: (method) => set({ shippingMethod: method }),
      setSelectedAddressId: (id) => set({ selectedAddressId: id }),
      setGuestAddress: (address) =>
        set((state) => ({
          guestAddress: { ...state.guestAddress, ...address },
        })),
      setSelectedShippingOptionId: (id) => set({ selectedShippingOptionId: id }),
      
      // Payment actions
      setSelectedPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
      setSelectedCardId: (id) => set({ selectedCardId: id }),
      setSaveCardForFuture: (save) => set({ saveCardForFuture: save }),
      setSelectedBillingAddressId: (id) => set({ selectedBillingAddressId: id }),
      setGuestBillingAddress: (address) =>
        set((state) => ({
          guestBillingAddress: { ...state.guestBillingAddress, ...address },
        })),
      setPromoCode: (code) => set({ promoCode: code }),
      setGuestEmail: (email) => set({ guestEmail: email }),
      
      // Reset actions
      resetCheckout: () => set(initialState),
      resetPayment: () =>
        set({
          selectedPaymentMethod: "saved",
          selectedCardId: null,
          saveCardForFuture: false,
          selectedBillingAddressId: null,
          guestBillingAddress: initialGuestBillingAddress,
          promoCode: "",
        }),
    }),
    {
      name: CHECKOUT_STORAGE_NAME,
      // Only persist certain fields, not all
      partialize: (state) => ({
        shippingMethod: state.shippingMethod,
        selectedAddressId: state.selectedAddressId,
        guestAddress: state.guestAddress,
        guestEmail: state.guestEmail,
        selectedShippingOptionId: state.selectedShippingOptionId,
      }),
    }
  )
);

// Export types
export type { GuestAddress, GuestBillingAddress };
