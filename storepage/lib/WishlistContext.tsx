"use client";

/**
 * WishlistContext - Modernized with Zustand + React Query
 * 
 * This provides backward compatibility with the old WishlistContext
 * while using:
 * - Zustand for guest wishlist (localStorage)
 * - React Query for authenticated wishlist (server)
 */

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useWishlistStore } from "./stores/wishlistStore";
import { useAuthStore } from "./stores/authStore";
import {
  useWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from "./queries";
import type * as wishlistApi from "./api/wishlist";

// Export type for backward compatibility
export interface WishlistItem {
  id: string;
  product_id: string;
  title: string;
  handle: string;
  thumbnail?: string;
  price: number;
  original_price?: number;
  currency: string;
  variant_id: string;
  variant_title?: string;
  added_at: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  addToWishlist: (item: Omit<WishlistItem, "id" | "added_at">) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => Promise<void>;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const { customer } = useAuthStore();

  // Zustand store for guest wishlist (localStorage)
  const {
    items: storeItems,
    addItem: addItemToStore,
    removeItem: removeItemFromStore,
    isInWishlist: storeIsInWishlist,
    clearWishlist: storeClearWishlist,
  } = useWishlistStore();

  // React Query for authenticated wishlist (server)
  const { data: serverWishlist = [], isLoading: isLoadingServer } = useWishlistQuery();
  const addToWishlistMutation = useAddToWishlistMutation();
  const removeFromWishlistMutation = useRemoveFromWishlistMutation();

  // Debug logging
  useEffect(() => {
    console.log("[WishlistContext] Auth state:", { isAuthenticated: !!customer, customerId: customer?.id });
    console.log("[WishlistContext] Server wishlist:", serverWishlist);
    console.log("[WishlistContext] Store items:", storeItems);
  }, [customer, serverWishlist, storeItems]);

  // Handle hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Determine if we're in authenticated or guest mode
  const isAuthenticated = !!customer;
  const loading = !hydrated || (isAuthenticated && isLoadingServer);

  // Get items from appropriate source
  const sourceItems: (wishlistApi.WishlistItem | any)[] = isAuthenticated
    ? serverWishlist
    : storeItems;

  // Convert items to WishlistItem format for backward compatibility
  const items: WishlistItem[] = sourceItems.map((item: any) => ({
    id: item.id,
    product_id: item.product_id || item.id, // Guest store uses 'id' as product_id
    title: item.title,
    handle: item.product_id || item.id, // Use product_id as handle
    thumbnail: item.thumbnail || undefined,
    price: item.price,
    original_price: item.original_price || item.originalPrice,
    currency: "myr",
    variant_id: item.variant_id, // Use actual variant_id, don't fallback to product_id
    variant_title: undefined,
    added_at: item.added_at || item.addedAt || new Date().toISOString(),
  }));

  const addToWishlist = async (item: Omit<WishlistItem, "id" | "added_at">) => {
    if (isAuthenticated) {
      // For authenticated users, add to server
      await addToWishlistMutation.mutateAsync({
        product_id: item.product_id,
        variant_id: item.variant_id,
        title: item.title,
        thumbnail: item.thumbnail,
        price: item.price,
        original_price: item.original_price,
      });
    } else {
      // For guests, add to localStorage with variant_id
      addItemToStore({
        id: item.product_id,
        variant_id: item.variant_id,
        title: item.title,
        thumbnail: item.thumbnail || null,
        price: item.price,
        originalPrice: item.original_price,
      });
    }
  };

  const removeFromWishlist = (productId: string) => {
    if (isAuthenticated) {
      // For authenticated users, remove from server
      removeFromWishlistMutation.mutate(productId);
    } else {
      // For guests, remove from localStorage
      removeItemFromStore(productId);
    }
  };

  const isInWishlist = (productId: string) => {
    if (isAuthenticated) {
      return serverWishlist.some((item: any) => item.product_id === productId);
    } else {
      // Use storeItems directly (already reactive from useWishlistStore)
      return storeItems.some((item: any) => item.id === productId);
    }
  };

  const clearWishlist = async () => {
    if (isAuthenticated) {
      // For authenticated users, remove all items from server
      try {
        // Remove all items in parallel
        await Promise.all(
          serverWishlist.map((item: any) => 
            removeFromWishlistMutation.mutateAsync(item.product_id)
          )
        );
      } catch (error) {
        console.error("Failed to clear wishlist:", error);
      }
    } else {
      storeClearWishlist();
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        loading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
        wishlistCount: items.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
