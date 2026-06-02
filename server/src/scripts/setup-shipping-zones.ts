import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

const ZONE_OPTIONS = [
  { name: "Klang Valley Zone A", amount: 1800, code: "kv-zone-a", label: "Zone A" },
  { name: "Klang Valley Zone B", amount: 2000, code: "kv-zone-b", label: "Zone B" },
  { name: "Klang Valley Zone C", amount: 2300, code: "kv-zone-c", label: "Zone C" },
]

export default async function setupShippingZones({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillment = container.resolve(Modules.FULFILLMENT)

  const serviceZones = await fulfillment.listServiceZones()
  const serviceZoneId = serviceZones[0]?.id
  if (!serviceZoneId) {
    logger.error("No service zone found. Run seed first.")
    return
  }

  const profiles = await fulfillment.listShippingProfiles({ type: "default" })
  const shippingProfileId = profiles[0]?.id
  if (!shippingProfileId) {
    logger.error("No default shipping profile found. Run seed first.")
    return
  }

  const existing = await fulfillment.listShippingOptions({
    service_zone: { id: serviceZoneId },
  })
  const existingNames = existing.map((o: any) => o.name as string)

  const toCreate = ZONE_OPTIONS.filter((z) => !existingNames.includes(z.name))

  if (toCreate.length === 0) {
    logger.info("All zone shipping options already exist. Skipping.")
    return
  }

  await createShippingOptionsWorkflow(container).run({
    input: toCreate.map((z) => ({
      name: z.name,
      price_type: "flat",
      provider_id: "manual_manual",
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfileId,
      type: {
        label: z.label,
        description: "Klang Valley delivery",
        code: z.code,
      },
      prices: [
        { currency_code: "myr", amount: z.amount },
      ],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" },
        { attribute: "is_return", value: "false", operator: "eq" },
      ],
    })),
  })

  logger.info(`Created ${toCreate.length} zone shipping option(s): ${toCreate.map((z) => z.name).join(", ")}`)
}
