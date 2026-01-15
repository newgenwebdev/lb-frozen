import { create } from "zustand";
import { persist } from "zustand/middleware";

// Wishlist item type
export interface WishlistItem {
  id: string; // product_id
  variant_id: string; // variant_id for add to cart
  title: string;
  thumbnail?: string | null;
  price: number;
  originalPrice?: number;
  addedAt: number;
}

// Wishlist state
interface WishlistState {
  items: WishlistItem[];
  isAuthenticated: boolean;
}

// Wishlist actions
interface WishlistActions {
  addItem: (item: Omit<WishlistItem, "addedAt">) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: Omit<WishlistItem, "addedAt">) => void;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
  switchToAuthenticated: () => void;
  switchToGuest: () => void;
}

// Initial state
const initialState: WishlistState = {
  items: [],
  isAuthenticated: false,
};

// Create wishlist store with persistence
// Guest uses localStorage key: "guest-wishlist"
// Authenticated uses memory only (no persistence)
export const useWishlistStore = create<WishlistState & WishlistActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (item) =>
        set((state) => {
          // Don't add if already exists
          if (state.items.some((i) => i.id === item.id)) {
            return state;
          }
          return {
            items: [...state.items, { ...item, addedAt: Date.now() }],
          };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      toggleItem: (item) => {
        const { items } = get();
        const exists = items.some((i) => i.id === item.id);
        if (exists) {
          set({ items: items.filter((i) => i.id !== item.id) });
        } else {
          set({ items: [...items, { ...item, addedAt: Date.now() }] });
        }
      },

      isInWishlist: (id) => get().items.some((item) => item.id === id),

      clearWishlist: () => set({ items: [] }),

      // Switch to authenticated mode (clear guest wishlist, use memory only)
      switchToAuthenticated: () => {
        set({ items: [], isAuthenticated: true });
      },

      // Switch back to guest mode (load guest wishlist from localStorage)
      switchToGuest: () => {
        set({ items: [], isAuthenticated: false });
      },
    }),
    {
      name: "guest-wishlist", // Only persist guest wishlist
      // Only persist if not authenticated
      partialize: (state) => 
        !state.isAuthenticated ? state : { items: [], isAuthenticated: state.isAuthenticated },
    }
  )
);

// Computed selectors
export const useWishlistCount = () =>
  useWishlistStore((state) => state.items.length);

export const useWishlistItems = () =>
  useWishlistStore((state) => state.items);
