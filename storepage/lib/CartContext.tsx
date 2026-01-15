"use client";

/**
 * CartContext - Modernized with Zustand + React Query
 * 
 * This provides backward compatibility with the old CartContext
 * while using Zustand for state and React Query for data fetching.
 */

import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import { useCartStore } from "./stores/cartStore";
import type { Cart } from "./api/types";

// Query keys
const CART_QUERY_KEYS = {
  cart: ['cart'] as const,
};

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: Error | null;
  refreshCart: () => Promise<void>;
  addItem: (variantId: string, quantity: number) => Promise<Cart>;
  updateItem: (lineItemId: string, quantity: number) => Promise<Cart>;
  removeItem: (lineItemId: string) => Promise<Cart>;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  // Get state and actions from Zustand store
  const {
    cart,
    setCart,
    updateItemQuantity,
    removeItem: storeRemoveItem,
  } = useCartStore();

  // Fetch cart with React Query
  const cartQuery = useQuery({
    queryKey: CART_QUERY_KEYS.cart,
    queryFn: async () => {
      const fetchedCart = await api.getOrCreateCart();
      setCart(fetchedCart);
      return fetchedCart;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Add to cart mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ variantId, quantity }: { variantId: string; quantity: number }) => {
      const updatedCart = await api.addToCart(variantId, quantity);
      return updatedCart;
    },
    onSuccess: (updatedCart) => {
      setCart(updatedCart);
      queryClient.setQueryData(CART_QUERY_KEYS.cart, updatedCart);
    },
  });

  // Update item mutation with optimistic update
  const updateItemMutation = useMutation({
    mutationFn: async ({ lineItemId, quantity }: { lineItemId: string; quantity: number }) => {
      const updatedCart = await api.updateCartItem(lineItemId, quantity);
      return updatedCart;
    },
    onMutate: async ({ lineItemId, quantity }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEYS.cart });
      
      // Snapshot previous value
      const previousCart = queryClient.getQueryData<Cart>(CART_QUERY_KEYS.cart);
      
      // Optimistic update
      updateItemQuantity(lineItemId, quantity);
      
      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousCart) {
        setCart(context.previousCart);
        queryClient.setQueryData(CART_QUERY_KEYS.cart, context.previousCart);
      }
    },
    onSuccess: (updatedCart) => {
      setCart(updatedCart);
      queryClient.setQueryData(CART_QUERY_KEYS.cart, updatedCart);
    },
  });

  // Remove item mutation with optimistic update
  const removeItemMutation = useMutation({
    mutationFn: async (lineItemId: string) => {
      const updatedCart = await api.removeFromCart(lineItemId);
      return updatedCart;
    },
    onMutate: async (lineItemId) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEYS.cart });
      const previousCart = queryClient.getQueryData<Cart>(CART_QUERY_KEYS.cart);
      storeRemoveItem(lineItemId);
      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCart) {
        setCart(context.previousCart);
        queryClient.setQueryData(CART_QUERY_KEYS.cart, context.previousCart);
      }
    },
    onSuccess: (updatedCart) => {
      setCart(updatedCart);
      queryClient.setQueryData(CART_QUERY_KEYS.cart, updatedCart);
    },
  });

  // Backward compatible functions
  const refreshCart = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.cart });
    await cartQuery.refetch();
  };

  const addItem = async (variantId: string, quantity: number): Promise<Cart> => {
    const result = await addItemMutation.mutateAsync({ variantId, quantity });
    return result;
  };

  const updateItem = async (lineItemId: string, quantity: number): Promise<Cart> => {
    const result = await updateItemMutation.mutateAsync({ lineItemId, quantity });
    return result;
  };

  const removeItem = async (lineItemId: string): Promise<Cart> => {
    const result = await removeItemMutation.mutateAsync(lineItemId);
    return result;
  };

  const cartCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading: cartQuery.isLoading,
        error: cartQuery.error as Error | null,
        refreshCart,
        addItem,
        updateItem,
        removeItem,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return context;
}
