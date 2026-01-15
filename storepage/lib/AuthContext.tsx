'use client';

/**
 * AuthContext - Modernized with Zustand + React Query
 * 
 * This provides backward compatibility with the old AuthContext
 * while using Zustand for state and React Query for data fetching.
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { Customer } from './api/types';
import { useAuthStore } from './stores/authStore';
import { usePaymentStore } from './stores/paymentStore';
import { useCartStore } from './stores/cartStore';
import { useWishlistStore } from './stores/wishlistStore';
import { useCheckoutStore, clearPersistedCheckout } from './stores/checkoutStore';
import { clearStoredCartId } from './api/cart';

// Query keys
const AUTH_QUERY_KEYS = {
  customer: ['auth', 'customer'] as const,
  role: ['auth', 'role'] as const,
};

interface CustomerRoleInfo {
  slug: string;
  name: string;
  description: string;
  can_see_bulk_prices: boolean;
  can_see_vip_prices: boolean;
}

interface AuthContextType {
  customer: Customer | null;
  role: string;
  roleInfo: CustomerRoleInfo | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  isVIP: boolean;
  isBulk: boolean;
  isSupplier: boolean;
  canSeeBulkPrices: boolean;
  canSeeVIPPrices: boolean;
  login: (credentials: { email: string; password: string }) => Promise<Customer>;
  logout: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_ROLE_INFO: CustomerRoleInfo = {
  slug: 'retail',
  name: 'Retail',
  description: 'Standard retail pricing',
  can_see_bulk_prices: false,
  can_see_vip_prices: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  // Get state and actions from Zustand stores
  const {
    customer,
    role,
    roleInfo,
    isInitialized,
    setCustomer,
    setRole,
    setInitialized,
    logout: storeLogout,
  } = useAuthStore();
  
  // Get reset functions from other stores
  const resetPaymentStore = usePaymentStore((state) => state.reset);
  const resetCheckoutStore = useCheckoutStore((state) => state.resetCheckout);
  const clearCart = useCartStore((state) => state.clearCart);
  const switchWishlistToAuthenticated = useWishlistStore((state) => state.switchToAuthenticated);
  const switchWishlistToGuest = useWishlistStore((state) => state.switchToGuest);

  // Fetch customer data with React Query
  const customerQuery = useQuery({
    queryKey: AUTH_QUERY_KEYS.customer,
    queryFn: async () => {
      if (!api.isAuthenticated()) {
        // Fetch guest role
        try {
          const roleData = await api.getCustomerRole();
          setRole(roleData.role, roleData.role_info);
        } catch {
          setRole('retail', DEFAULT_ROLE_INFO);
        }
        setInitialized(true);
        return null;
      }

      const currentCustomer = await api.getCurrentCustomer();
      setCustomer(currentCustomer);

      // Fetch role
      if (currentCustomer) {
        const roleData = await api.getCustomerRole();
        setRole(roleData.role, roleData.role_info);
      }

      setInitialized(true);
      return currentCustomer;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.login(credentials);
      return response.customer;
    },
    onSuccess: async (loginCustomer) => {
      setCustomer(loginCustomer);

      // Fetch role after login
      const roleData = await api.getCustomerRole();
      setRole(roleData.role, roleData.role_info);

      // IMPORTANT: Switch wishlist to authenticated mode (clear guest wishlist)
      switchWishlistToAuthenticated();

      // IMPORTANT: Clear guest cart and create new authenticated cart
      // This ensures the new cart is created with the authenticated session
      // so orders will be associated with the customer, not as guest
      clearCart();
      clearStoredCartId();
      
      // Also clear checkout form data from previous session
      resetCheckoutStore();
      clearPersistedCheckout();

      // Invalidate and refetch - cart query will create new cart with auth session
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.customer });
      queryClient.invalidateQueries({ queryKey: ['cart'], exact: false });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.logout();
    },
    onSuccess: () => {
      // Clear auth state
      storeLogout();
      
      // IMPORTANT: Switch wishlist back to guest mode
      switchWishlistToGuest();
      
      // IMPORTANT: Clear payment store (guest address, saved cards selection, etc.)
      resetPaymentStore();
      
      // IMPORTANT: Clear checkout store (shipping address, guest address form, etc.)
      resetCheckoutStore();
      clearPersistedCheckout(); // Also clear localStorage
      
      // IMPORTANT: Clear cart state and localStorage cart ID
      // This ensures a new cart is created for the next user/guest
      clearCart();
      clearStoredCartId();
      
      // Clear all React Query cache
      queryClient.clear();
    },
  });

  // Login function (for backward compatibility)
  const login = async (credentials: { email: string; password: string }): Promise<Customer> => {
    const result = await loginMutation.mutateAsync(credentials);
    return result;
  };

  // Logout function (for backward compatibility)
  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  };

  // Refresh customer function (for backward compatibility)
  const refreshCustomer = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.customer });
    await customerQuery.refetch();
  };

  // Determine loading state
  const loading = !isInitialized || customerQuery.isLoading;

  return (
    <AuthContext.Provider
      value={{
        customer,
        role,
        roleInfo,
        loading,
        error: customerQuery.error as Error | null,
        isAuthenticated: !!customer,
        isVIP: role === 'vip',
        isBulk: role === 'bulk',
        isSupplier: role === 'supplier',
        canSeeBulkPrices: roleInfo?.can_see_bulk_prices ?? false,
        canSeeVIPPrices: roleInfo?.can_see_vip_prices ?? false,
        login,
        logout,
        refreshCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
