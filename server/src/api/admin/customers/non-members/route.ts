import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { withAdminAuth } from "../../../../utils/admin-auth"

/**
 * Check if a customer matches the search query
 * Searches across email, first_name, and last_name (case-insensitive)
 * Supports multi-word searches (e.g., "ode ardika" matches first_name="Ode" last_name="Ardika")
 */
function matchesSearch(customer: { email: string; first_name: string | null; last_name: string | null }, search: string): boolean {
  const searchLower = search.toLowerCase().trim()
  const email = (customer.email || "").toLowerCase()
  const firstName = (customer.first_name || "").toLowerCase()
  const lastName = (customer.last_name || "").toLowerCase()
  const fullName = `${firstName} ${lastName}`.trim()

  // Direct match on email
  if (email.includes(searchLower)) {
    return true
  }

  // Direct match on first name or last name
  if (firstName.includes(searchLower) || lastName.includes(searchLower)) {
    return true
  }

  // Match on full name (handles "ode ardika" matching "Ode Ardika")
  if (fullName.includes(searchLower)) {
    return true
  }

  // Split search into words and check if all words match somewhere
  const searchWords = searchLower.split(/\s+/).filter(Boolean)
  if (searchWords.length > 1) {
    const allFieldsText = `${email} ${firstName} ${lastName}`
    return searchWords.every(word => allFieldsText.includes(word))
  }

  return false
}

/**
 * GET /admin/customers/non-members
 * List all customers who are not members yet
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (req, res) => {
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Get pagination params
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100)
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)
  const search = (req.query.search as string)?.trim()

  // Get all customers (fetch more to allow for filtering)
  const [allCustomers] = await customerModuleService.listAndCountCustomers(
    {},
    { take: 1000 }
  )

  // Get all active memberships using direct query
  const { data: memberships } = await query.graph({
    entity: "membership",
    fields: ["id", "customer_id", "status"],
    filters: {
      status: "active",
    },
  })

  // Get customer IDs who are already members
  const memberCustomerIds = new Set(memberships.map((m: { customer_id: string }) => m.customer_id))

  // Filter out customers who are already members
  let nonMembers = (allCustomers as Array<{ id: string; email: string; first_name: string | null; last_name: string | null; created_at: string }>).filter(
    (c) => !memberCustomerIds.has(c.id)
  )

  // Apply search filter with improved matching
  if (search) {
    nonMembers = nonMembers.filter((c) => matchesSearch(c, search))
  }

  // Apply pagination to filtered results
  const paginatedNonMembers = nonMembers.slice(offset, offset + limit)

  res.json({
    customers: paginatedNonMembers.map((c) => ({
      id: c.id,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      created_at: c.created_at,
    })),
    count: nonMembers.length,
    limit,
    offset,
  })
})
