'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { CartContextType } from '@/lib/types/cart'
import type { MedusaCart, MedusaCartLineItem, MedusaCartAddress } from '@/lib/api/cart'
import {
  getOrCreateCart,
  getCart,
  addLineItem,
  updateLineItem,
  removeLineItem,
  updateCart,
  getStoredCartId,
  clearStoredCartId,
  createCart,
  transferCartToCustomer,
  getLineItemEffectivePrice,
} from '@/lib/api/cart'
import {
  fetchCartWithPricing,
  getPriceForQuantity,
  syncCartPrices,
  calculateCartTotalsWithPricing,
  getAppliedTierDiscountFromCart,
  type BulkPricingMap,
  type PWPOffer,
  type SyncPricesResponse,
  type AppliedTierDiscount,
  type InventoryMap,
} from '@/lib/api/cart-pricing'
import {
  validateCouponCode,
  applyCouponCode,
  removeCouponCode,
  getAppliedCouponFromCart,
  type AppliedCoupon,
  type ValidateCouponResponse,
} from '@/lib/api/coupon'
import {
  getPointsBalance,
  applyPointsToCart,
  removePointsFromCart,
  getAppliedPointsFromCart,
  type AppliedPoints,
  type PointsBalanceResponse,
} from '@/lib/api/points'
import {
  applyMembershipPromo as applyMembershipPromoApi,
  removeMembershipPromo as removeMembershipPromoApi,
  getAppliedMembershipPromoFromCart,
  type AppliedMembershipPromo,
} from '@/lib/api/membership-promo'

const CartContext = createContext<CartContextType | undefined>(undefined)

// Debounce delay for quantity updates (ms)
const QUANTITY_UPDATE_DEBOUNCE = 500

