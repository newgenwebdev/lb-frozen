import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProductRangeKey } from "@/lib/data/productRange";

// Quote list state - product-range categories the visitor wants a quote for
interface QuoteListState {
  categories: ProductRangeKey[];
}

// Quote list actions
interface QuoteListActions {
  toggle: (key: ProductRangeKey) => void;
  add: (key: ProductRangeKey) => void;
  remove: (key: ProductRangeKey) => void;
  clear: () => void;
}

// Separate from the cart; persisted in localStorage as "quote-list"
export const useQuoteListStore = create<QuoteListState & QuoteListActions>()(
  persist(
    (set) => ({
      categories: [],

      toggle: (key) =>
        set((state) => ({
          categories: state.categories.includes(key)
            ? state.categories.filter((k) => k !== key)
            : [...state.categories, key],
        })),

      add: (key) =>
        set((state) =>
          state.categories.includes(key)
            ? state
            : { categories: [...state.categories, key] }
        ),

      remove: (key) =>
        set((state) => ({
          categories: state.categories.filter((k) => k !== key),
        })),

      clear: () => set({ categories: [] }),
    }),
    {
      name: "quote-list",
      // Rehydrated after mount (see QuoteListButton) to avoid SSR hydration mismatches
      skipHydration: true,
    }
  )
);

export const useQuoteListCount = () =>
  useQuoteListStore((state) => state.categories.length);
