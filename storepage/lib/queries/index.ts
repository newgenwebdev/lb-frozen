/**
 * React Query Hooks
 * Replaces useState-based hooks with React Query for better caching and state management
 */

"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import * as api from "../api";
import * as wishlistApi from "../api/wishlist";
import type { Product, Cart } from "../api/types";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";

// Query keys
export const queryKeys = {
  // Products
  products: (filters?: api.ProductFilters) => ["products", filters] as const,
  product: (id: string) => ["product", id] as const,
  
  // Categories
  categories: ["categories"] as const,
  
  // Reviews
  featuredReviews: (limit?: number) => ["featuredReviews", limit] as const,
  productReviews: (productId: string) => ["productReviews", productId] as const,
  
  // Auth
  customer: ["customer"] as const,
  customerRole: ["customerRole"] as const,
  
  // Cart
  cart: ["cart"] as const,
  
  // Wishlist
  wishlist: ["wishlist"] as const,
  
  // Orders
  orders: ["orders"] as const,
  order: (id: string) => ["order", id] as const,
  
  // Shipping
  shippingOptions: (cartId: string) => ["shippingOptions", cartId] as const,
  
  // Addresses
  addresses: ["addresses"] as const,
  
  // Payment methods
  paymentMethods: ["paymentMethods"] as const,
} as const;

// ============================================
// PRODUCTS
// ============================================

/**
 * Fetch products with filters
 */
export function useProductsQuery(filters?: api.ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: async () => {
      const response = await api.getProducts(filters);
      return {
        products: response.data,
        count: response.count || 0,
        ratingCounts: response.rating_counts || null,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch single product
 */
export function useProductQuery(
  productId: string | null,
  options?: Omit<UseQueryOptions<Product | null>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.product(productId || ""),
    queryFn: async () => {
      if (!productId) return null;
      const response = await api.getProduct(productId);
      return response.product;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================
// CATEGORIES
// ============================================

/**
 * Fetch categories
 */
export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const response = await api.getCategories();
      return response.product_categories;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories don't change often
  });
}

// ============================================
// AUTH
// ============================================

/**
 * Fetch current customer and role
 */
export function useCustomerQuery() {
  const { setCustomer, setRole, setInitialized } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.customer,
    queryFn: async () => {
      if (!api.isAuthenticated()) {
        // Fetch guest role
        try {
          const roleData = await api.getCustomerRole();
          setRole(roleData.role, roleData.role_info);
        } catch {
          setRole("retail", null);
        }
        setInitialized(true);
        return null;
      }

      const customer = await api.getCurrentCustomer();
      setCustomer(customer);

      // Fetch role
      if (customer) {
        const roleData = await api.getCustomerRole();
        setRole(roleData.role, roleData.role_info);
      }

      setInitialized(true);
      return customer;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/**
 * Login mutation
 */
export function useLoginMutation() {
  const queryClient = useQueryClient();
  const { setCustomer, setRole } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await api.login(credentials);
      return response.customer;
    },
    onSuccess: async (customer) => {
      setCustomer(customer);

      // Fetch role after login
      const roleData = await api.getCustomerRole();
      setRole(roleData.role, roleData.role_info);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.customer });
      queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });
}

/**
 * Logout mutation
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const { clearCart } = useCartStore();

  return useMutation({
    mutationFn: async () => {
      await api.logout();
    },
    onSuccess: () => {
      logout();
      clearCart();

      // Clear all queries
      queryClient.clear();
    },
  });
}

// ============================================
// CART
// ============================================

/**
 * Fetch cart
 * 
 * Uses customer.id in query key so cart refetches when:
 * - User logs in (customer changes from null to customer object)
 * - User logs out (customer changes to null)
 * - Page refresh with existing session (customer loaded after initial render)
 * 
 * Note: In Medusa v2, cart association with customer happens automatically
 * via the auth session/token in request headers.
 */
