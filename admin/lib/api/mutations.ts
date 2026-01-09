import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  deleteProduct,
  updateProductStatus,
  duplicateProduct,
} from "./products";
import type {
  MedusaProduct,
  MedusaProductListResponse,
  MedusaProductStatus,
} from "../types/product";
import {
  updateOrderStatus as updateOrderStatusAPI,
  cancelOrder,
} from "./orders";
import type { Order } from "../validators/order";
import {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  createPWPRule,
  updatePWPRule,
  deletePWPRule,
} from "./promos";
import type {
  CouponAPI,
  PWPRuleAPI,
  CreateCouponInput,
  UpdateCouponInput,
  CreatePWPRuleInput,
  UpdatePWPRuleInput,
} from "../types/promo";
import { createBanner, updateBanner, deleteBanner, toggleBannerStatus } from "./banners";
import type { BannerAPI, BannerFormData } from "../types/banner";
import { createArticle, updateArticle, deleteArticle } from "./articles";
import type { ArticleAPI, ArticleFormData } from "../types/article";
import {
  createMembershipPromo,
  updateMembershipPromo,
  toggleMembershipPromoStatus,
  deleteMembershipPromo,
} from "./membership-promos";
import { createMember, deleteMember } from "./membership";
import type {
  MembershipPromoAPI,
  CreateMembershipPromoInput,
  UpdateMembershipPromoInput,
  CreateMemberInput,
  CreateMemberResponse,
} from "../types/membership";
import { createTier, updateTier, deleteTier } from "./tiers";
import type {
  TierConfig,
  CreateTierInput,
  UpdateTierInput,
} from "../types/tier";
import { createUser, updateUser, deleteUser, changePassword, type ChangePasswordInput, type ChangePasswordResponse } from "./users";
import type { UserAPI, UserFormData } from "../types/user";
import { createShipment, updateShipment, deleteShipment } from "./shipments";
import type { ShipmentAPI, ShipmentFormData } from "../types/shipment";
import {
  updateMembershipSettings,
  updatePointsConfig,
} from "./membership-settings";
import type {
  MembershipSettings,
  UpdateMembershipSettingsInput,
  PointsConfig,
  UpdatePointsConfigInput,
} from "../types/membership-settings";

/**
 * React Query mutation hook to delete a product
 * @returns UseMutationResult for delete product operation
 */
export function useDeleteProduct(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      // Invalidate product list queries to refetch
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/**
 * React Query mutation hook to update product status
 * @returns UseMutationResult for update product status operation
 */
export function useUpdateProductStatus(): UseMutationResult<
  MedusaProduct,
  Error,
  { id: string; status: MedusaProductStatus }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MedusaProductStatus }) =>
      updateProductStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Optimistically update all product list caches
      queryClient.setQueriesData<MedusaProductListResponse>(
        { queryKey: ["products"] },
        (oldData) => {
          // Guard against undefined data or missing products array
          if (!oldData || !oldData.products || !Array.isArray(oldData.products)) {
            return oldData;
          }

          return {
            ...oldData,
            products: oldData.products.map((product) =>
              product.id === id ? { ...product, status } : product
            ),
          };
        }
      );
    },
    onSuccess: () => {
      // Invalidate to refetch fresh data from server
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/**
 * React Query mutation hook to duplicate a product
 * @returns UseMutationResult for duplicate product operation
 */
export function useDuplicateProduct(): UseMutationResult<
  MedusaProduct,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => duplicateProduct(productId),
    onSuccess: () => {
      // Invalidate product list queries to refetch
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

/**
 * React Query mutation hook to update order status
 * @returns UseMutationResult for update order status operation
 */
export function useUpdateOrderStatus(): UseMutationResult<
  Order,
  Error,
  { id: string; status: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatusAPI(id, status),
    onSuccess: (data, variables) => {
      // Invalidate order list queries to refetch
      queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "stats"] });
      // Update specific order cache
      queryClient.setQueryData(["orders", variables.id], data);
    },
  });
}

/**
 * React Query mutation hook to cancel an order
 * @returns UseMutationResult for cancel order operation
 */
export function useCancelOrder(): UseMutationResult<
  { order: Order; points?: { points_deducted: number; points_restored: number; new_balance: number } | null },
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: (data, orderId) => {
      // Invalidate order list queries to refetch
      queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "stats"] });
      // Update specific order cache
      queryClient.setQueryData(["orders", orderId], data.order);
    },
  });
}

