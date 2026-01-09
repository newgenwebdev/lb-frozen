/**
 * Inventory API Functions
 *
 * API layer for inventory operations using Medusa Inventory Module
 * Medusa 2.x separates Product and Inventory into different modules
 */

import { api } from "./client"

export type StockLocation = {
  id: string
  name: string
  address?: {
    address_1?: string
    city?: string
    country_code?: string
  }
  metadata?: Record<string, unknown>
}

export type InventoryItem = {
  id: string
  sku?: string
  title?: string
  requires_shipping?: boolean
  metadata?: Record<string, unknown>
}

export type InventoryLevel = {
  id: string
  inventory_item_id: string
  location_id: string
  stocked_quantity: number
  reserved_quantity: number
  incoming_quantity: number
  available_quantity: number
}

/**
 * Get all stock locations
 */
export async function getStockLocations(): Promise<StockLocation[]> {
  const response = await api.get<{ stock_locations: StockLocation[] }>(
    "/admin/stock-locations"
  )
  return response.data.stock_locations
}

/**
 * Create inventory item for a variant
 */
export async function createInventoryItem(data: {
  sku?: string
  title?: string
}): Promise<InventoryItem> {
  const response = await api.post<{ inventory_item: InventoryItem }>(
    "/admin/inventory-items",
    data
  )
  return response.data.inventory_item
}

/**
 * Set stock level at a location
 */
export async function setInventoryLevel(
  inventoryItemId: string,
  locationId: string,
  quantity: number
): Promise<InventoryLevel> {
  const response = await api.post<{ inventory_level: InventoryLevel }>(
    `/admin/inventory-items/${inventoryItemId}/location-levels`,
    {
      location_id: locationId,
      stocked_quantity: quantity,
    }
  )
  return response.data.inventory_level
}

/**
 * Link inventory item to a product variant using the batch endpoint
 * This is CRITICAL for Medusa's order workflow to reduce stock when orders are placed
 */
export async function linkInventoryToVariant(
  productId: string,
  variantId: string,
  inventoryItemId: string,
  requiredQuantity: number = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    await api.post(
      `/admin/products/${productId}/variants/inventory-items/batch`,
      {
        create: [
          {
            variant_id: variantId,
            inventory_item_id: inventoryItemId,
            required_quantity: requiredQuantity,
          },
        ],
      }
    )
    return { success: true }
  } catch (error) {
    // If already linked, that's fine - treat as success
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
      return { success: true }
    }
    console.warn(`Could not link inventory to variant: ${errorMessage}`)
    return { success: false, error: errorMessage }
  }
}

/**
 * Setup inventory for a variant (combined operation with error tracking)
 * Handles case where Medusa 2.x auto-creates inventory item when manage_inventory is true
 *
 * Strategy: Try to find inventory item by SKU first, then create if not found
 * IMPORTANT: Also links inventory item to variant so Medusa can reduce stock on orders
 */
