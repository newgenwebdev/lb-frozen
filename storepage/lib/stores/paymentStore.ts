import { create } from "zustand";
import type { SavedPaymentMethod } from "@/lib/api/payment-methods";

// Guest billing address type
interface GuestBillingAddress {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
  phone: string;
}

// Completed order type
interface CompletedOrder {
  id: string;
  display_id: number;
  email?: string;
  items?: Array<{ title: string; thumbnail: string | null; quantity: number; total: number }>;
  total?: number;
  currency_code?: string;
  shipping_address?: { city: string; province: string; country_code: string } | null;
  metadata?: Record<string, any> | null;
}

// Payment store state
interface PaymentState {
  // Payment method selection
  selectedPaymentMethod: "saved" | "new";
  selectedCard: string;
  saveCard: boolean;
  
  // Saved cards
  savedCards: SavedPaymentMethod[];
  loadingCards: boolean;
  
  // Billing address
  selectedBillingAddress: string | null;
  
  // Promo code
  promoCode: string;
  
  // Payment processing
  isProcessingPayment: boolean;
  stripeClientSecret: string | null;
  paymentCollectionId: string | null;
  paymentError: string | null;
  initializingStripe: boolean;
  
  // Order completion
  completedOrder: CompletedOrder | null;
  
  // Dialog
  addCardDialogOpen: boolean;
  
  // Guest checkout
  guestEmail: string;
  guestBillingAddress: GuestBillingAddress;
  guestAddressError: string;
}

// Payment store actions
interface PaymentActions {
  // Payment method
  setSelectedPaymentMethod: (method: "saved" | "new") => void;
  setSelectedCard: (cardId: string) => void;
  setSaveCard: (save: boolean) => void;
  
  // Saved cards
  setSavedCards: (cards: SavedPaymentMethod[]) => void;
  setLoadingCards: (loading: boolean) => void;
  
  // Billing address
  setSelectedBillingAddress: (addressId: string | null) => void;
  
  // Promo code
  setPromoCode: (code: string) => void;
  
  // Payment processing
  setIsProcessingPayment: (processing: boolean) => void;
  setStripeClientSecret: (secret: string | null) => void;
  setPaymentCollectionId: (id: string | null) => void;
  setPaymentError: (error: string | null) => void;
  setInitializingStripe: (initializing: boolean) => void;
  
  // Order completion
  setCompletedOrder: (order: CompletedOrder | null) => void;
  
  // Dialog
  setAddCardDialogOpen: (open: boolean) => void;
  
  // Guest checkout
  setGuestEmail: (email: string) => void;
  setGuestBillingAddress: (address: Partial<GuestBillingAddress>) => void;
  setGuestAddressError: (error: string) => void;
  
  // Reset
  reset: () => void;
}

// Initial guest billing address
const initialGuestBillingAddress: GuestBillingAddress = {
  first_name: "",
  last_name: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  country_code: "my",
  phone: "",
};

// Initial state
const initialState: PaymentState = {
  selectedPaymentMethod: "saved",
  selectedCard: "",
  saveCard: false,
  savedCards: [],
  loadingCards: true,
  selectedBillingAddress: null,
  promoCode: "",
  isProcessingPayment: false,
  stripeClientSecret: null,
  paymentCollectionId: null,
  paymentError: null,
  initializingStripe: false,
  completedOrder: null,
  addCardDialogOpen: false,
  guestEmail: "",
  guestBillingAddress: initialGuestBillingAddress,
  guestAddressError: "",
};

// Create payment store
export const usePaymentStore = create<PaymentState & PaymentActions>((set) => ({
  ...initialState,
  
  // Payment method
  setSelectedPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
  setSelectedCard: (cardId) => set({ selectedCard: cardId }),
  setSaveCard: (save) => set({ saveCard: save }),
  
  // Saved cards
  setSavedCards: (cards) => set({ savedCards: cards, loadingCards: false }),
  setLoadingCards: (loading) => set((state) => state.loadingCards === loading ? state : { loadingCards: loading }),
  
  // Billing address
  setSelectedBillingAddress: (addressId) => set({ selectedBillingAddress: addressId }),
  
  // Promo code
  setPromoCode: (code) => set({ promoCode: code }),
  
  // Payment processing
  setIsProcessingPayment: (processing) => set({ isProcessingPayment: processing }),
  setStripeClientSecret: (secret) => set({ stripeClientSecret: secret }),
  setPaymentCollectionId: (id) => set({ paymentCollectionId: id }),
  setPaymentError: (error) => set({ paymentError: error }),
  setInitializingStripe: (initializing) => set({ initializingStripe: initializing }),
  
  // Order completion
  setCompletedOrder: (order) => set({ completedOrder: order }),
  
  // Dialog
  setAddCardDialogOpen: (open) => set({ addCardDialogOpen: open }),
  
  // Guest checkout
  setGuestEmail: (email) => set({ guestEmail: email }),
  setGuestBillingAddress: (address) =>
    set((state) => ({
      guestBillingAddress: { ...state.guestBillingAddress, ...address },
    })),
  setGuestAddressError: (error) => set({ guestAddressError: error }),
  
  // Reset
  reset: () =>
    set(() => ({
      ...initialState,
    })),
}));

// Export types
export type { GuestBillingAddress, CompletedOrder };
