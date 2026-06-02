'use client'

import { DELIVERY_AREAS, findDeliveryArea } from '@/lib/data/deliveryZones'
import type { DeliveryArea } from '@/lib/data/deliveryZones'
import type { ShippingOption } from '@/lib/api/payment'

interface DeliveryAreaSelectorProps {
  shippingOptions: ShippingOption[]
  selectedArea: string | null
  onAreaChange: (area: DeliveryArea, matchedOptionId: string | null) => void
}

const ZONE_LABELS: Record<string, string> = {
  A: 'RM18.00',
  B: 'RM20.00',
  C: 'RM23.00',
}

export function DeliveryAreaSelector({
  shippingOptions,
  selectedArea,
  onAreaChange,
}: DeliveryAreaSelectorProps) {
  const zoneA = DELIVERY_AREAS.filter((a) => a.zone === 'A')
  const zoneB = DELIVERY_AREAS.filter((a) => a.zone === 'B')
  const zoneC = DELIVERY_AREAS.filter((a) => a.zone === 'C')

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const area = findDeliveryArea(e.target.value)
    if (!area) return
    const matched = shippingOptions.find((o) => o.amount === area.amountCents)
    onAreaChange(area, matched?.id ?? null)
  }

  return (
    <select
      value={selectedArea ?? ''}
      onChange={handleChange}
      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-neutral-900 cursor-pointer"
    >
      <option value="" disabled>Select your delivery area...</option>
      <optgroup label={`Zone A — ${ZONE_LABELS.A}`}>
        {zoneA.map((a) => (
          <option key={a.name} value={a.name}>{a.name}</option>
        ))}
      </optgroup>
      <optgroup label={`Zone B — ${ZONE_LABELS.B}`}>
        {zoneB.map((a) => (
          <option key={a.name} value={a.name}>{a.name}</option>
        ))}
      </optgroup>
      <optgroup label={`Zone C — ${ZONE_LABELS.C}`}>
        {zoneC.map((a) => (
          <option key={a.name} value={a.name}>{a.name}</option>
        ))}
      </optgroup>
    </select>
  )
}
