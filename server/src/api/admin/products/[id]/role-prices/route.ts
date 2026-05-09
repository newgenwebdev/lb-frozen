import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import CustomerRolesService from "../../../../../modules/customer-roles/services/customer-roles"
import {
  CUSTOMER_ROLES,
  CustomerRole,
  PRICE_LIST_IDS,
} from "../../../../../lib/constants"

/**
 * Role-keyed price payload.
 * - number → upsert this amount (in cents) for the role's price list
 * - null   → remove the role's price entry, falling back to default
 * - undefined / missing → leave unchanged
 */
type RolePricePayload = {
  bulk?: number | null
  vip?: number | null
  supplier?: number | null
}

const PRICED_ROLES: Array<{ key: keyof RolePricePayload; role: CustomerRole }> = [
  { key: "bulk", role: CUSTOMER_ROLES.BULK },
  { key: "vip", role: CUSTOMER_ROLES.VIP },
  { key: "supplier", role: CUSTOMER_ROLES.SUPPLIER },
]

const CURRENCY_CODE = "myr"

async function resolvePriceSetId(
  query: any,
  variantId: string
): Promise<string | null> {
  const { data } = await query.graph({
    entity: "product_variant_price_set",
    fields: ["variant_id", "price_set_id"],
    filters: { variant_id: [variantId] },
  })
  return data?.[0]?.price_set_id ?? null
}

/**
 * GET /admin/products/:id/role-prices?variant_id=...
 * Returns the existing role-tier prices for one variant of the product.
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const variantId = req.query.variant_id as string | undefined

  if (!variantId) {
    res.status(400).json({ message: "variant_id query param is required" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const pricingModule = req.scope.resolve(Modules.PRICING)

  const priceSetId = await resolvePriceSetId(query, variantId)
  if (!priceSetId) {
    res.json({ variant_id: variantId, prices: { bulk: null, vip: null, supplier: null } })
    return
  }

  const priceListIds = [PRICE_LIST_IDS.BULK, PRICE_LIST_IDS.VIP, PRICE_LIST_IDS.SUPPLIER]
  const prices = await pricingModule.listPrices(
    { price_set_id: [priceSetId], price_list_id: priceListIds },
    { select: ["id", "amount", "currency_code", "price_set_id", "price_list_id"] }
  )

  const result: RolePricePayload = { bulk: null, vip: null, supplier: null }
  for (const p of prices as Array<any>) {
    if (p.price_list_id === PRICE_LIST_IDS.BULK) result.bulk = Number(p.amount)
    if (p.price_list_id === PRICE_LIST_IDS.VIP) result.vip = Number(p.amount)
    if (p.price_list_id === PRICE_LIST_IDS.SUPPLIER) result.supplier = Number(p.amount)
  }

  res.json({ variant_id: variantId, prices: result })
}

/**
 * POST /admin/products/:id/role-prices
 * Body: { variant_id: string, prices: { bulk?, vip?, supplier? } }
 *
 * For each role key in `prices`:
 *   - number → upsert amount in the role's price list
 *   - null   → remove the role's price entry
 *   - missing → leave untouched
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const body = req.body as { variant_id?: string; prices?: RolePricePayload } | undefined
  const variantId = body?.variant_id
  const incoming = body?.prices ?? {}

  if (!variantId) {
    res.status(400).json({ message: "variant_id is required" })
    return
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const pricingModule = req.scope.resolve(Modules.PRICING)
  const rolesService = new CustomerRolesService({ logger })

  const priceSetId = await resolvePriceSetId(query, variantId)
  if (!priceSetId) {
    res.status(404).json({
      message: `No price_set found for variant ${variantId}. Make sure the variant has a base price first.`,
    })
    return
  }

  const finalPrices: RolePricePayload = { bulk: null, vip: null, supplier: null }

  for (const { key, role } of PRICED_ROLES) {
    if (!(key in incoming)) {
      // not specified — read existing so the response stays accurate
      const existing = await pricingModule.listPrices(
        {
          price_set_id: [priceSetId],
          price_list_id: [rolesService.getPriceListIdForRole(role)!],
        },
        { select: ["amount"] }
      )
      finalPrices[key] = existing.length > 0 ? Number((existing[0] as any).amount) : null
      continue
    }

    const value = incoming[key]
    const priceListId = await rolesService.ensurePriceListForRole(role, req.scope)
    if (!priceListId) continue

    const existing = await pricingModule.listPrices(
      { price_set_id: [priceSetId], price_list_id: [priceListId] },
      { select: ["id", "amount"] }
    )

    if (value === null) {
      // remove
      if (existing.length > 0) {
        await pricingModule.removePrices(existing.map((p: any) => p.id))
      }
      finalPrices[key] = null
      continue
    }

    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      res.status(400).json({ message: `Invalid amount for ${key}: must be a non-negative number in cents` })
      return
    }

    if (existing.length > 0) {
      // Pricing module has no in-place price update — remove old, add new.
      await pricingModule.removePrices(existing.map((p: any) => p.id))
    }
    await pricingModule.addPriceListPrices([
      {
        price_list_id: priceListId,
        prices: [
          {
            price_set_id: priceSetId,
            amount: value,
            currency_code: CURRENCY_CODE,
          },
        ],
      },
    ])
    finalPrices[key] = value
  }

  res.json({ variant_id: variantId, prices: finalPrices })
}