export function useCartQuery() {
  const { setCart } = useCartStore();
  const customer = useAuthStore((state) => state.customer);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  return useQuery({
    // Include customer.id in query key - when customer changes, query refetches
    queryKey: [...queryKeys.cart, customer?.id ?? 'guest'],
    queryFn: async () => {
      const cart = await api.getOrCreateCart();
      setCart(cart);
      return cart;
    },
    staleTime: 30 * 1000, // 30 seconds - cart changes frequently
    // Wait until auth is initialized to avoid race conditions
    enabled: isInitialized,
  });
}

/**
 * Add to cart mutation
 */
export function useAddToCartMutation() {
  const queryClient = useQueryClient();
  const { setCart } = useCartStore();

  return useMutation({
    mutationFn: async ({
      variantId,
      quantity,
    }: {
      variantId: string;
      quantity: number;
    }) => {
      const cart = await api.addToCart(variantId, quantity);
      return cart;
    },
    onSuccess: (cart) => {
      setCart(cart);
      queryClient.setQueryData(queryKeys.cart, cart);
    },
  });
}

/**
 * Update cart item mutation
 */
export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();
  const { setCart, updateItemQuantity } = useCartStore();

  return useMutation({
    mutationFn: async ({
      lineItemId,
      quantity,
    }: {
      lineItemId: string;
      quantity: number;
    }) => {
      const cart = await api.updateCartItem(lineItemId, quantity);
      return cart;
    },
    // Optimistic update
    onMutate: async ({ lineItemId, quantity }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.cart });

      // Snapshot previous value
      const previousCart = queryClient.getQueryData<Cart>(queryKeys.cart);

      // Optimistically update
      updateItemQuantity(lineItemId, quantity);

      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousCart) {
        setCart(context.previousCart);
        queryClient.setQueryData(queryKeys.cart, context.previousCart);
      }
    },
    onSuccess: (cart) => {
      setCart(cart);
      queryClient.setQueryData(queryKeys.cart, cart);
    },
  });
}

/**
 * Remove from cart mutation
 */
export function useRemoveFromCartMutation() {
  const queryClient = useQueryClient();
  const { setCart, removeItem } = useCartStore();

  return useMutation({
    mutationFn: async (lineItemId: string) => {
      const cart = await api.removeFromCart(lineItemId);
      return cart;
    },
    // Optimistic update
    onMutate: async (lineItemId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cart });
      const previousCart = queryClient.getQueryData<Cart>(queryKeys.cart);
      removeItem(lineItemId);
      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCart) {
        setCart(context.previousCart);
        queryClient.setQueryData(queryKeys.cart, context.previousCart);
      }
    },
    onSuccess: (cart) => {
      setCart(cart);
      queryClient.setQueryData(queryKeys.cart, cart);
    },
  });
}

/**
 * Apply coupon mutation
 */
export function useApplyCouponMutation() {
  const queryClient = useQueryClient();
  const { setCart } = useCartStore();

  return useMutation({
    mutationFn: async (code: string) => {
      const cart = await api.applyCoupon(code);
      return cart;
    },
    onSuccess: (cart) => {
      setCart(cart);
      queryClient.setQueryData(queryKeys.cart, cart);
    },
  });
}

/**
 * Remove coupon mutation
 */
export function useRemoveCouponMutation() {
  const queryClient = useQueryClient();
  const { setCart } = useCartStore();

  return useMutation({
    mutationFn: async () => {
      const cart = await api.removeCoupon();
      return cart;
    },
    onSuccess: (cart) => {
      setCart(cart);
      queryClient.setQueryData(queryKeys.cart, cart);
    },
  });
}

// ============================================
// ORDERS
// ============================================

/**
 * Fetch orders
 */
