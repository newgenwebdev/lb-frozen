/**
 * Cart Validation Utility
 *
 * Validates cart items for:
 * 1. Bulk pricing eligibility - ensures quantity meets min_quantity for applied tier
 * 2. PWP eligibility - ensures cart value (excluding PWP items) meets minimum threshold
 *
 * This prevents pricing exploits where:
 * - User adds 5 items to get bulk discount, then removes 1 item but keeps bulk price
 * - User adds $100 worth to get PWP 50% off, then removes items but keeps PWP discount
 */

export interface CartItem {
  id: string
  variant_id: string | null
  quantity: number
  unit_price: number
  metadata?: {
    is_pwp_item?: boolean
    pwp_rule_id?: string
    pwp_rule_name?: string
    pwp_original_price?: number
    pwp_discount_amount?: number
    pwp_trigger_type?: string
    pwp_trigger_cart_value?: number
    pwp_trigger_product_id?: string
    is_bulk_price?: boolean
    bulk_min_quantity?: number
    bulk_tier_price?: number
    original_unit_price?: number
    is_variant_discount?: boolean
    variant_discount_amount?: number
    variant_discount_type?: string
  } | null
  adjustments?: Array<{
    id: string
    code: string
    amount: number
  }>
}

export interface ValidationIssue {
  item_id: string
  variant_id: string | null
  issue_type: "pwp_ineligible" | "bulk_quantity_below_minimum" | "trigger_product_removed"
  message: string
  current_value?: number
  required_value?: number
  recommended_action: "remove_item" | "revert_to_regular_price" | "remove_discount"
}

export interface ValidationResult {
  is_valid: boolean
  issues: ValidationIssue[]
  cart_value_excluding_pwp: number
  pwp_items: CartItem[]
  bulk_priced_items: CartItem[]
}

/**
 * Calculate cart value excluding PWP items
 * This is used to determine PWP eligibility
 */
export function calculateCartValueExcludingPWP(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    // Skip PWP items - they shouldn't count toward minimum cart value
    if (item.metadata?.is_pwp_item) return sum

    const unitPrice = Number(item.unit_price) || 0
    const qty = Number(item.quantity) || 0
    return sum + unitPrice * qty
  }, 0)
}

/**
 * Calculate cart value using original prices for bulk items
 * This gives us the "true" cart value before bulk discounts
 */
export function calculateCartValueAtOriginalPrices(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    if (item.metadata?.is_pwp_item) return sum

    // Use original price if available, otherwise current unit_price
    const unitPrice = item.metadata?.original_unit_price
      ? Number(item.metadata.original_unit_price)
      : Number(item.unit_price) || 0

    const qty = Number(item.quantity) || 0
    return sum + unitPrice * qty
  }, 0)
}

/**
 * Validate PWP item eligibility
 * PWP items require certain conditions to be met (cart value or trigger product)
 */
export function validatePWPItem(
  pwpItem: CartItem,
  allItems: CartItem[],
  cartValueExcludingPWP: number
): ValidationIssue | null {
  const metadata = pwpItem.metadata
  if (!metadata?.is_pwp_item) return null

  const triggerType = metadata.pwp_trigger_type

  if (triggerType === "cart_value") {
    const minCartValue = metadata.pwp_trigger_cart_value || 0

    if (cartValueExcludingPWP < minCartValue) {
      return {
        item_id: pwpItem.id,
        variant_id: pwpItem.variant_id,
        issue_type: "pwp_ineligible",
        message: `Cart value ($${(cartValueExcludingPWP / 100).toFixed(2)}) is below the minimum ($${(minCartValue / 100).toFixed(2)}) required for "${metadata.pwp_rule_name}" offer`,
        current_value: cartValueExcludingPWP,
        required_value: minCartValue,
        recommended_action: "remove_item",
      }
    }
  } else if (triggerType === "product") {
    const triggerProductId = metadata.pwp_trigger_product_id

    if (triggerProductId) {
      // Check if trigger product variant is still in cart
      // Note: We need variant's product_id, which isn't stored here
      // This check would need to be done at API level with product module access
      // For now, we'll skip this check in the utility
    }
  }

  return null
}

