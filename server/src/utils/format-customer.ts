/**
 * Format customer display name from customer object
 * Returns full name if available, otherwise falls back to email
 */
export function formatCustomerName(customer: {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
} | null | undefined): string {
  if (!customer) {
    return "Guest"
  }

  const fullName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
  return fullName || customer.email || "Guest"
}

/**
 * Format customer display name from separate fields
 */
export function formatCustomerNameFromFields(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null
): string {
  const fullName = `${firstName || ""} ${lastName || ""}`.trim()
  return fullName || email || "Guest"
}