// ============================================================
// Promo Mutations
// ============================================================

/**
 * React Query mutation hook to create a coupon
 * @returns UseMutationResult for create coupon operation
 */

export function useCreateCoupon(): UseMutationResult<
  CouponAPI,
  Error,
  CreateCouponInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCouponInput) => createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos", "coupons"] });
      queryClient.invalidateQueries({ queryKey: ["promos", "stats"] });
    },
  });
}

/**
 * React Query mutation hook to update a coupon
 * @returns UseMutationResult for update coupon operation
 */

export function useUpdateCoupon(): UseMutationResult<
  CouponAPI,
  Error,
  { id: string; data: UpdateCouponInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCouponInput }) =>
      updateCoupon(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["promos", "coupons", "list"],
      });
      queryClient.invalidateQueries({ queryKey: ["promos", "stats"] });
      queryClient.setQueryData(["promos", "coupons", variables.id], result);
    },
  });
}

/**
 * React Query mutation hook to delete a coupon
 * @returns UseMutationResult for delete coupon operation
 */
export function useDeleteCoupon(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos", "coupons"] });
      queryClient.invalidateQueries({ queryKey: ["promos", "stats"] });
    },
  });
}

/**
 * React Query mutation hook to create a PWP rule
 * @returns UseMutationResult for create PWP rule operation
 */
export function useCreatePWPRule(): UseMutationResult<
  PWPRuleAPI,
  Error,
  CreatePWPRuleInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePWPRuleInput) => createPWPRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos", "pwp-rules"] });
      queryClient.invalidateQueries({ queryKey: ["promos", "stats"] });
    },
  });
}

/**
 * React Query mutation hook to update a PWP rule
 * @returns UseMutationResult for update PWP rule operation
 */
export function useUpdatePWPRule(): UseMutationResult<
  PWPRuleAPI,
  Error,
  { id: string; data: UpdatePWPRuleInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePWPRuleInput }) =>
      updatePWPRule(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["promos", "pwp-rules", "list"],
      });
      queryClient.invalidateQueries({ queryKey: ["promos", "stats"] });
      queryClient.setQueryData(["promos", "pwp-rules", variables.id], result);
    },
  });
}

/**
 * React Query mutation hook to delete a PWP rule
 * @returns UseMutationResult for delete PWP rule operation
 */
export function useDeletePWPRule(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePWPRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promos", "pwp-rules"] });
      queryClient.invalidateQueries({ queryKey: ["promos", "stats"] });
    },
  });
}

// ============================================================
// Banner Mutations
// ============================================================

/**
 * React Query mutation hook to create a banner
 * @returns UseMutationResult for create banner operation
 */
export function useCreateBanner(): UseMutationResult<
  BannerAPI,
  Error,
  BannerFormData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BannerFormData) => createBanner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });
}

/**
 * React Query mutation hook to update a banner
 * @returns UseMutationResult for update banner operation
 */
export function useUpdateBanner(): UseMutationResult<
  BannerAPI,
  Error,
  { id: string; data: Partial<BannerFormData> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BannerFormData> }) =>
      updateBanner(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      queryClient.setQueryData(["banners", variables.id], result);
    },
  });
}

/**
 * React Query mutation hook to delete a banner
 * @returns UseMutationResult for delete banner operation
 */
export function useDeleteBanner(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });
}

/**
 * React Query mutation hook to toggle banner enabled status
 * @returns UseMutationResult for toggle banner status operation
 */
export function useToggleBannerStatus(): UseMutationResult<
  BannerAPI,
  Error,
  { id: string; isEnabled: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) =>
      toggleBannerStatus(id, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
    },
  });
}

// ============================================================
// Article Mutations
// ============================================================

/**
 * React Query mutation hook to create an article
 * @returns UseMutationResult for create article operation
 */
export function useCreateArticle(): UseMutationResult<ArticleAPI, Error, ArticleFormData> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ArticleFormData) => createArticle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });
}


// Membership Promo Mutations
// ============================================================

/**
 * React Query mutation hook to create a membership promo
 * @returns UseMutationResult for create membership promo operation
 */
