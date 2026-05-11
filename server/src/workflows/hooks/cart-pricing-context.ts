import {
  addToCartWorkflow,
  refreshCartItemsWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getCustomerPricingGroupId } from "../../utils/store-auth"

// Medusa's default pricing context forwards `customer.groups`, but the
// pricing module only checks the scalar `customer_group_id`. Without this
// hook, line items get created at the retail price for VIP/Supplier
// customers and only get corrected later by the async cart-updated
// subscriber — which causes a price flash AND prevents same-variant
// re-adds from merging (different metadata after async fix-up). The
// helper reads `customer.metadata.pricing_role` (authoritative; see
// store-auth.ts) so it stays consistent with sync-prices.
async function pricingContextFromCustomer(
  customerId: string | null | undefined,
  container: { resolve: (key: string) => any }
) {
  if (!customerId) return {}
  const customerGroupId = await getCustomerPricingGroupId(container, customerId)
  return customerGroupId ? { customer_group_id: customerGroupId } : {}
}

addToCartWorkflow.hooks.setPricingContext(async ({ cart }, { container }) => {
  return new StepResponse(
    await pricingContextFromCustomer(cart?.customer_id, container)
  )
})

updateLineItemInCartWorkflow.hooks.setPricingContext(
  async ({ cart }, { container }) => {
    return new StepResponse(
      await pricingContextFromCustomer(cart?.customer_id, container)
    )
  }
)

// refreshCartItemsWorkflow's hook only receives cart_id, so resolve the cart
// ourselves to get customer_id (used by add-to-cart's internal refresh step).
refreshCartItemsWorkflow.hooks.setPricingContext(
  async ({ cart_id }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "cart",
      fields: ["customer_id"],
      filters: { id: cart_id },
    })
    const customerId = data?.[0]?.customer_id
    return new StepResponse(
      await pricingContextFromCustomer(customerId, container)
    )
  }
)
