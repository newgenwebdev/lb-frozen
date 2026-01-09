// Re-export Medusa cart types from cart API
export type {
  MedusaCart,
  MedusaCartLineItem,
  MedusaCartAddress,
  MedusaShippingOption,
} from '@/lib/api/cart'

// Re-export coupon types
export type { AppliedCoupon, ValidateCouponResponse } from '@/lib/api/coupon'

// Re-export points types
export type { AppliedPoints, PointsBalanceResponse } from '@/lib/api/points'

// Re-export membership promo types
export type { AppliedMembershipPromo } from '@/lib/api/membership-promo'

// Legacy CartItem type for backward compatibility during migration
export type CartItem = {
  id: string
  variantId: string
  productId: string
  name: string
  image: string
  price: number
  originalPrice?: number
  size: string
  quantity: number
}

// Legacy Cart type for backward compatibility
export type Cart = {
  items: CartItem[]
  subtotal: number
  itemCount: number
}

// New Medusa-integrated cart state
export type MedusaCartState = {
  cart: import('@/lib/api/cart').MedusaCart | null
  isLoading: boolean
  error: string | null
}

// Cart context type with both sync and async operations
export type CartContextType = {
  // Medusa cart state
  medusaCart: import('@/lib/api/cart').MedusaCart | null
  isLoading: boolean
  error: string | null

  // Computed values from Medusa cart
  items: import('@/lib/api/cart').MedusaCartLineItem[]
  subtotal: number
  itemCount: number
  total: number

  // Bulk pricing data for instant local calculations
  bulkPricingMap: import('@/lib/api/cart-pricing').BulkPricingMap
  pwpOffers: import('@/lib/api/cart-pricing').PWPOffer[]

  // Inventory data: variant_id -> available quantity
  inventoryMap: import('@/lib/api/cart-pricing').InventoryMap

  // Promo/coupon state
  appliedCoupon: import('@/lib/api/coupon').AppliedCoupon | null
  isApplyingCoupon: boolean
  couponError: string | null

  // Points state
  appliedPoints: import('@/lib/api/points').AppliedPoints | null
  pointsBalance: import('@/lib/api/points').PointsBalanceResponse | null
  isApplyingPoints: boolean
  pointsError: string | null

  // Membership promo state
  appliedMembershipPromo: import('@/lib/api/membership-promo').AppliedMembershipPromo | null
  isApplyingMembershipPromo: boolean
  membershipPromoError: string | null

  // Tier discount state (automatically applied based on membership tier)
  appliedTierDiscount: import('@/lib/api/cart-pricing').AppliedTierDiscount | null

  // Cart operations (async)
  addToCart: (variantId: string, quantity: number) => Promise<void>
  removeFromCart: (lineItemId: string) => Promise<void>
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>

  // Price sync operations (for checkout)
  syncPricesBeforeCheckout: () => Promise<import('@/lib/api/cart-pricing').SyncPricesResponse | null>

  // Coupon operations
  applyCoupon: (code: string) => Promise<void>
  removeCoupon: () => Promise<void>
  validateCoupon: (code: string) => Promise<import('@/lib/api/coupon').ValidateCouponResponse>

  // Points operations
  applyPoints: (points: number) => Promise<void>
  removePoints: () => Promise<void>
  loadPointsBalance: () => Promise<void>

  // Membership promo operations
  applyMembershipPromo: () => Promise<void>
  removeMembershipPromo: () => Promise<void>

  // Cart update operations
  updateEmail: (email: string) => Promise<void>
  updateShippingAddress: (address: import('@/lib/api/cart').MedusaCartAddress) => Promise<void>
  updateCartMetadata: (metadata: Record<string, unknown>) => Promise<void>

  // Customer cart linking
  transferToCustomer: () => Promise<void>
}

export type Order = {
  id: string
  confirmationNumber: string
  customerName: string
  customerEmail: string
  items: CartItem[]
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  shippingMethod: string
  shippingAddress: {
    firstName: string
    lastName: string
    address: string
    apartment?: string
    city: string
    province: string
    postalCode: string
    country: string
  }
  paymentMethod: string
  createdAt: string
}