export const CartProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const [medusaCart, setMedusaCart] = useState<MedusaCart | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Bulk pricing state - for instant local price calculations
  const [bulkPricingMap, setBulkPricingMap] = useState<BulkPricingMap>({})
  const [pwpOffers, setPwpOffers] = useState<PWPOffer[]>([])

  // Inventory state - variant_id -> available quantity
  const [inventoryMap, setInventoryMap] = useState<InventoryMap>({})

  // Coupon state
  const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  // Points state
  const [pointsBalance, setPointsBalance] = useState<PointsBalanceResponse | null>(null)
  const [isApplyingPoints, setIsApplyingPoints] = useState<boolean>(false)
  const [pointsError, setPointsError] = useState<string | null>(null)

  // Membership promo state
  const [isApplyingMembershipPromo, setIsApplyingMembershipPromo] = useState<boolean>(false)
  const [membershipPromoError, setMembershipPromoError] = useState<string | null>(null)

  // Track pending server sync for debouncing (like search - sync after user stops)
  const pendingSyncRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Queue for cart operations to prevent concurrent API calls
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve())

  // Track items that are being deleted (to prevent them from reappearing)
  const deletingItemsRef = useRef<Set<string>>(new Set())

  // Version counter to track cart state changes - prevents stale API responses from overwriting newer state
  const cartVersionRef = useRef<number>(0)

  // Helper to set cart while filtering out items marked for deletion
  // Returns false if the update was rejected due to version mismatch
  const setCartSafely = useCallback((cart: MedusaCart, expectedVersion?: number): boolean => {
    // If a version was provided, check it matches current version
    // This prevents stale API responses from overwriting newer optimistic updates
    if (expectedVersion !== undefined && expectedVersion !== cartVersionRef.current) {
      return false
    }

    if (deletingItemsRef.current.size === 0) {
      setMedusaCart(cart)
      return true
    }

    // Filter out any items that are being deleted
    const filteredItems = cart.items?.filter(
      (item) => !deletingItemsRef.current.has(item.id)
    ) || []

    const filteredSubtotal = filteredItems.reduce(
      (sum, item) => sum + (item.unit_price || 0) * item.quantity,
      0
    )

    setMedusaCart({
      ...cart,
      items: filteredItems,
      subtotal: filteredSubtotal,
      item_total: filteredSubtotal,
      total: filteredSubtotal + (cart.shipping_total || 0) + (cart.tax_total || 0),
    })
    return true
  }, [])

  // Initialize cart on mount
  useEffect(() => {
    const initializeCart = async (): Promise<void> => {
      try {
        setIsLoading(true)
        setError(null)

        // First get or create the cart
        const cart = await getOrCreateCart()
        setMedusaCart(cart)

        // If cart has items, sync prices to ensure discounts are applied correctly
        // This handles items added before discount features were implemented
        if (cart.id && cart.items && cart.items.length > 0) {
          try {
            // Sync prices first to update item metadata (variant discounts, bulk pricing)
            const syncResult = await syncCartPrices(cart.id)
            if (syncResult.cart) {
              // Refetch full cart to get all fields after sync
              const syncedCart = await getCart(cart.id)
              if (syncedCart) {
                setMedusaCart(syncedCart)
              }
            }
          } catch (syncErr) {
            // Non-critical - sync failed but cart is still usable
            console.warn('Failed to sync cart prices on init:', syncErr)
          }

          // Then fetch bulk pricing data and inventory for local calculations
          try {
            const pricingData = await fetchCartWithPricing(cart.id)
            setBulkPricingMap(pricingData.pricing.bulk_pricing_map)
            setPwpOffers(pricingData.pricing.pwp_offers)
            setInventoryMap(pricingData.inventory || {})
          } catch (pricingErr) {
            // Non-critical - local pricing just won't be available
            console.warn('Failed to fetch bulk pricing data:', pricingErr)
          }
        }
      } catch (err) {
        console.error('Failed to initialize cart:', err)
        setError('Failed to load cart')
      } finally {
        setIsLoading(false)
      }
    }

    initializeCart()
  }, [])

  // Computed values from Medusa cart
  const items: MedusaCartLineItem[] = medusaCart?.items || []

  // Calculate subtotal using local bulk pricing when available
  // This provides instant price updates without waiting for server
  const localPricingResult = Object.keys(bulkPricingMap).length > 0
    ? calculateCartTotalsWithPricing(
        items.map((item) => ({
          id: item.id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          metadata: item.metadata,
        })),
        bulkPricingMap
      )
    : null

  // Use local calculation if available, otherwise fall back to server prices
  const calculatedSubtotal = localPricingResult
    ? localPricingResult.subtotal - localPricingResult.pwpDiscount
    : items.reduce((sum, item) => {
        const effectivePrice = getLineItemEffectivePrice(item)
        return sum + effectivePrice * item.quantity
      }, 0)

  const subtotal = calculatedSubtotal // Always use our calculated subtotal which includes adjustments
  const total = medusaCart?.total || subtotal
  const itemCount = localPricingResult?.itemCount ?? items.reduce((sum, item) => sum + item.quantity, 0)

  // Extract applied coupon from cart metadata
  const appliedCoupon: AppliedCoupon | null = medusaCart ? getAppliedCouponFromCart(medusaCart) : null

  // Extract applied points from cart metadata
  const appliedPoints: AppliedPoints | null = medusaCart ? getAppliedPointsFromCart(medusaCart) : null

  // Extract applied membership promo from cart metadata
  const appliedMembershipPromo: AppliedMembershipPromo | null = medusaCart ? getAppliedMembershipPromoFromCart(medusaCart) : null

  // Extract applied tier discount from cart metadata (automatically applied based on membership tier)
  const appliedTierDiscount: AppliedTierDiscount | null = medusaCart ? getAppliedTierDiscountFromCart(medusaCart) : null

  // Refresh cart from server (including bulk pricing and inventory data)
  const refreshCart = useCallback(async (): Promise<void> => {
    const cartId = getStoredCartId()
    if (!cartId) {
      setMedusaCart(null)
      setBulkPricingMap({})
      setPwpOffers([])
      setInventoryMap({})
      return
    }

    try {
      setIsLoading(true)
      const cart = await getCart(cartId)

      // Recalculate tier discount based on cart's actual NET subtotal
      // This ensures consistency regardless of what the server returns
      if (cart && cart.items && cart.items.length > 0) {
        const netSubtotal = cart.items.reduce((sum, item) => {
          if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
            const discount = Number(item.metadata.pwp_discount_amount) || 0
            return sum + (item.unit_price - discount) * item.quantity
          }
          return sum + (item.unit_price || 0) * item.quantity
        }, 0)

        const tierPercentage = Number(cart.metadata?.tier_discount_percentage) || 0
        const recalculatedTierDiscount = tierPercentage > 0
          ? Math.round(netSubtotal * tierPercentage / 100)
          : 0

        setMedusaCart({
          ...cart,
          metadata: {
            ...cart.metadata,
            tier_discount_amount: recalculatedTierDiscount,
          },
        })
      } else {
        setMedusaCart(cart)
      }

      // Also refresh bulk pricing and inventory data
      if (cart && cart.items && cart.items.length > 0) {
        try {
          const pricingData = await fetchCartWithPricing(cartId)
          setBulkPricingMap(pricingData.pricing.bulk_pricing_map)
          setPwpOffers(pricingData.pricing.pwp_offers)
          setInventoryMap(pricingData.inventory || {})
        } catch (pricingErr) {
          console.warn('Failed to fetch bulk pricing data:', pricingErr)
        }
      } else {
        setBulkPricingMap({})
        setPwpOffers([])
        setInventoryMap({})
      }
    } catch (err) {
      console.error('Failed to refresh cart:', err)
      setError('Failed to refresh cart')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Add item to cart (with optimistic update)
  // Uses local bulk pricing map for instant price updates
  const addToCart = useCallback(async (variantId: string, quantity: number): Promise<void> => {
    // Store previous state for rollback
    const previousCart = medusaCart
    const previousPricingMap = bulkPricingMap

    try {
      setError(null)

      // Get or create cart if needed
      let cart = medusaCart
      if (!cart) {
        cart = await getOrCreateCart()
        setMedusaCart(cart)
      }

      // Check if variant already exists in cart
      const existingItem = cart.items?.find((item) => item.variant_id === variantId)

      if (existingItem) {
        // Calculate new quantity and get correct price from local pricing
        const newQuantity = existingItem.quantity + quantity
        const hasPricingData = Object.keys(bulkPricingMap).length > 0

        // Optimistic update: update quantity in UI immediately with correct price
        const optimisticItems = cart.items?.map((item) => {
          if (item.id !== existingItem.id) return item

          // For non-PWP items, calculate the correct price based on bulk pricing
          if (!item.metadata?.is_pwp_item && item.variant_id && hasPricingData) {
            const { price: correctPrice } = getPriceForQuantity(item.variant_id, newQuantity, bulkPricingMap)
            const newUnitPrice = correctPrice > 0 ? correctPrice : item.unit_price
            return { ...item, quantity: newQuantity, unit_price: newUnitPrice }
          }

          return { ...item, quantity: newQuantity }
        }) || []

        // Calculate subtotal with correct pricing
        const optimisticSubtotal = optimisticItems.reduce((sum, item) => {
          if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
            const discount = Number(item.metadata.pwp_discount_amount) || 0
            return sum + (item.unit_price - discount) * item.quantity
          }
          return sum + (item.unit_price || 0) * item.quantity
        }, 0)

        // Recalculate tier discount optimistically based on new subtotal
        // Tier discount is percentage-based, so it must be updated when subtotal changes
        const currentTierPercentage = Number(cart.metadata?.tier_discount_percentage) || 0
        const newTierDiscountAmount = currentTierPercentage > 0
          ? Math.round(optimisticSubtotal * currentTierPercentage / 100)
          : 0
        const updatedMetadata = currentTierPercentage > 0
          ? { ...cart.metadata, tier_discount_amount: newTierDiscountAmount }
          : cart.metadata

        setMedusaCart({
          ...cart,
          items: optimisticItems,
          subtotal: optimisticSubtotal,
          item_total: optimisticSubtotal,
          total: optimisticSubtotal + (cart.shipping_total || 0) + (cart.tax_total || 0),
          metadata: updatedMetadata,
        })

        // Sync with server in background
        const updatedCart = await updateLineItem(cart.id, existingItem.id, {
          quantity: newQuantity,
        })

        // Recalculate tier discount based on server cart's actual subtotal
        // Server response may have stale tier_discount_amount
        const serverSubtotal = updatedCart.items?.reduce((sum, item) => {
          if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
            const discount = Number(item.metadata.pwp_discount_amount) || 0
            return sum + (item.unit_price - discount) * item.quantity
          }
          return sum + (item.unit_price || 0) * item.quantity
        }, 0) || 0

        const tierPercentage = Number(updatedCart.metadata?.tier_discount_percentage) || 0
        const recalculatedTierDiscount = tierPercentage > 0
          ? Math.round(serverSubtotal * tierPercentage / 100)
          : 0

        setMedusaCart({
          ...updatedCart,
          metadata: {
            ...updatedCart.metadata,
            tier_discount_amount: recalculatedTierDiscount,
          },
        })
      } else {
        // For new items, use local pricing if available
        const hasPricingData = Object.keys(bulkPricingMap).length > 0
        const { price: estimatedPrice } = hasPricingData
          ? getPriceForQuantity(variantId, quantity, bulkPricingMap)
          : { price: 0 }

        // Optimistic update: add placeholder item to UI immediately
        const placeholderItem: MedusaCartLineItem = {
          id: `temp_${Date.now()}`,
          variant_id: variantId,
          product_id: '',
          quantity,
          unit_price: estimatedPrice, // Use local price if available
          title: 'Adding...',
          subtitle: null,
          thumbnail: null,
        }
        const optimisticItems = [...(cart.items || []), placeholderItem]

        // Calculate new subtotal including the placeholder item
        const optimisticSubtotal = optimisticItems.reduce((sum, item) => {
          if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
            const discount = Number(item.metadata.pwp_discount_amount) || 0
            return sum + (item.unit_price - discount) * item.quantity
          }
          return sum + (item.unit_price || 0) * item.quantity
        }, 0)

        // Recalculate tier discount optimistically based on new subtotal
        const currentTierPercentage = Number(cart.metadata?.tier_discount_percentage) || 0
        const newTierDiscountAmount = currentTierPercentage > 0
          ? Math.round(optimisticSubtotal * currentTierPercentage / 100)
          : 0
        const updatedMetadata = currentTierPercentage > 0
          ? { ...cart.metadata, tier_discount_amount: newTierDiscountAmount }
          : cart.metadata

        setMedusaCart({
          ...cart,
          items: optimisticItems,
          subtotal: optimisticSubtotal,
          item_total: optimisticSubtotal,
          total: optimisticSubtotal + (cart.shipping_total || 0) + (cart.tax_total || 0),
          metadata: updatedMetadata,
        })

        // Sync with server
        const updatedCart = await addLineItem(cart.id, {
          variant_id: variantId,
          quantity,
        })

        // Recalculate tier discount based on server cart's actual subtotal
        // Server response may have stale tier_discount_amount
        const serverSubtotal = updatedCart.items?.reduce((sum, item) => {
          if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
            const discount = Number(item.metadata.pwp_discount_amount) || 0
            return sum + (item.unit_price - discount) * item.quantity
          }
          return sum + (item.unit_price || 0) * item.quantity
        }, 0) || 0

        const tierPercentage = Number(updatedCart.metadata?.tier_discount_percentage) || 0
        const recalculatedTierDiscount = tierPercentage > 0
          ? Math.round(serverSubtotal * tierPercentage / 100)
          : 0

        setMedusaCart({
          ...updatedCart,
          metadata: {
            ...updatedCart.metadata,
            tier_discount_amount: recalculatedTierDiscount,
          },
        })

        // Refresh bulk pricing and inventory data to include the new variant
        if (updatedCart.id) {
          try {
            const pricingData = await fetchCartWithPricing(updatedCart.id)
            setBulkPricingMap(pricingData.pricing.bulk_pricing_map)
            setPwpOffers(pricingData.pricing.pwp_offers)
            setInventoryMap(pricingData.inventory || {})
          } catch (pricingErr) {
            console.warn('Failed to fetch bulk pricing after add:', pricingErr)
          }
        }
      }
    } catch (err: unknown) {
      // Check if error is due to currency mismatch (variant has no price in cart's currency)
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (errorMessage.includes('do not have a price')) {
        console.warn('Cart currency mismatch detected, creating new cart...')
        // Clear old cart and create a new one with correct region/currency
        clearStoredCartId()
        const newCart = await createCart()
        setMedusaCart(newCart)
        setBulkPricingMap({})
        setPwpOffers([])
        setInventoryMap({})

        // Retry adding the item to the new cart
        const updatedCart = await addLineItem(newCart.id, {
          variant_id: variantId,
          quantity,
        })
        setMedusaCart(updatedCart)

        // Fetch pricing and inventory for the new cart
        if (updatedCart.id) {
          try {
            const pricingData = await fetchCartWithPricing(updatedCart.id)
            setBulkPricingMap(pricingData.pricing.bulk_pricing_map)
            setPwpOffers(pricingData.pricing.pwp_offers)
            setInventoryMap(pricingData.inventory || {})
          } catch (pricingErr) {
            console.warn('Failed to fetch bulk pricing:', pricingErr)
          }
        }
        return
      }

      // Rollback on error
      setMedusaCart(previousCart)
      setBulkPricingMap(previousPricingMap)
      console.error('Failed to add to cart:', err)
      setError('Failed to add item to cart')
      throw err
    }
  }, [medusaCart, bulkPricingMap])

  // Remove item from cart (with optimistic update)
  const removeFromCart = useCallback(async (lineItemId: string): Promise<void> => {
    if (!medusaCart) return

    // Cancel any pending sync for this item
    const pendingSync = pendingSyncRef.current.get(lineItemId)
    if (pendingSync) {
      clearTimeout(pendingSync)
      pendingSyncRef.current.delete(lineItemId)
    }

    // Mark item as being deleted (prevents it from reappearing if other API calls complete)
    deletingItemsRef.current.add(lineItemId)

    // Increment version to invalidate any in-flight API responses
    cartVersionRef.current += 1
    const deleteVersion = cartVersionRef.current

    // Store previous state for rollback
    const previousCart = medusaCart
    const cartId = medusaCart.id

    // Optimistic update: remove item from UI immediately
    const optimisticItems = medusaCart.items?.filter((item) => item.id !== lineItemId) || []
    const optimisticSubtotal = optimisticItems.reduce((sum, item) => {
      if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
        const discount = Number(item.metadata.pwp_discount_amount) || 0
        return sum + (item.unit_price - discount) * item.quantity
      }
      return sum + (item.unit_price || 0) * item.quantity
    }, 0)

    // Recalculate tier discount optimistically based on new subtotal
    const currentTierPercentage = Number(medusaCart.metadata?.tier_discount_percentage) || 0
    const newTierDiscountAmount = currentTierPercentage > 0
      ? Math.round(optimisticSubtotal * currentTierPercentage / 100)
      : 0
    const updatedMetadata = currentTierPercentage > 0
      ? { ...medusaCart.metadata, tier_discount_amount: newTierDiscountAmount }
      : medusaCart.metadata

    setMedusaCart({
      ...medusaCart,
      items: optimisticItems,
      subtotal: optimisticSubtotal,
      item_total: optimisticSubtotal,
      total: optimisticSubtotal + (medusaCart.shipping_total || 0) + (medusaCart.tax_total || 0),
      metadata: updatedMetadata,
    })

    // Queue the API call to prevent concurrent operations
    operationQueueRef.current = operationQueueRef.current.then(async () => {
      try {
        setError(null)
        await removeLineItem(cartId, lineItemId)
        // Clear the deleting flag after successful deletion
        deletingItemsRef.current.delete(lineItemId)

        // After item removal, sync prices to recalculate tier discount on server
        // Then recalculate tier discount locally based on new subtotal
        if (cartVersionRef.current === deleteVersion) {
          try {
            await syncCartPrices(cartId)
            // Refetch full cart to get updated items
            const syncedCart = await getCart(cartId)
            if (syncedCart && cartVersionRef.current === deleteVersion) {
              // Recalculate tier discount based on synced cart's actual subtotal
              // This ensures consistency with server state
              const syncedSubtotal = syncedCart.items?.reduce((sum, item) => {
                if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
                  const discount = Number(item.metadata.pwp_discount_amount) || 0
                  return sum + (item.unit_price - discount) * item.quantity
                }
                return sum + (item.unit_price || 0) * item.quantity
              }, 0) || 0

              const tierPercentage = Number(syncedCart.metadata?.tier_discount_percentage) || 0
              const recalculatedTierDiscount = tierPercentage > 0
                ? Math.round(syncedSubtotal * tierPercentage / 100)
                : 0

              const correctedMetadata = {
                ...syncedCart.metadata,
                tier_discount_amount: recalculatedTierDiscount,
              }
              setCartSafely({
                ...syncedCart,
                metadata: correctedMetadata,
              }, deleteVersion)
            }
          } catch (syncErr) {
            // Non-critical - tier discount sync failed but cart is still usable
            // Keep the optimistic state which has correct tier discount
            console.warn('Failed to sync tier discount after item removal:', syncErr)
          }
        }
      } catch (err) {
        // Clear the deleting flag and rollback on error (only if version matches)
        deletingItemsRef.current.delete(lineItemId)
        if (cartVersionRef.current === deleteVersion) {
          setMedusaCart(previousCart)
        }
        console.error('Failed to remove from cart:', err)
        setError('Failed to remove item from cart')
        throw err
      }
    })

    return operationQueueRef.current
  }, [medusaCart])

  // Update item quantity - simple approach like search input:
  // 1. Update local state immediately with correct bulk price
  // 2. Debounce server sync - only sync when user stops clicking
  const updateQuantity = useCallback(async (lineItemId: string, quantity: number): Promise<void> => {
    if (!medusaCart) return

    setError(null)

    // Handle removal
    if (quantity <= 0) {
      // Cancel any pending sync for this item
      const pendingSync = pendingSyncRef.current.get(lineItemId)
      if (pendingSync) {
        clearTimeout(pendingSync)
        pendingSyncRef.current.delete(lineItemId)
      }
      await removeFromCart(lineItemId)
      return
    }

    // ============================================
    // STEP 1: Update local state immediately
    // ============================================
    const updatedItems = medusaCart.items?.map((item) => {
      if (item.id !== lineItemId) return item

      // Calculate correct price from local bulk pricing data
      let newUnitPrice = item.unit_price
      const hasPricingData = Object.keys(bulkPricingMap).length > 0

      if (!item.metadata?.is_pwp_item && item.variant_id && hasPricingData) {
        const pricingResult = getPriceForQuantity(item.variant_id, quantity, bulkPricingMap)
        if (pricingResult.price > 0) {
          newUnitPrice = pricingResult.price
        }
      }

      return { ...item, quantity, unit_price: newUnitPrice }
    }) || []

    // Calculate new subtotal locally
    const newSubtotal = updatedItems.reduce((sum, item) => {
      if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
        const discount = Number(item.metadata.pwp_discount_amount) || 0
        return sum + (item.unit_price - discount) * item.quantity
      }
      return sum + (item.unit_price || 0) * item.quantity
    }, 0)

    // Calculate tier discount optimistically based on new subtotal
    // Tier discount = subtotal * (tier_discount_percentage / 100)
    const currentTierPercentage = Number(medusaCart.metadata?.tier_discount_percentage) || 0
    const newTierDiscountAmount = currentTierPercentage > 0
      ? Math.round(newSubtotal * currentTierPercentage / 100)
      : 0

    // Build updated metadata with recalculated tier discount
    const updatedMetadata = currentTierPercentage > 0
      ? {
          ...medusaCart.metadata,
          tier_discount_amount: newTierDiscountAmount,
        }
      : medusaCart.metadata

    // Update state immediately - user sees change instantly
    setMedusaCart({
      ...medusaCart,
      items: updatedItems,
      subtotal: newSubtotal,
      item_total: newSubtotal,
      total: newSubtotal + (medusaCart.shipping_total || 0) + (medusaCart.tax_total || 0),
      metadata: updatedMetadata,
    })

    // ============================================
    // STEP 2: Debounce server sync (like search)
    // ============================================
    // Cancel previous pending sync for this item
    const existingSync = pendingSyncRef.current.get(lineItemId)
    if (existingSync) {
      clearTimeout(existingSync)
    }

    // Schedule new sync - only fires when user stops clicking
    const cartId = medusaCart.id
    const syncTimeout = setTimeout(async () => {
      pendingSyncRef.current.delete(lineItemId)

      // Skip if item was deleted while waiting
      if (deletingItemsRef.current.has(lineItemId)) return

      try {
        // Sync current quantity to server (server updates its state)
        await updateLineItem(cartId, lineItemId, { quantity })

        // After quantity update, sync prices to recalculate tier discount
        // Tier discount is percentage-based on subtotal, so it must be recalculated
        try {
          const syncResult = await syncCartPrices(cartId)
          if (syncResult.cart) {
            // Refetch full cart to get updated tier discount in metadata
            const syncedCart = await getCart(cartId)
            if (syncedCart) {
              setCartSafely(syncedCart)
            }
          }
        } catch (syncErr) {
          // Non-critical - tier discount sync failed but cart is still usable
          console.warn('Failed to sync tier discount after quantity update:', syncErr)
        }
      } catch (err) {
        // Server sync failed - this is non-critical since local state is correct
        // Only refresh if it's NOT a 500 error (which is likely a transient server issue)
        const errorStatus = (err as { status?: number })?.status
        if (errorStatus !== 500) {
          // On non-500 error (like 404 stale item), refresh to get server state
          refreshCart()
        }
        // For 500 errors, local state is already correct from bulk pricing map
      }
    }, QUANTITY_UPDATE_DEBOUNCE)

    pendingSyncRef.current.set(lineItemId, syncTimeout)
  }, [medusaCart, removeFromCart, bulkPricingMap, refreshCart, setCartSafely])

  // Clear cart (create a new one)
  const clearCart = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      clearStoredCartId()
      const newCart = await createCart()
      setMedusaCart(newCart)
    } catch (err) {
      console.error('Failed to clear cart:', err)
      setError('Failed to clear cart')
      throw err
    }
  }, [])

  // Update email
  const updateEmail = useCallback(async (email: string): Promise<void> => {
    if (!medusaCart) return

    try {
      setError(null)
      const updatedCart = await updateCart(medusaCart.id, { email })
      setMedusaCart(updatedCart)
    } catch (err) {
      console.error('Failed to update email:', err)
      setError('Failed to update email')
      throw err
    }
  }, [medusaCart])

  // Update shipping address
  const updateShippingAddress = useCallback(async (address: MedusaCartAddress): Promise<void> => {
    if (!medusaCart) return

    try {
      setError(null)
      const updatedCart = await updateCart(medusaCart.id, { shipping_address: address })
      setMedusaCart(updatedCart)
    } catch (err) {
      console.error('Failed to update shipping address:', err)
      setError('Failed to update shipping address')
      throw err
    }
  }, [medusaCart])

  // Update cart metadata
  const updateCartMetadata = useCallback(async (metadata: Record<string, unknown>): Promise<void> => {
    if (!medusaCart) return

    try {
      setError(null)
      // Merge with existing metadata
      const mergedMetadata = { ...medusaCart.metadata, ...metadata }
      const updatedCart = await updateCart(medusaCart.id, { metadata: mergedMetadata })
      setMedusaCart(updatedCart)
    } catch (err) {
      console.error('Failed to update cart metadata:', err)
      setError('Failed to update cart metadata')
      throw err
    }
  }, [medusaCart])

  // Transfer cart to logged-in customer
  const transferToCustomer = useCallback(async (): Promise<void> => {
    if (!medusaCart) return

    try {
      setError(null)
      const transferredCart = await transferCartToCustomer(medusaCart.id)
      if (transferredCart) {
        setMedusaCart(transferredCart)

        // After transfer, sync prices to apply tier discount
        // The customer is now authenticated and cart is linked, so tier discount can be calculated
        try {
          const syncResult = await syncCartPrices(transferredCart.id)
          if (syncResult.cart) {
            // Refetch full cart to get all fields including tier discount metadata
            const syncedCart = await getCart(transferredCart.id)
            if (syncedCart) {
              setMedusaCart(syncedCart)
            }
          }
        } catch (syncErr) {
          // Non-critical - sync failed but cart is still usable
          console.warn('Failed to sync cart prices after transfer:', syncErr)
        }
      }
    } catch (err) {
      console.error('Failed to transfer cart to customer:', err)
      // Don't throw - cart transfer is not critical for the login flow
    }
  }, [medusaCart])

  // Validate coupon code without applying
  const validateCoupon = useCallback(async (code: string): Promise<ValidateCouponResponse> => {
    if (!medusaCart) {
      throw new Error('Cart not initialized')
    }

    setCouponError(null)

    try {
      const result = await validateCouponCode(medusaCart.id, code)
      if (!result.valid && result.message) {
        setCouponError(result.message)
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate coupon'
      setCouponError(errorMessage)
      throw err
    }
  }, [medusaCart])

  // Apply coupon code to cart
  const applyCoupon = useCallback(async (code: string): Promise<void> => {
    if (!medusaCart) return

    setIsApplyingCoupon(true)
    setCouponError(null)

    try {
      const result = await applyCouponCode(medusaCart.id, code)
      setMedusaCart(result.cart)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply coupon'
      setCouponError(errorMessage)
      throw err
    } finally {
      setIsApplyingCoupon(false)
    }
  }, [medusaCart])

  // Remove coupon from cart
  const removeCoupon = useCallback(async (): Promise<void> => {
    if (!medusaCart) return

    setIsApplyingCoupon(true)
    setCouponError(null)

    try {
      const result = await removeCouponCode(medusaCart.id)
      setMedusaCart(result.cart)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove coupon'
      setCouponError(errorMessage)
      throw err
    } finally {
      setIsApplyingCoupon(false)
    }
  }, [medusaCart])

  // Load points balance for authenticated users
  const loadPointsBalance = useCallback(async (): Promise<void> => {
    try {
      const balance = await getPointsBalance()
      setPointsBalance(balance)
    } catch {
      // Points balance fetch failed - non-critical, user can retry
    }
  }, [])

  // Apply points as discount to cart
  const applyPoints = useCallback(async (pointsToRedeem: number): Promise<void> => {
    if (!medusaCart) return

    setIsApplyingPoints(true)
    setPointsError(null)

    try {
      const result = await applyPointsToCart(medusaCart.id, pointsToRedeem)
      setMedusaCart(result.cart)
      // Refresh points balance after applying
      await loadPointsBalance()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply points'
      setPointsError(errorMessage)
      throw err
    } finally {
      setIsApplyingPoints(false)
    }
  }, [medusaCart, loadPointsBalance])

  // Remove applied points from cart
  const removePoints = useCallback(async (): Promise<void> => {
    if (!medusaCart) return

    setIsApplyingPoints(true)
    setPointsError(null)

    try {
      const result = await removePointsFromCart(medusaCart.id)
      setMedusaCart(result.cart)
      // Refresh points balance after removing
      await loadPointsBalance()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove points'
      setPointsError(errorMessage)
      throw err
    } finally {
      setIsApplyingPoints(false)
    }
  }, [medusaCart, loadPointsBalance])

  // Apply membership promo to cart (automatically finds best promo)
  const applyMembershipPromo = useCallback(async (): Promise<void> => {
    if (!medusaCart) return

    setIsApplyingMembershipPromo(true)
    setMembershipPromoError(null)

    try {
      const result = await applyMembershipPromoApi(medusaCart.id)
      setMedusaCart(result.cart)
      if (!result.success && result.message) {
        setMembershipPromoError(result.message)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply membership promo'
      setMembershipPromoError(errorMessage)
      throw err
    } finally {
      setIsApplyingMembershipPromo(false)
    }
  }, [medusaCart])

  // Remove membership promo from cart
  const removeMembershipPromo = useCallback(async (): Promise<void> => {
    if (!medusaCart) return

    setIsApplyingMembershipPromo(true)
    setMembershipPromoError(null)

    try {
      const result = await removeMembershipPromoApi(medusaCart.id)
      setMedusaCart(result.cart)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove membership promo'
      setMembershipPromoError(errorMessage)
      throw err
    } finally {
      setIsApplyingMembershipPromo(false)
    }
  }, [medusaCart])

  // Sync prices with server before checkout
  // This ensures all bulk prices and PWP eligibility are correct
  const syncPricesBeforeCheckout = useCallback(async (): Promise<SyncPricesResponse | null> => {
    if (!medusaCart) return null

    try {
      setIsLoading(true)
      const syncResult = await syncCartPrices(medusaCart.id)

      // Update cart with synced data
      if (syncResult.cart) {
        // Refetch full cart to get all fields
        const updatedCart = await getCart(medusaCart.id)
        if (updatedCart) {
          setMedusaCart(updatedCart)
        }
      }

      // Refresh bulk pricing and inventory data
      try {
        const pricingData = await fetchCartWithPricing(medusaCart.id)
        setBulkPricingMap(pricingData.pricing.bulk_pricing_map)
        setPwpOffers(pricingData.pricing.pwp_offers)
        setInventoryMap(pricingData.inventory || {})
      } catch (pricingErr) {
        console.warn('Failed to fetch bulk pricing after sync:', pricingErr)
      }

      return syncResult
    } catch (err) {
      console.error('Failed to sync prices before checkout:', err)
      setError('Failed to sync cart prices')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [medusaCart])

  const value: CartContextType = {
    // Cart state
    medusaCart,
    isLoading,
    error,

    // Computed values
    items,
    subtotal,
    itemCount,
    total,

    // Bulk pricing data for instant local calculations
    bulkPricingMap,
    pwpOffers,

    // Inventory data: variant_id -> available quantity
    inventoryMap,

    // Promo/coupon state
    appliedCoupon,
    isApplyingCoupon,
    couponError,

    // Points state
    appliedPoints,
    pointsBalance,
    isApplyingPoints,
    pointsError,

    // Membership promo state
    appliedMembershipPromo,
    isApplyingMembershipPromo,
    membershipPromoError,

    // Tier discount state (automatically applied based on membership tier)
    appliedTierDiscount,

    // Cart operations
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart,

    // Price sync operations (for checkout)
    syncPricesBeforeCheckout,

    // Coupon operations
    applyCoupon,
    removeCoupon,
    validateCoupon,

    // Points operations
    applyPoints,
    removePoints,
    loadPointsBalance,

    // Membership promo operations
    applyMembershipPromo,
    removeMembershipPromo,

    // Update operations
    updateEmail,
    updateShippingAddress,
    updateCartMetadata,

    // Customer cart linking
    transferToCustomer,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = (): CartContextType => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
