import { create } from "zustand";

// Types for cart success dialog
interface CartSuccessProduct {
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variantTitle?: string;
}

interface CartSuccessDialogState {
  open: boolean;
  product: CartSuccessProduct | null;
}

// UI Store for global UI state
interface UIStore {
  // Cart success dialog
  cartSuccessDialog: CartSuccessDialogState;
  showCartSuccess: (product: CartSuccessProduct) => void;
  hideCartSuccess: () => void;
  
  // Mobile menu state (example for future use)
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Cart success dialog state
  cartSuccessDialog: {
    open: false,
    product: null,
  },
  
  showCartSuccess: (product) =>
    set({
      cartSuccessDialog: {
        open: true,
        product,
      },
    }),
  
  hideCartSuccess: () =>
    set({
      cartSuccessDialog: {
        open: false,
        product: null,
      },
    }),
  
  // Mobile menu state
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
}));

// Export types for use in components
export type { CartSuccessProduct };
