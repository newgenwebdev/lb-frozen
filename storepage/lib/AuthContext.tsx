'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as api from './api';
import type { Customer } from './api/types';

const AUTH_STORAGE_KEY = 'lb-frozen-auth-state';

interface CustomerRoleInfo {
  slug: string;
  name: string;
  description: string;
  can_see_bulk_prices: boolean;
  can_see_vip_prices: boolean;
}

interface StoredAuthState {
  customer: Customer | null;
  role: string;
  roleInfo: CustomerRoleInfo | null;
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

// Helper to get stored auth state from sessionStorage
function getStoredAuthState(): StoredAuthState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[AUTH] Failed to parse stored auth state:', e);
  }
  return null;
}

// Helper to save auth state to sessionStorage
function saveAuthState(state: StoredAuthState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('[AUTH] Failed to save auth state:', e);
  }
}

// Helper to clear auth state from sessionStorage
function clearAuthState(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('[AUTH] Failed to clear auth state:', e);
  }
}

const DEFAULT_ROLE_INFO: CustomerRoleInfo = {
  slug: 'retail',
  name: 'Retail',
  description: 'Standard retail pricing',
  can_see_bulk_prices: false,
  can_see_vip_prices: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [role, setRole] = useState<string>('retail');
  const [roleInfo, setRoleInfo] = useState<CustomerRoleInfo | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<Error | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from sessionStorage on client mount
  useEffect(() => {
    const stored = getStoredAuthState();
    if (stored?.customer) {
      setCustomer(stored.customer);
      setRole(stored.role);
      setRoleInfo(stored.roleInfo);
      setLoading(false);
    }
    setHydrated(true);
  }, []);

  // Save to sessionStorage whenever auth state changes (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    if (customer || role !== 'retail' || roleInfo) {
      saveAuthState({ customer, role, roleInfo });
    }
  }, [customer, role, roleInfo, hydrated]);

  const refreshCustomer = useCallback(async () => {
    try {
      setLoading(true);
      const currentCustomer = await api.getCurrentCustomer();
      setCustomer(currentCustomer);
      
      if (currentCustomer) {
        const roleData = await api.getCustomerRole();
        setRole(roleData.role);
        setRoleInfo(roleData.role_info);
      }
      
      setError(null);
    } catch (err) {
      console.error('[AUTH] Failed to refresh customer:', err);
      setError(err as Error);
      setCustomer(null);
      setRole('retail');
      setRoleInfo(null);
      clearAuthState();
    } finally {
      setLoading(false);
    }
  }, []);

  // After hydration, check if we need to fetch or clear
  useEffect(() => {
    if (!hydrated) return;
    
    const hasToken = api.isAuthenticated();
    const hasCachedCustomer = !!customer;
    
    if (hasToken && !hasCachedCustomer) {
      // Have token but no cached data - need to fetch
      refreshCustomer();
    } else if (!hasToken && hasCachedCustomer) {
      // Token was removed (logged out elsewhere) - clear state
      setCustomer(null);
      setRole('retail');
      setRoleInfo(DEFAULT_ROLE_INFO);
      clearAuthState();
      setLoading(false);
    } else {
      // Either: have both token + cache, or have neither
      setLoading(false);
    }
  }, [hydrated]); // Run after hydration

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      try {
        const response = await api.login(credentials);
        setCustomer(response.customer);
        
        const roleData = await api.getCustomerRole();
        setRole(roleData.role);
        setRoleInfo(roleData.role_info);
        
        // Save to sessionStorage
        saveAuthState({
          customer: response.customer,
          role: roleData.role,
          roleInfo: roleData.role_info,
        });
        
        return response.customer;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
      setCustomer(null);
      setRole('retail');
      setRoleInfo(DEFAULT_ROLE_INFO);
      clearAuthState();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        customer,
        role,
        roleInfo,
        loading,
        error,
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