export async function setupVariantInventory(
  variant: { id: string; sku?: string; title: string; product_id?: string },
  quantity: number,
  locationId: string,
  productId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Allow setting quantity to 0 (user may want to clear inventory)

    // Strategy 1: Try to find inventory item by SKU (which Medusa uses when auto-creating)
    const sku = variant.sku || variant.id
    const existingItem = await findInventoryItemBySku(sku)

    // Resolve product ID from variant or parameter
    const resolvedProductId = productId || variant.product_id

    if (existingItem) {
      // Inventory item exists, set/update the stock level
      try {
        const levels = await getInventoryLevels(existingItem.id)
        const existingLevel = levels.find(l => l.location_id === locationId)

        if (existingLevel) {
          await updateInventoryLevel(existingItem.id, locationId, quantity)
        } else {
          await setInventoryLevel(existingItem.id, locationId, quantity)
        }
      } catch {
        // If getting levels fails, try to create it
        await setInventoryLevel(existingItem.id, locationId, quantity)
      }

      // CRITICAL: Link inventory item to variant so Medusa can reduce stock on orders
      if (resolvedProductId) {
        await linkInventoryToVariant(resolvedProductId, variant.id, existingItem.id)
      }

      return { success: true }
    }

    // Strategy 2: Create new inventory item if not found
    const invItem = await createInventoryItem({
      sku: sku,
      title: variant.title,
    })

    // Set stock level
    await setInventoryLevel(invItem.id, locationId, quantity)

    // CRITICAL: Link inventory item to variant so Medusa can reduce stock on orders
    if (resolvedProductId) {
      await linkInventoryToVariant(resolvedProductId, variant.id, invItem.id)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Find inventory item by SKU
 */
export async function findInventoryItemBySku(
  sku: string
): Promise<InventoryItem | null> {
  try {
    const response = await api.get<{ inventory_items: InventoryItem[] }>(
      `/admin/inventory-items`,
      { params: { sku } }
    )
    const items = response.data.inventory_items
    return items.length > 0 ? items[0] : null
  } catch (error) {
    console.warn(`Could not find inventory item by SKU ${sku}:`, error)
    return null
  }
}

// Note: getVariantInventoryItems removed - the endpoint /admin/product-variants/{id}/inventory-items
// has CORS issues. Use findInventoryItemBySku instead.

/**
 * Get inventory levels for an inventory item
 */
export async function getInventoryLevels(
  inventoryItemId: string
): Promise<InventoryLevel[]> {
  const response = await api.get<{ inventory_levels: InventoryLevel[] }>(
    `/admin/inventory-items/${inventoryItemId}/location-levels`
  )
  return response.data.inventory_levels
}

/**
 * Update inventory level at a location
 */
export async function updateInventoryLevel(
  inventoryItemId: string,
  locationId: string,
  quantity: number
): Promise<InventoryLevel> {
  const response = await api.post<{ inventory_level: InventoryLevel }>(
    `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
    { stocked_quantity: quantity }
  )
  return response.data.inventory_level
}

/**
 * Update variant inventory (for edit product flow)
 * Handles both existing inventory and new inventory setup
 * Uses SKU-based lookup for better compatibility
 */
export async function updateVariantInventory(
  variant: { id: string; sku?: string; title: string; product_id?: string },
  quantity: number,
  locationId: string,
  productId?: string
): Promise<{ success: boolean; error?: string }> {
  // Delegate to setupVariantInventory which handles both create and update
  return setupVariantInventory(variant, quantity, locationId, productId)
}

/**
 * Get all inventory items (with pagination)
 */
export async function getAllInventoryItems(): Promise<InventoryItem[]> {
  try {
    const response = await api.get<{ inventory_items: InventoryItem[] }>(
      `/admin/inventory-items`,
      { params: { limit: 100 } }
    )
    return response.data.inventory_items
  } catch (error) {
    console.warn(`Could not fetch inventory items:`, error)
    return []
  }
}

/**
 * Get all inventory items with their stock levels (batch fetch for product list)
 * Returns a map of SKU -> total stocked quantity
 */
export async function getInventoryQuantitiesMap(): Promise<Map<string, number>> {
  const quantityMap = new Map<string, number>()

  try {
    // Fetch all inventory items
    const items = await getAllInventoryItems()

    // For each item, fetch its levels and sum up quantities
    await Promise.all(
      items.map(async (item) => {
        if (!item.sku) return

        try {
          const levels = await getInventoryLevels(item.id)
          // Calculate available quantity: stocked - reserved
          // IMPORTANT: Check for undefined/null explicitly, not just falsy,
          // because available_quantity can be 0 (when all stock is reserved)
          const totalQuantity = levels.reduce((sum, level) => {
            // If available_quantity is defined (including 0), use it
            // Otherwise calculate from stocked - reserved
            if (typeof level.available_quantity === 'number') {
              return sum + level.available_quantity
            }
            const stocked = level.stocked_quantity || 0
            const reserved = level.reserved_quantity || 0
            return sum + Math.max(0, stocked - reserved)
          }, 0)
          quantityMap.set(item.sku, totalQuantity)
        } catch {
          // If we can't get levels, set quantity to 0
          quantityMap.set(item.sku, 0)
        }
      })
    )
  } catch (error) {
    console.warn("Could not fetch inventory quantities:", error)
  }

  return quantityMap
}

/**
 * Get full inventory details for a variant (stocked, reserved, available)
 * Returns all quantities needed for admin display and validation
 */
export async function getVariantInventoryDetails(
  variantId: string,
  sku?: string,
  locationId?: string
): Promise<{ stocked: number; reserved: number; available: number }> {
  try {
    let inventoryItem: InventoryItem | null = null

    // Strategy 1: Try SKU lookup first (most reliable)
    if (sku) {
      inventoryItem = await findInventoryItemBySku(sku)
    }

    // Strategy 2: Try using variant ID as SKU (Medusa sometimes uses this)
    if (!inventoryItem) {
      inventoryItem = await findInventoryItemBySku(variantId)
    }

    // Strategy 3: Fetch all inventory items and look for matches
    if (!inventoryItem) {
      const allItems = await getAllInventoryItems()
      inventoryItem = allItems.find(item =>
        item.sku === variantId ||
        item.sku === sku ||
        item.title === sku
      ) || null
    }

    if (!inventoryItem) {
      return { stocked: 0, reserved: 0, available: 0 }
    }

    const levels = await getInventoryLevels(inventoryItem.id)
    if (levels.length === 0) {
      return { stocked: 0, reserved: 0, available: 0 }
    }

    // If locationId is specified, find that specific location
    if (locationId) {
      const level = levels.find(l => l.location_id === locationId)
      if (level) {
        return {
          stocked: level.stocked_quantity || 0,
          reserved: level.reserved_quantity || 0,
          available: level.available_quantity || 0
        }
      }
      return { stocked: 0, reserved: 0, available: 0 }
    }

    // Otherwise return the first location's quantities
    const level = levels[0]
    return {
      stocked: level.stocked_quantity || 0,
      reserved: level.reserved_quantity || 0,
      available: level.available_quantity || 0
    }
  } catch (error) {
    console.warn(`Could not get inventory details for variant ${variantId}:`, error)
    return { stocked: 0, reserved: 0, available: 0 }
  }
}

/**
 * Get inventory quantity for a variant
 * In Medusa 2.x, inventory items are created with SKU matching the variant's SKU or ID
 * Falls back to searching all inventory items if SKU lookup fails
 */
export async function getVariantInventoryQuantity(
  variantId: string,
  sku?: string,
  locationId?: string
): Promise<number> {
  try {
    let inventoryItem: InventoryItem | null = null

    // Strategy 1: Try SKU lookup first (most reliable)
    if (sku) {
      inventoryItem = await findInventoryItemBySku(sku)
    }

    // Strategy 2: Try using variant ID as SKU (Medusa sometimes uses this)
    if (!inventoryItem) {
      inventoryItem = await findInventoryItemBySku(variantId)
    }

    // Strategy 3: Fetch all inventory items and look for matches
    if (!inventoryItem) {
      const allItems = await getAllInventoryItems()

      // Try to find by title or other metadata
      inventoryItem = allItems.find(item =>
        item.sku === variantId ||
        item.sku === sku ||
        item.title === sku
      ) || null
    }

    if (!inventoryItem) {
      return 0
    }

    const levels = await getInventoryLevels(inventoryItem.id)
    if (levels.length === 0) {
      return 0
    }

    // If locationId is specified, find that specific location
    // Use available_quantity (stocked - reserved) to show actual available stock
    if (locationId) {
      const level = levels.find(l => l.location_id === locationId)
      if (!level) return 0
      // Check for undefined explicitly since available_quantity can be 0
      if (typeof level.available_quantity === 'number') {
        return level.available_quantity
      }
      return Math.max(0, (level.stocked_quantity || 0) - (level.reserved_quantity || 0))
    }

    // Otherwise return the first location's quantity
    const firstLevel = levels[0]
    // Check for undefined explicitly since available_quantity can be 0
    if (typeof firstLevel.available_quantity === 'number') {
      return firstLevel.available_quantity
    }
    return Math.max(0, (firstLevel.stocked_quantity || 0) - (firstLevel.reserved_quantity || 0))
  } catch (error) {
    console.warn(`Could not get inventory quantity for variant ${variantId}:`, error)
    return 0
  }
}