export function useOrdersQuery() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: async () => {
      const response = await api.getOrders();
      return (response as { orders?: unknown[]; data?: unknown[] }).orders || response.data || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch single order
 */
export function useOrderQuery(orderId: string | null) {
  return useQuery({
    queryKey: queryKeys.order(orderId || ""),
    queryFn: async () => {
      if (!orderId) return null;
      const response = await api.getOrder(orderId);
      return response.order;
    },
    enabled: !!orderId,
  });
}

// ============================================
// ADDRESSES
// ============================================

/**
 * Fetch customer addresses
 */
export function useAddressesQuery() {
  return useQuery({
    queryKey: queryKeys.addresses,
    queryFn: async () => {
      const addresses = await api.getAddresses();
      return addresses;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Add address mutation
 */
export function useAddAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: api.Address) => {
      const result = await api.addAddress(address);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
    },
  });
}

/**
 * Update address mutation
 */
export function useUpdateAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      addressId,
      address,
    }: {
      addressId: string;
      address: Partial<api.Address>;
    }) => {
      const result = await api.updateAddress(addressId, address);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
    },
  });
}

/**
 * Delete address mutation
 */
export function useDeleteAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addressId: string) => {
      await api.deleteAddress(addressId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
    },
  });
}

// ============================================
// SHIPPING
// ============================================

/**
 * Fetch shipping options
 */
export function useShippingOptionsQuery(cartId: string | null) {
  return useQuery({
    queryKey: queryKeys.shippingOptions(cartId || ""),
    queryFn: async () => {
      if (!cartId) return [];
      const response = await api.getShippingOptions(cartId);
      return response.shipping_options;
    },
    enabled: !!cartId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================
// REVIEWS
// ============================================

/**
 * Fetch featured reviews with media
 */
export function useFeaturedReviewsQuery(limit: number = 12) {
  return useQuery({
    queryKey: queryKeys.featuredReviews(limit),
    queryFn: async () => {
      const response = await api.getFeaturedReviews({ limit });
      return response.reviews;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch product reviews
 */
export function useProductReviewsQuery(productId: string | null) {
  return useQuery({
    queryKey: queryKeys.productReviews(productId || ""),
    queryFn: async () => {
      if (!productId) return { reviews: [], stats: null };
      const response = await api.getProductReviews(productId);
      return response;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================
// PAYMENT METHODS
// ============================================

/**
 * Fetch saved payment methods
 */
export function usePaymentMethodsQuery() {
  return useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: async () => {
      const methods = await api.getPaymentMethods();
      return methods;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Delete payment method mutation
 */
export function useDeletePaymentMethodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      await api.deletePaymentMethod(paymentMethodId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods });
    },
  });
}

// ============================================
// REVIEWS
// ============================================

/**
 * Check if customer has reviewed a product
 */
export function useProductReviewStatusQuery(productId: string | null) {
  return useQuery({
    queryKey: ['review-status', productId],
    queryFn: async () => {
      if (!productId) return { has_reviewed: false, review: null };
      const response = await api.getMyProductReview(productId);
      return response;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Submit product review mutation
 */
export function useSubmitReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      rating,
      title,
      content,
      imageUrls,
    }: {
      productId: string;
      rating: number;
      title: string;
      content: string;
      imageUrls?: string[];
    }) => {
      const { createReview } = await import("../api/reviews");
      return await createReview({ 
        product_id: productId, 
        rating, 
        title, 
        content, 
        images: imageUrls 
      });
    },
    onSuccess: (_data, variables) => {
      // Invalidate review queries
      queryClient.invalidateQueries({ queryKey: ['review-status', variables.productId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.productReviews(variables.productId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.featuredReviews() });
    },
  });
}

// ============================================
// CHECKOUT
// ============================================

/**
 * Fetch checkout data (cart + shipping options)
 */
export function useCheckoutQuery() {
  return useQuery({
    queryKey: ['checkout'],
    queryFn: async () => {
      const cart = await api.getOrCreateCart();
      const { shipping_options } = await api.getShippingOptions(cart.id);
      
      return {
        cart,
        shippingOptions: shipping_options,
        selectedShippingOption: null, // Will be set when user selects
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Update shipping address mutation
 */
export function useUpdateShippingAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: api.Address) => {
      // Filter out unrecognized fields
      const sanitizedAddress = {
        first_name: address.first_name,
        last_name: address.last_name,
        address_1: address.address_1,
        address_2: address.address_2,
        city: address.city,
        country_code: address.country_code,
        postal_code: address.postal_code,
        phone: address.phone,
      };

      return await api.updateCart({ shipping_address: sanitizedAddress });
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart, cart);
      queryClient.invalidateQueries({ queryKey: ['checkout'] });
    },
  });
}

/**
 * Update billing address mutation
 */
export function useUpdateBillingAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: api.Address) => {
      return await api.updateCart({ billing_address: address });
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart, cart);
      queryClient.invalidateQueries({ queryKey: ['checkout'] });
    },
  });
}

/**
 * Update cart email mutation
 */
export function useUpdateCartEmailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      return await api.updateCart({ email });
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart, cart);
    },
  });
}

