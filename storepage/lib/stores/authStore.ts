import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Customer } from "@/lib/api/types";

// Customer role info type
interface CustomerRoleInfo {
  slug: string;
  name: string;
  description: string;
  can_see_bulk_prices: boolean;
  can_see_vip_prices: boolean;
}

// Auth state
interface AuthState {
  customer: Customer | null;
  role: string;
  roleInfo: CustomerRoleInfo | null;
  isInitialized: boolean;
}

// Auth actions
interface AuthActions {
  setCustomer: (customer: Customer | null) => void;
  setRole: (role: string, roleInfo: CustomerRoleInfo | null) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
  reset: () => void;
}

// Default retail role
const defaultRetailRole: CustomerRoleInfo = {
  slug: "retail",
  name: "Retail",
  description: "Standard retail pricing",
  can_see_bulk_prices: false,
  can_see_vip_prices: false,
};

// Initial state
const initialState: AuthState = {
  customer: null,
  role: "retail",
  roleInfo: defaultRetailRole,
  isInitialized: false,
};

// Create auth store
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      setCustomer: (customer) => set({ customer }),

      setRole: (role, roleInfo) => set({ role, roleInfo }),

      setInitialized: (initialized) => set({ isInitialized: initialized }),

      logout: () =>
        set({
          customer: null,
          role: "retail",
          roleInfo: defaultRetailRole,
        }),

      reset: () => set(initialState),
    }),
    {
      name: "auth-store",
      // Only persist role info (not sensitive customer data)
      partialize: (state) => ({
        role: state.role,
        roleInfo: state.roleInfo,
      }),
    }
  )
);

// Computed selectors
export const useIsAuthenticated = () =>
  useAuthStore((state) => !!state.customer);
export const useIsVIP = () => useAuthStore((state) => state.role === "vip");
export const useIsBulk = () => useAuthStore((state) => state.role === "bulk");
export const useIsSupplier = () =>
  useAuthStore((state) => state.role === "supplier");
export const useCanSeeBulkPrices = () =>
  useAuthStore((state) => state.roleInfo?.can_see_bulk_prices ?? false);
export const useCanSeeVIPPrices = () =>
  useAuthStore((state) => state.roleInfo?.can_see_vip_prices ?? false);