/**
 * Validate bulk priced item eligibility
 * Bulk items require minimum quantity to qualify for tier pricing
 */
export function validateBulkPricedItem(item: CartItem): ValidationIssue | null {
  const metadata = item.metadata
  if (!metadata?.is_bulk_price) return null

  const minQuantity = metadata.bulk_min_quantity || 1
  const currentQty = item.quantity || 0

  if (currentQty < minQuantity) {
    return {
      item_id: item.id,
      variant_id: item.variant_id,
      issue_type: "bulk_quantity_below_minimum",
      message: `Quantity (${currentQty}) is below the minimum (${minQuantity}) required for bulk pricing`,
      current_value: currentQty,
      required_value: minQuantity,
      recommended_action: "revert_to_regular_price",
    }
  }

  return null
}

/**
 * Full cart validation
 * Checks all items for pricing eligibility issues
 */
export function validateCart(items: CartItem[]): ValidationResult {
  const issues: ValidationIssue[] = []
  const pwpItems: CartItem[] = []
  const bulkPricedItems: CartItem[] = []

  // Calculate cart value excluding PWP items
  const cartValueExcludingPWP = calculateCartValueExcludingPWP(items)

  for (const item of items) {
    // Check PWP items
    if (item.metadata?.is_pwp_item) {
      pwpItems.push(item)
      const pwpIssue = validatePWPItem(item, items, cartValueExcludingPWP)
      if (pwpIssue) {
        issues.push(pwpIssue)
      }
    }

    // Check bulk priced items
    if (item.metadata?.is_bulk_price) {
      bulkPricedItems.push(item)
      const bulkIssue = validateBulkPricedItem(item)
      if (bulkIssue) {
        issues.push(bulkIssue)
      }
    }
  }

  return {
    is_valid: issues.length === 0,
    issues,
    cart_value_excluding_pwp: cartValueExcludingPWP,
    pwp_items: pwpItems,
    bulk_priced_items: bulkPricedItems,
  }
}

/**
 * Get appropriate bulk tier price for a given quantity
 * Returns the tier price and minimum quantity, or null if no bulk pricing applies
 */
export function getApplicableBulkTier(
  quantity: number,
  priceTiers: Array<{
    amount: number
    min_quantity: number | null
    max_quantity: number | null
    currency_code: string
  }>,
  currencyCode: string = "sgd"
): { amount: number; min_quantity: number; max_quantity: number | null } | null {
  // Filter by currency and sort by min_quantity descending (highest tier first)
  const applicableTiers = priceTiers
    .filter((tier) => tier.currency_code.toLowerCase() === currencyCode.toLowerCase())
    .filter((tier) => tier.min_quantity && tier.min_quantity > 1) // Only bulk tiers
    .sort((a, b) => (b.min_quantity || 0) - (a.min_quantity || 0))

  // Find the highest tier where quantity meets minimum
  for (const tier of applicableTiers) {
    const minQty = tier.min_quantity || 1
    const maxQty = tier.max_quantity || Infinity

    if (quantity >= minQty && quantity <= maxQty) {
      return {
        amount: tier.amount,
        min_quantity: minQty,
        max_quantity: tier.max_quantity,
      }
    }
  }

  return null
}

/**
 * Get base (non-bulk) price for a variant
 */
export function getBasePrice(
  priceTiers: Array<{
    amount: number
    min_quantity: number | null
    currency_code: string
  }>,
  currencyCode: string = "sgd"
): number | null {
  const basePrice = priceTiers.find(
    (tier) =>
      tier.currency_code.toLowerCase() === currencyCode.toLowerCase() &&
      (!tier.min_quantity || tier.min_quantity <= 1)
  )

  return basePrice ? basePrice.amount : null
}