/**
 * Add shipping method mutation
 */
export function useAddShippingMethodMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (optionId: string) => {
      return await api.addShippingMethod(optionId);
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart, cart);
      queryClient.invalidateQueries({ queryKey: ['checkout'] });
    },
  });
}

/**
 * Apply points mutation
 */
export function useApplyPointsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (points: number) => {
      return await api.applyPoints(points);
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(queryKeys.cart, cart);
    },
  });
}

// ============================================
// PAYMENT
// ============================================

/**
 * Initialize Stripe payment mutation
 */
export function useInitializeStripePaymentMutation() {
  return useMutation({
    mutationFn: async () => {
      return await api.initializeStripePayment();
    },
  });
}

/**
 * Complete order mutation
 */
export function useCompleteOrderMutation() {
  const queryClient = useQueryClient();
  const { clearCart } = useCartStore();

  return useMutation({
    mutationFn: async () => {
      return await api.completeCart();
    },
    onSuccess: () => {
      // Clear cart after successful order
      api.clearStoredCartId();
      clearCart();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    },
  });
}

// ============================================
// WISHLIST
// ============================================

/**
 * Fetch customer's wishlist from server
 */
export function useWishlistQuery(
  options?: Omit<UseQueryOptions<wishlistApi.WishlistItem[]>, "queryKey" | "queryFn">
) {
  const { customer } = useAuthStore();

  console.log("[useWishlistQuery] Customer:", customer?.id, "Enabled:", !!customer);

  return useQuery({
    queryKey: queryKeys.wishlist,
    queryFn: async () => {
      console.log("[useWishlistQuery] Fetching wishlist...");
      const result = await wishlistApi.fetchWishlist();
      console.log("[useWishlistQuery] Fetched:", result);
      return result;
    },
    enabled: !!customer, // Only fetch when logged in
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Add item to wishlist
 */
export function useAddToWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Parameters<typeof wishlistApi.addToWishlist>[0]) => {
      console.log("[Wishlist] Adding item:", data.product_id);
      const result = await wishlistApi.addToWishlist(data);
      console.log("[Wishlist] Added successfully:", result);
      return result;
    },
    onSuccess: () => {
      // Invalidate wishlist query to refetch
      console.log("[Wishlist] Invalidating queries");
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist });
    },
    onError: (error) => {
      console.error("[Wishlist] Add failed:", error);
    },
  });
}

/**
 * Remove item from wishlist
 */
export function useRemoveFromWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product_id: string) => {
      console.log("[Wishlist] Removing item:", product_id);
      await wishlistApi.removeFromWishlist(product_id);
      console.log("[Wishlist] Removed successfully");
    },
    onSuccess: () => {
      // Invalidate wishlist query to refetch
      console.log("[Wishlist] Invalidating queries after remove");
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist });
    },
    onError: (error) => {
      console.error("[Wishlist] Remove failed:", error);
    },
  });
}
// ============================================