export function useCreateMembershipPromo(): UseMutationResult<
  MembershipPromoAPI,
  Error,
  CreateMembershipPromoInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMembershipPromoInput) =>
      createMembershipPromo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-promos"] });
    },
  });
}

/**
 * React Query mutation hook to update an article
 * @returns UseMutationResult for update article operation
 */
export function useUpdateArticle(): UseMutationResult<ArticleAPI, Error, { id: string; data: Partial<ArticleFormData> }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ArticleFormData> }) => updateArticle(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.setQueryData(["articles", variables.id], result);
    },
  });
}
      
/** 
 * React Query mutation hook to update a membership promo
 * @returns UseMutationResult for update membership promo operation
 */
export function useUpdateMembershipPromo(): UseMutationResult<
  MembershipPromoAPI,
  Error,
  { id: string; data: UpdateMembershipPromoInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateMembershipPromoInput;
    }) => updateMembershipPromo(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["membership-promos", "list"],
      });
      queryClient.setQueryData(["membership-promos", variables.id], result);
    },
  });
}

/**
 * React Query mutation hook to delete an article
 * @returns UseMutationResult for delete article operation
 */
export function useDeleteArticle(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });
}
/** 
 * React Query mutation hook to toggle membership promo status
 * @returns UseMutationResult for toggle status operation
 */
export function useToggleMembershipPromoStatus(): UseMutationResult<
  MembershipPromoAPI,
  Error,
  { id: string; status: "active" | "non-active" }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "active" | "non-active";
    }) => toggleMembershipPromoStatus(id, status),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["membership-promos", "list"],
      });
      queryClient.setQueryData(["membership-promos", variables.id], result);
    },
  });
}

/**
 * React Query mutation hook to delete a membership promo
 * @returns UseMutationResult for delete membership promo operation
 */
export function useDeleteMembershipPromo(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMembershipPromo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-promos"] });
    },
  });
}

// ============================================================
// User Management Mutations
// ============================================================

/**
 * React Query mutation hook to create a user
 * @returns UseMutationResult for create user operation
 */
export function useCreateUser(): UseMutationResult<
  UserAPI,
  Error,
  UserFormData & { password: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserFormData & { password: string }) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * React Query mutation hook to update a user
 * @returns UseMutationResult for update user operation
 */
export function useUpdateUser(): UseMutationResult<
  UserAPI,
  Error,
  { id: string; data: Partial<UserFormData> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) =>
      updateUser(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.setQueryData(["users", variables.id], result);
    },
  });
}

/**
 * React Query mutation hook to delete a user
 * @returns UseMutationResult for delete user operation
 */
export function useDeleteUser(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/**
 * React Query mutation hook to change current user's password
 * @returns UseMutationResult for change password operation
 */
export function useChangePassword(): UseMutationResult<
  ChangePasswordResponse,
  Error,
  ChangePasswordInput
> {
  return useMutation({
    mutationFn: (data: ChangePasswordInput) => changePassword(data),
  });
}

// ============================================================
// Shipment Mutations
// ============================================================

/**
 * React Query mutation hook to create a shipment
 * @returns UseMutationResult for create shipment operation
 */
export function useCreateShipment(): UseMutationResult<
  ShipmentAPI,
  Error,
  ShipmentFormData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ShipmentFormData) => createShipment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
  });
}

/**
 * React Query mutation hook to update a shipment
 * @returns UseMutationResult for update shipment operation
 */
export function useUpdateShipment(): UseMutationResult<
  ShipmentAPI,
  Error,
  { id: string; data: Partial<ShipmentFormData> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ShipmentFormData>;
    }) => updateShipment(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.setQueryData(["shipments", variables.id], result);
    },
  });
}

/**
 * React Query mutation hook to delete a shipment
 * @returns UseMutationResult for delete shipment operation
 */
export function useDeleteShipment(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
    },
  });
}

// ============================================================
// Member Mutations
// ============================================================

/**
 * React Query mutation hook to create a new member
 * @returns UseMutationResult for create member operation
 */
export function useCreateMember(): UseMutationResult<
  CreateMemberResponse,
  Error,
  CreateMemberInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMemberInput) => createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

/**
 * React Query mutation hook to delete a member
 * @returns UseMutationResult for delete member operation
 */
