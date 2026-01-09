import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getRevenue,
  getCustomers,
  getRevenueTimeseries,
  getRecentOrders,
  getTopSellingProducts,
  type TopProductsSortBy,
} from "./analytics";
import type {
  Revenue,
  Customer,
  RevenueTimeseries,
  RecentOrders,
  TopSellingProducts,
} from "../validators/analytics";
import { getProducts } from "./products";
import type {
  MedusaProductListResponse,
  ProductListParams,
  MedusaProductCategoryListResponse,
} from "../types/product";
import { getCategories, getCategoryStats } from "./categories";
import type { CategoryFilter, CategoryStats } from "../validators/category";
import { getBrands, getBrandStats } from "./brands";
import type { BrandFilter, BrandStats, BrandListResponse } from "../validators/brand";
import { getOrderStats, getOrders, getOrderById } from "./orders";
import type {
  OrderStats,
  OrderListResponse,
  Order,
  OrderFilter,
} from "../validators/order";
import { getInventoryQuantitiesMap } from "./inventory";
import {
  getReturnStats,
  getReturns,
  getReturnById,
  checkCanReturn,
} from "./returns";
import type {
  ReturnStats,
  ReturnListResponse,
  Return,
  ReturnFilter,
  CanReturnResponse,
} from "../validators/return";
import {
  getPromoStats,
  getCoupons,
  getCoupon,
  getPWPRules,
  getPWPRule,
} from "./promos";
import type {
  PromoStats,
  CouponListResponse,
  CouponAPI,
  PWPRuleListResponse,
  PWPRuleAPI,
  PromoFilter,
} from "../types/promo";
import { getBanners } from "./banners";
import type { BannerAPIListResponse, BannerListParams } from "../types/banner";
import { getArticles, getArticleById } from "./articles";
import type { ArticleAPIListResponse, ArticleListParams, ArticleAPI } from "../types/article";

import {
  getMembers,
  getMemberById,
  getNonMemberCustomers,
  type NonMemberCustomersResponse,
} from "./membership";
import { getMembershipPromos, getMembershipPromo } from "./membership-promos";
import type {
  MemberListResponse,
  MemberDetailResponse,
  MemberFilter,
  MembershipPromoListResponse,
  MembershipPromoAPI,
  MembershipPromoFilter,
} from "../types/membership";
import { getTiers, getTier } from "./tiers";
import type { TierListResponse, TierConfig } from "../types/tier";
import { getUsers, getCurrentUser, type CurrentUserProfile } from "./users";
import type { UserAPIListResponse, UserListParams } from "../types/user";
import { getShipments } from "./shipments";
import type {
  ShipmentAPIListResponse,
  ShipmentListParams,
} from "../types/shipment";

// Re-export mutations from mutations.ts for backwards compatibility
export {
  useDeleteProduct,
  useUpdateProductStatus,
  useDuplicateProduct,
  useUpdateOrderStatus,
  useCancelOrder,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
  useToggleBannerStatus,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useCreateShipment,
  useUpdateShipment,
  useDeleteShipment,
  useCreateArticle,
  useUpdateArticle,
  useDeleteArticle,
  useCreateShippingOption,
  useUpdateShippingOption,
  useDeleteShippingOption,
  useUpdateShippingSettings,
  useTestEasyParcelConnection,
} from "./mutations";

/**
 * React Query hook to fetch revenue analytics
 * @param period - Time period to get revenue for: "today" | "yesterday" | "7days" | "month" | "year"
 * @returns UseQueryResult with revenue data
 */
