import { create } from "zustand";
import type { Cart, LineItem } from "@/lib/api/types";

// Cart state
interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
}

// Cart actions
interface CartActions {
  setCart: (cart: Cart | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCart: () => void;
  
  // Optimistic updates
  updateItemQuantity: (lineItemId: string, quantity: number) => void;
  removeItem: (lineItemId: string) => void;
}

// Initial state
const initialState: CartState = {
  cart: null,
  isLoading: true,
  error: null,
};

// Create cart store
export const useCartStore = create<CartState & CartActions>((set, get) => ({
  ...initialState,

  setCart: (cart) => set({ cart, isLoading: false, error: null }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error, isLoading: false }),
  
  clearCart: () => set({ cart: null }),

  // Optimistic update for quantity change
  updateItemQuantity: (lineItemId, quantity) => {
    const { cart } = get();
    if (!cart) return;

    set({
      cart: {
        ...cart,
        items: cart.items?.map((item: LineItem) =>
          item.id === lineItemId ? { ...item, quantity } : item
        ),
      },
    });
  },

  // Optimistic remove item
  removeItem: (lineItemId) => {
    const { cart } = get();
    if (!cart) return;

    set({
      cart: {
        ...cart,
        items: cart.items?.filter((item: LineItem) => item.id !== lineItemId),
      },
    });
  },
}));

// Computed selectors
export const useCartItemCount = () =>
  useCartStore((state) =>
    state.cart?.items?.reduce((sum: number, item: LineItem) => sum + (item.quantity || 0), 0) || 0
  );

export const useCartTotal = () =>
  useCartStore((state) => state.cart?.total || 0);

export const useCartItems = () =>
  useCartStore((state) => state.cart?.items || []);