export function useDeleteMember(): UseMutationResult<
  { id: string; deleted: boolean },
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => deleteMember(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

// ============================================================
// Tier Configuration Mutations
// ============================================================

/**
 * React Query mutation hook to create a tier
 * @returns UseMutationResult for create tier operation
 */
export function useCreateTier(): UseMutationResult<
  TierConfig,
  Error,
  CreateTierInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTierInput) => createTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
    },
  });
}

/**
 * React Query mutation hook to update a tier
 * @returns UseMutationResult for update tier operation
 */
export function useUpdateTier(): UseMutationResult<
  TierConfig,
  Error,
  { id: string; data: UpdateTierInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTierInput }) =>
      updateTier(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tiers", "list"] });
      queryClient.setQueryData(["tiers", variables.id], result);
    },
  });
}

/**
 * React Query mutation hook to delete a tier
 * @returns UseMutationResult for delete tier operation
 */
export function useDeleteTier(): UseMutationResult<
  { id: string; deleted: boolean },
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
    },
  });
}

// ============================================================
// Membership Settings Mutations
// ============================================================

/**
 * React Query mutation hook to update membership settings
 * @returns UseMutationResult for update membership settings operation
 */
export function useUpdateMembershipSettings(): UseMutationResult<
  MembershipSettings,
  Error,
  UpdateMembershipSettingsInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMembershipSettingsInput) =>
      updateMembershipSettings(data),
    onSuccess: (result) => {
      queryClient.setQueryData(["membership", "settings"], result);
    },
  });
}

/**
 * React Query mutation hook to update points configuration
 * @returns UseMutationResult for update points config operation
 */

export function useUpdatePointsConfig(): UseMutationResult<
  PointsConfig,
  Error,
  UpdatePointsConfigInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePointsConfigInput) => updatePointsConfig(data),
    onSuccess: (result) => {
      queryClient.setQueryData(["points", "config"], result);
    },
  });
}

// ============================================================
// Shipping Options Mutations (Medusa Native)
// ============================================================

import {
  createShippingOption,
  updateShippingOption,
  deleteShippingOption,
} from "./shipping-options";
import type {
  ShippingOptionAPI,
  ShippingOptionFormData,
} from "../types/shipping-option";

import {
  updateShippingSettings,
  testEasyParcelConnection,
} from "./shipping-settings";
import type {
  UpdateShippingSettingsInput,
  UpdateShippingSettingsResponse,
  TestEasyParcelConnectionResponse,
} from "../types/shipping-settings";

/**
 * React Query mutation hook to create a shipping option
 * @returns UseMutationResult for create shipping option operation
 */
export function useCreateShippingOption(): UseMutationResult<
  ShippingOptionAPI,
  Error,
  ShippingOptionFormData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ShippingOptionFormData) => createShippingOption(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-options"] });
    },
  });
}

/**
 * React Query mutation hook to update a shipping option
 * @returns UseMutationResult for update shipping option operation
 */
export function useUpdateShippingOption(): UseMutationResult<
  ShippingOptionAPI,
  Error,
  { id: string; data: Partial<ShippingOptionFormData> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ShippingOptionFormData>;
    }) => updateShippingOption(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shipping-options"] });
      queryClient.setQueryData(["shipping-options", variables.id], result);
    },
  });
}

/**
 * React Query mutation hook to delete a shipping option
 * @returns UseMutationResult for delete shipping option operation
 */
export function useDeleteShippingOption(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteShippingOption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-options"] });
    },
  });
}

// ============================================================
// Shipping Settings Mutations (EasyParcel)
// ============================================================

/**
 * React Query mutation hook to update shipping settings (pickup address)
 * @returns UseMutationResult for update shipping settings operation
 */
export function useUpdateShippingSettings(): UseMutationResult<
  UpdateShippingSettingsResponse,
  Error,
  UpdateShippingSettingsInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateShippingSettingsInput) =>
      updateShippingSettings(data),
    onSuccess: (result) => {
      queryClient.setQueryData(["shipping-settings"], {
        settings: result.settings,
      });
    },
  });
}

/**
 * React Query mutation hook to test EasyParcel API connection
 * @returns UseMutationResult for test connection operation
 */
export function useTestEasyParcelConnection(): UseMutationResult<
  TestEasyParcelConnectionResponse,
  Error,
  void
> {
  return useMutation({
    mutationFn: () => testEasyParcelConnection(),
  });
}
