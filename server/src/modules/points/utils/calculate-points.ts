/**
 * Calculate points earned from an order
 * @param orderTotal - Order total in smallest currency unit (cents)
 * @param config - Points configuration
 * @returns Points earned (integer)
 */
export function calculateEarnedPoints(
  orderTotal: number,
  config: {
    earning_type: "percentage" | "per_product"
    earning_rate: number
  }
): number {
  if (config.earning_type === "percentage") {
    // Calculate percentage of order total
    // e.g., $100 order * 5% = 500 points
    const points = Math.floor((orderTotal * config.earning_rate) / 100)
    return points
  } else {
    // Per product earning - would need item count
    // For now, treat earning_rate as points per dollar
    const points = Math.floor(orderTotal * (config.earning_rate / 100))
    return points
  }
}

/**
 * Convert points to discount amount
 * @param points - Number of points to redeem
 * @param redemptionRate - Value of 1 point (e.g., 0.01 = 100 points = $1)
 * @returns Discount amount in smallest currency unit (cents)
 */
export function convertPointsToDiscount(
  points: number,
  redemptionRate: number
): number {
  return Math.floor(points * redemptionRate * 100) // Convert to cents
}

/**
 * Calculate maximum points that can be redeemed for an order
 * @param orderTotal - Order total in smallest currency unit (cents)
 * @param customerBalance - Customer's available points
 * @param redemptionRate - Value of 1 point
 * @returns Maximum redeemable points
 */
export function calculateMaxRedeemablePoints(
  orderTotal: number,
  customerBalance: number,
  redemptionRate: number
): number {
  // Can't redeem more than the order total
  const maxPointsForOrder = Math.floor(orderTotal / (redemptionRate * 100))

  // Can't redeem more than customer has
  return Math.min(maxPointsForOrder, customerBalance)
}

/**
 * Validate if points can be redeemed
 * @param pointsToRedeem - Points customer wants to redeem
 * @param customerBalance - Customer's available points
 * @param orderTotal - Order total in cents
 * @param redemptionRate - Value of 1 point
 * @returns Validation result with error message if invalid
 */
export function validatePointsRedemption(
  pointsToRedeem: number,
  customerBalance: number,
  orderTotal: number,
  redemptionRate: number
): { valid: boolean; error?: string } {
  if (pointsToRedeem <= 0) {
    return { valid: false, error: "Points to redeem must be greater than 0" }
  }

  if (pointsToRedeem > customerBalance) {
    return { valid: false, error: "Insufficient points balance" }
  }

  const discountAmount = convertPointsToDiscount(pointsToRedeem, redemptionRate)

  if (discountAmount > orderTotal) {
    return {
      valid: false,
      error: "Points discount cannot exceed order total"
    }
  }

  return { valid: true }
}