export function useRevenue(
  period: string = "today"
): UseQueryResult<Revenue, Error> {
  return useQuery({
    queryKey: ["analytics", "revenue", period],
    queryFn: () => getRevenue(period),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch customer analytics
 * @param period - Time period to get customer stats for: "today" | "yesterday" | "7days" | "month" | "year"
 * @returns UseQueryResult with customer data
 */
export function useCustomers(
  period: string = "today"
): UseQueryResult<Customer, Error> {
  return useQuery({
    queryKey: ["analytics", "customers", period],
    queryFn: () => getCustomers(period),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch revenue timeseries data
 * @param period - Time period to get timeseries for: "today" | "yesterday" | "7days" | "month" | "year"
 * @returns UseQueryResult with timeseries data
 */
export function useRevenueTimeseries(
  period: string = "today"
): UseQueryResult<RevenueTimeseries, Error> {
  return useQuery({
    queryKey: ["analytics", "revenue", "timeseries", period],
    queryFn: () => getRevenueTimeseries(period),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch recent orders
 * @param limit - Number of orders to fetch (default: 10)
 * @returns UseQueryResult with recent orders data
 */
export function useRecentOrders(
  limit: number = 10
): UseQueryResult<RecentOrders, Error> {
  return useQuery({
    queryKey: ["orders", "recent", limit],
    queryFn: () => getRecentOrders(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch top selling products
 * @param period - Time period to get top products for: "today" | "yesterday" | "7days" | "month" | "year"
 * @param limit - Number of products to fetch (default: 5)
 * @param sortBy - Sort by "revenue" or "quantity" (default: "revenue")
 * @returns UseQueryResult with top selling products data
 */
export function useTopSellingProducts(
  period: string = "7days",
  limit: number = 5,
  sortBy: TopProductsSortBy = "revenue"
): UseQueryResult<TopSellingProducts, Error> {
  return useQuery({
    queryKey: ["analytics", "products", "top-selling", period, limit, sortBy],
    queryFn: () => getTopSellingProducts(period, limit, sortBy),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch products list
 * @param params - Query parameters (search, filters, pagination)
 * @returns UseQueryResult with product list data
 */
export function useProducts(
  params: ProductListParams = {}
): UseQueryResult<MedusaProductListResponse, Error> {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => getProducts(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch product sales data (quantity sold per product)
 * Uses the top-selling analytics endpoint with a high limit to get all products
 * @returns UseQueryResult with a Map of product_id -> quantity_sold
 */
export function useProductSales(): UseQueryResult<Map<string, number>, Error> {
  return useQuery({
    queryKey: ["products", "sales"],
    queryFn: async () => {
      // Fetch top selling products for "year" period with high limit to get all products
      const data = await getTopSellingProducts("year", 1000, "quantity");
      // Create a map of product_id -> quantity_sold
      const salesMap = new Map<string, number>();
      for (const product of data.products) {
        const existingSales = salesMap.get(product.product_id) || 0;
        salesMap.set(product.product_id, existingSales + product.quantity_sold);
      }
      return salesMap;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - sales data changes less frequently
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch inventory quantities map
 * Returns a Map of SKU -> quantity for all inventory items
 */
export function useInventoryQuantities(): UseQueryResult<
  Map<string, number>,
  Error
> {
  return useQuery({
    queryKey: ["inventory", "quantities"],
    queryFn: () => getInventoryQuantitiesMap(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch all product categories
 * @param filters - Optional filter parameters
 * @returns UseQueryResult with categories list data
 */
export function useCategories(
  filters?: CategoryFilter
): UseQueryResult<MedusaProductCategoryListResponse, Error> {
  return useQuery({
    queryKey: ["categories", "list", filters],
    queryFn: () => getCategories(filters),
    staleTime: 1000 * 60 * 10, // 10 minutes (categories change less frequently)
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch category statistics
 * @returns UseQueryResult with category stats data
 */
export function useCategoryStats(): UseQueryResult<CategoryStats, Error> {
  return useQuery({
    queryKey: ["categories", "stats"],
    queryFn: () => getCategoryStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============================================================
// Brand Queries
// ============================================================

/**
 * React Query hook to fetch all brands
 * @param filters - Optional filter parameters
 * @returns UseQueryResult with brands list data
 */
export function useBrands(
  filters?: BrandFilter
): UseQueryResult<BrandListResponse, Error> {
  return useQuery({
    queryKey: ["brands", "list", filters],
    queryFn: () => getBrands(filters),
    staleTime: 1000 * 60 * 10, // 10 minutes (brands change less frequently)
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch brand statistics
 * @returns UseQueryResult with brand stats data
 */
export function useBrandStats(): UseQueryResult<BrandStats, Error> {
  return useQuery({
    queryKey: ["brands", "stats"],
    queryFn: () => getBrandStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch order statistics
 * @returns UseQueryResult with order stats data
 */
export function useOrderStats(): UseQueryResult<OrderStats, Error> {
  return useQuery({
    queryKey: ["orders", "stats"],
    queryFn: () => getOrderStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch orders list
 * @param filters - Filter parameters (status, search, sort, pagination)
 * @returns UseQueryResult with orders list data
 */
export function useOrders(
  filters?: OrderFilter
): UseQueryResult<OrderListResponse, Error> {
  return useQuery({
    queryKey: ["orders", "list", filters],
    queryFn: () => getOrders(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch a single order by ID
 * @param id - Order ID
 * @returns UseQueryResult with order data
 */
export function useOrder(id: string): UseQueryResult<Order, Error> {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => getOrderById(id),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
}

// ============================================================
// Returns Queries
// ============================================================

/**
 * React Query hook to fetch return statistics
 * @returns UseQueryResult with return stats data
 */
export function useReturnStats(): UseQueryResult<ReturnStats, Error> {
  return useQuery({
    queryKey: ["returns", "stats"],
    queryFn: () => getReturnStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch returns list
 * @param filters - Filter parameters (status, search, pagination)
 * @returns UseQueryResult with returns list data
 */
export function useReturns(
  filters?: ReturnFilter
): UseQueryResult<ReturnListResponse, Error> {
  return useQuery({
    queryKey: ["returns", "list", filters],
    queryFn: () => getReturns(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch a single return by ID
 * @param id - Return ID
 * @returns UseQueryResult with return data
 */
export function useReturn(id: string): UseQueryResult<Return, Error> {
  return useQuery({
    queryKey: ["returns", id],
    queryFn: () => getReturnById(id),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
}

/**
 * React Query hook to check if an order can be returned
 * @param orderId - Order ID to check
 * @returns UseQueryResult with can-return response
 */
export function useCanReturn(
  orderId: string
): UseQueryResult<CanReturnResponse, Error> {
  return useQuery({
    queryKey: ["orders", orderId, "can-return"],
    queryFn: () => checkCanReturn(orderId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: !!orderId,
  });
}

/**
 * React Query hook to fetch returns for multiple orders
 * Returns a Map of order_id -> Return[] for quick lookup
 * @param orderIds - Array of order IDs to fetch returns for
 * @returns UseQueryResult with a Map of order_id -> returns array
 */
export function useOrdersReturns(
  orderIds: string[]
): UseQueryResult<Map<string, Return[]>, Error> {
  return useQuery({
    queryKey: ["returns", "by-orders", orderIds],
    queryFn: async () => {
      if (orderIds.length === 0) {
        return new Map<string, Return[]>();
      }
      // Fetch all returns (no filter by order_id, we'll filter client-side)
      // This is more efficient when displaying a list of orders
      const response = await getReturns({ limit: 1000 });
      const returnsMap = new Map<string, Return[]>();

      // Group returns by order_id
      for (const ret of response.returns) {
        const existing = returnsMap.get(ret.order_id) || [];
        existing.push(ret);
        returnsMap.set(ret.order_id, existing);
      }

      return returnsMap;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: orderIds.length > 0,
  });
}

// ============================================================
// Promo Queries
// ============================================================

/**
 * React Query hook to fetch promo statistics
 * @returns UseQueryResult with promo stats data
 */
export function usePromoStats(): UseQueryResult<PromoStats, Error> {
  return useQuery({
    queryKey: ["promos", "stats"],
    queryFn: () => getPromoStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch coupons list
 * @param filters - Filter parameters (status, type, search, pagination)
 * @returns UseQueryResult with coupons list data
 */
export function useCoupons(
  filters?: PromoFilter
): UseQueryResult<CouponListResponse, Error> {
  return useQuery({
    queryKey: ["promos", "coupons", "list", filters],
    queryFn: () => getCoupons(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch a single coupon by ID
 * @param id - Coupon ID
 * @returns UseQueryResult with coupon data
 */
export function useCoupon(id: string): UseQueryResult<CouponAPI, Error> {
  return useQuery({
    queryKey: ["promos", "coupons", id],
    queryFn: () => getCoupon(id),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
}

/**
 * React Query hook to fetch PWP rules list
 * @param filters - Filter parameters (status, search, pagination)
 * @returns UseQueryResult with PWP rules list data
 */
export function usePWPRules(
  filters?: PromoFilter
): UseQueryResult<PWPRuleListResponse, Error> {
  return useQuery({
    queryKey: ["promos", "pwp-rules", "list", filters],
    queryFn: () => getPWPRules(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch a single PWP rule by ID
 * @param id - PWP rule ID
 * @returns UseQueryResult with PWP rule data
 */
export function usePWPRule(id: string): UseQueryResult<PWPRuleAPI, Error> {
  return useQuery({
    queryKey: ["promos", "pwp-rules", id],
    queryFn: () => getPWPRule(id),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
}

// ============================================================
// Banner Queries
// ============================================================

/**
 * React Query hook to fetch banners list
 * @param params - Query parameters (limit, offset, status)
 * @returns UseQueryResult with banner list data
 */
export function useBanners(
  params: BannerListParams = {}
): UseQueryResult<BannerAPIListResponse, Error> {
  return useQuery({
    queryKey: ["banners", params],
    queryFn: () => getBanners(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============================================================
// Article Queries
// ============================================================

/**
 * React Query hook to fetch articles list
 * @param params - Query parameters (limit, offset, status, category, featured)
 * @returns UseQueryResult with article list data
 */
export function useArticles(params: ArticleListParams = {}): UseQueryResult<ArticleAPIListResponse, Error> {
  return useQuery({
    queryKey: ["articles", params],
    queryFn: () => getArticles(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Membership Queries
// ============================================================

/**
 * React Query hook to fetch users list
 * @param params - Query parameters (limit, offset, role, status, q)
 * @returns UseQueryResult with user list data
 */
export function useMembers(
  filters?: MemberFilter
): UseQueryResult<MemberListResponse, Error> {
  return useQuery({
    queryKey: ["members", "list", filters],
    queryFn: () => getMembers(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch a single article by ID
 * @param id - Article ID
 * @returns UseQueryResult with article data
 */
export function useArticle(id: string): UseQueryResult<ArticleAPI | null, Error> {
  return useQuery({
    queryKey: ["articles", id],
    queryFn: () => getArticleById(id),
  });
}

/**
 * React Query hook to fetch a single member by customer ID
 * @param customerId - Customer ID
 * @returns UseQueryResult with member detail data
 */

export function useMember(
  customerId: string
): UseQueryResult<MemberDetailResponse, Error> {
  return useQuery({
    queryKey: ["members", customerId],
    queryFn: () => getMemberById(customerId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: !!customerId,
  });
}

/**
 * React Query hook to fetch non-member customers (for adding new members)
 * @param filters - Filter parameters (search, pagination)
 * @returns UseQueryResult with non-member customers list data
 */
export function useNonMemberCustomers(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}): UseQueryResult<NonMemberCustomersResponse, Error> {
  return useQuery({
    queryKey: ["customers", "non-members", filters],
    queryFn: () => getNonMemberCustomers(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

// ============================================================
// Membership Promo Queries
// ============================================================

/**
 * React Query hook to fetch membership promos list
 * @param filters - Filter parameters (status, pagination)
 * @returns UseQueryResult with promos list data
 */
export function useMembershipPromos(
  filters?: MembershipPromoFilter
): UseQueryResult<MembershipPromoListResponse, Error> {
  return useQuery({
    queryKey: ["membership-promos", "list", filters],
    queryFn: () => getMembershipPromos(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch a single membership promo by ID
 * @param id - Promo ID
 * @returns UseQueryResult with promo data
 */
export function useMembershipPromo(
  id: string
): UseQueryResult<MembershipPromoAPI, Error> {
  return useQuery({
    queryKey: ["membership-promos", id],
    queryFn: () => getMembershipPromo(id),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
}

// ============================================================
// Tier Configuration Queries
// ============================================================

/**
 * React Query hook to fetch tier configurations
 * @param includeInactive - Include inactive tiers (default: false)
 * @returns UseQueryResult with tier list data
 */
export function useTiers(
  includeInactive = false
): UseQueryResult<TierListResponse, Error> {
  return useQuery({
    queryKey: ["tiers", "list", { includeInactive }],
    queryFn: () => getTiers(includeInactive),
    staleTime: 1000 * 60 * 5, // 5 minutes - tiers change infrequently
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch a single tier by ID
 * @param id - Tier ID
 * @returns UseQueryResult with tier data
 */
export function useTier(id: string): UseQueryResult<TierConfig, Error> {
  return useQuery({
    queryKey: ["tiers", id],
    queryFn: () => getTier(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
}

// ============================================================
// Membership Settings Queries
// ============================================================

import { getMembershipSettings, getPointsConfig } from "./membership-settings";
import type {
  MembershipSettings,
  PointsConfig,
} from "../types/membership-settings";

/**
 * React Query hook to fetch membership settings
 * @returns UseQueryResult with membership settings data
 */
export function useMembershipSettings(): UseQueryResult<
  MembershipSettings,
  Error
> {
  return useQuery({
    queryKey: ["membership", "settings"],
    queryFn: () => getMembershipSettings(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// User Management Queries
// ============================================================

/**
 * React Query hook to fetch users list
 * @param params - Query parameters (limit, offset, role, status, q)
 * @returns UseQueryResult with user list data
 */
export function useUsers(
  params: UserListParams = {}
): UseQueryResult<UserAPIListResponse, Error> {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => getUsers(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch points configuration
 * @returns UseQueryResult with points config data
 */
export function usePointsConfig(): UseQueryResult<PointsConfig, Error> {
  return useQuery({
    queryKey: ["points", "config"],
    queryFn: () => getPointsConfig(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============================================================
// Shipment Queries
// ============================================================

/**
 * React Query hook to fetch shipments list
 * @param params - Query parameters (limit, offset, status)
 * @returns UseQueryResult with shipment list data
 */
export function useShipments(
  params: ShipmentListParams = {}
): UseQueryResult<ShipmentAPIListResponse, Error> {
  return useQuery({
    queryKey: ["shipments", params],
    queryFn: () => getShipments(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============================================================
// Current User (Profile/Settings) Queries
// ============================================================

/**
 * React Query hook to fetch current user's profile
 * @returns UseQueryResult with current user profile data
 */
export function useCurrentUser(): UseQueryResult<CurrentUserProfile, Error> {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
    staleTime: 1000 * 60 * 10, // 10 minutes - profile doesn't change often
    refetchOnWindowFocus: false,
  });
}

// ============================================================
// Shipping Options Queries (Medusa Native)
// ============================================================

import {
  getShippingOptions,
  getShippingProfiles,
  getServiceZones,
} from "./shipping-options";
import type {
  ShippingOptionAPIListResponse,
  ShippingProfile,
  ServiceZone,
} from "../types/shipping-option";

import { getShippingSettings, getEasyParcelRates } from "./shipping-settings";
import type { ShippingSettingsResponse, EasyParcelRatesResponse } from "../types/shipping-settings";

/**
 * React Query hook to fetch shipping options list
 * @returns UseQueryResult with shipping options list data
 */
export function useShippingOptions(): UseQueryResult<
  ShippingOptionAPIListResponse,
  Error
> {
  return useQuery({
    queryKey: ["shipping-options"],
    queryFn: () => getShippingOptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch shipping profiles (for dropdown)
 * @returns UseQueryResult with shipping profiles data
 */
export function useShippingProfiles(): UseQueryResult<ShippingProfile[], Error> {
  return useQuery({
    queryKey: ["shipping-profiles"],
    queryFn: () => getShippingProfiles(),
    staleTime: 1000 * 60 * 10, // 10 minutes - rarely changes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch service zones (for dropdown)
 * @returns UseQueryResult with service zones data
 */
export function useServiceZones(): UseQueryResult<ServiceZone[], Error> {
  return useQuery({
    queryKey: ["service-zones"],
    queryFn: () => getServiceZones(),
    staleTime: 1000 * 60 * 10, // 10 minutes - rarely changes
    refetchOnWindowFocus: false,
  });
}

// ============================================================
// Shipping Settings Queries (EasyParcel)
// ============================================================

/**
 * React Query hook to fetch shipping settings (pickup address)
 * @returns UseQueryResult with shipping settings data
 */
export function useShippingSettings(): UseQueryResult<
  ShippingSettingsResponse,
  Error
> {
  return useQuery({
    queryKey: ["shipping-settings"],
    queryFn: () => getShippingSettings(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * React Query hook to fetch EasyParcel courier rates
 * @returns UseQueryResult with available courier rates
 */
export function useEasyParcelRates(): UseQueryResult<
  EasyParcelRatesResponse,
  Error
> {
  return useQuery({
    queryKey: ["easyparcel-rates"],
    queryFn: () => getEasyParcelRates(),
    staleTime: 1000 * 60 * 10, // 10 minutes - rates don't change frequently
    refetchOnWindowFocus: false,
  });
}
