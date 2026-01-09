/**
 * React Hooks for API Integration
 * Provides custom hooks for data fetching and mutations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from './api';
import type { Product, Cart, Customer, Order } from './api/types';

// Rating counts type
type RatingCounts = {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
};

/**
 * Hook to fetch products with advanced filtering
 */
export function useProducts(filters?: api.ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState<number>(0);
  const [ratingCounts, setRatingCounts] = useState<RatingCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchProducts() {
      try {
        setLoading(true);
        const response = await api.getProducts(filters);
        if (mounted) {
          setProducts(response.data);
          setCount(response.count || 0);
          setRatingCounts(response.rating_counts || null);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      mounted = false;
    };
  }, [JSON.stringify(filters)]);

  return { products, count, ratingCounts, loading, error };
}

/**
 * Hook to fetch a single product
 */
export function useProduct(productId: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchProduct() {
      try {
        setLoading(true);
        const response = await api.getProduct(productId!);
        if (mounted) {
          setProduct(response.product);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      mounted = false;
    };
  }, [productId]);

  return { product, loading, error };
}

/**
 * Hook to manage cart state
 */
export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      const updatedCart = await api.getOrCreateCart();
      setCart(updatedCart);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(
    async (variantId: string, quantity: number) => {
      try {
        const updatedCart = await api.addToCart(variantId, quantity);
        setCart(updatedCart);
        return updatedCart;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  const updateItem = useCallback(async (lineItemId: string, quantity: number) => {
    try {
      const updatedCart = await api.updateCartItem(lineItemId, quantity);
      setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const removeItem = useCallback(async (lineItemId: string) => {
    try {
      const updatedCart = await api.removeFromCart(lineItemId);
      setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const applyCoupon = useCallback(async (code: string) => {
    try {
      const updatedCart = await api.applyCoupon(code);
      setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const removeCoupon = useCallback(async () => {
    try {
      const updatedCart = await api.removeCoupon();
      setCart(updatedCart);
      return updatedCart;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    cart,
    loading,
    error,
    refreshCart,
    addItem,
    updateItem,
    removeItem,
    applyCoupon,
    removeCoupon,
  };
}

/**
 * Customer role info type
 */
interface CustomerRoleInfo {
  slug: string;
  name: string;
  description: string;
  can_see_bulk_prices: boolean;
  can_see_vip_prices: boolean;
}

/**
 * Hook to manage authentication state with role-based pricing
 */
export function useAuth() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [role, setRole] = useState<string>('retail');
  const [roleInfo, setRoleInfo] = useState<CustomerRoleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshCustomer = useCallback(async () => {
    try {
      setLoading(true);
      const currentCustomer = await api.getCurrentCustomer();
      setCustomer(currentCustomer);
      
      // Also fetch role info
      if (currentCustomer) {
        const roleData = await api.getCustomerRole();
        console.log('[AUTH] Role data received:', roleData);
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
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch role info for guests too
  const fetchGuestRole = useCallback(async () => {
    try {
      const roleData = await api.getCustomerRole();
      setRole(roleData.role);
      setRoleInfo(roleData.role_info);
    } catch {
      // Default to retail
      setRole('retail');
      setRoleInfo({
        slug: 'retail',
        name: 'Retail',
        description: 'Standard retail pricing',
        can_see_bulk_prices: false,
        can_see_vip_prices: false,
      });
    }
  }, []);

  useEffect(() => {
    if (api.isAuthenticated()) {
      refreshCustomer();
    } else {
      fetchGuestRole();
      setLoading(false);
    }
  }, [refreshCustomer, fetchGuestRole]);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      try {
        const response = await api.login(credentials);
        setCustomer(response.customer);
        
        // Fetch role after login
        const roleData = await api.getCustomerRole();
        setRole(roleData.role);
        setRoleInfo(roleData.role_info);
        
        return response.customer;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    []
  );

  // Registration is disabled - only admin can create accounts
  const register = useCallback(async (_data: api.CustomerRegistration) => {
    throw new Error('Public registration is disabled. Please contact support to create an account.');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
      setCustomer(null);
      setRole('retail');
      setRoleInfo({
        slug: 'retail',
        name: 'Retail',
        description: 'Standard retail pricing',
        can_see_bulk_prices: false,
        can_see_vip_prices: false,
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
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
    register, // Throws error - registration disabled
    logout,
    refreshCustomer,
  };
}

/**
 * Hook to fetch customer orders
 */
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchOrders() {
      try {
        setLoading(true);
        const response = await api.getOrders();
        if (mounted) {
          setOrders(response.data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      mounted = false;
    };
  }, []);

  return { orders, loading, error };
}

/**
 * Hook to fetch categories
 */
export function useCategories() {
  const [categories, setCategories] = useState<api.ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchCategories() {
      try {
        setLoading(true);
        const response = await api.getCategories();
        if (mounted) {
          setCategories(response.product_categories);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      mounted = false;
    };
  }, []);

  return { categories, loading, error };
}
