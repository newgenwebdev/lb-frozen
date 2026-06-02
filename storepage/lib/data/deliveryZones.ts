export type ZoneKey = 'A' | 'B' | 'C'

export const ZONE_PRICES: Record<ZoneKey, number> = {
  A: 1800,
  B: 2000,
  C: 2300,
}

export interface DeliveryArea {
  name: string
  zone: ZoneKey
  amountCents: number
}

export const DELIVERY_AREAS: DeliveryArea[] = [
  // Zone A — RM18
  { name: 'KL', zone: 'A', amountCents: 1800 },
  { name: 'AMPANG', zone: 'A', amountCents: 1800 },
  { name: 'ARA DAMANSARA', zone: 'A', amountCents: 1800 },
  { name: 'BALAKONG', zone: 'A', amountCents: 1800 },
  { name: 'BATU CAVES', zone: 'A', amountCents: 1800 },
  { name: 'BUKIT JALIL', zone: 'A', amountCents: 1800 },
  { name: 'CHERAS', zone: 'A', amountCents: 1800 },
  { name: 'DAMANSARA', zone: 'A', amountCents: 1800 },
  { name: 'GOMBAK', zone: 'A', amountCents: 1800 },
  { name: 'KEPONG', zone: 'A', amountCents: 1800 },
  { name: 'KAJANG', zone: 'A', amountCents: 1800 },
  { name: 'KLANG', zone: 'A', amountCents: 1800 },
  { name: 'KLANG LAMA', zone: 'A', amountCents: 1800 },
  { name: 'KOTA DAMANSARA', zone: 'A', amountCents: 1800 },
  { name: 'KOTA KEMUNING', zone: 'A', amountCents: 1800 },
  { name: 'MONT KIARA', zone: 'A', amountCents: 1800 },
  { name: 'OUG', zone: 'A', amountCents: 1800 },
  { name: 'PJ', zone: 'A', amountCents: 1800 },
  { name: 'PETALING JAYA', zone: 'A', amountCents: 1800 },
  { name: 'PUCHONG', zone: 'A', amountCents: 1800 },
  { name: 'SELAYANG', zone: 'A', amountCents: 1800 },
  { name: 'SERI KEMBANGAN', zone: 'A', amountCents: 1800 },
  { name: 'SENTUL', zone: 'A', amountCents: 1800 },
  { name: 'SETAPAK', zone: 'A', amountCents: 1800 },
  { name: 'SETIA ALAM', zone: 'A', amountCents: 1800 },
  { name: 'SG BESI', zone: 'A', amountCents: 1800 },
  { name: 'SG BULOH', zone: 'A', amountCents: 1800 },
  { name: 'SG LONG', zone: 'A', amountCents: 1800 },
  { name: 'SHAH ALAM', zone: 'A', amountCents: 1800 },
  { name: 'SRI DAMANSARA', zone: 'A', amountCents: 1800 },
  { name: 'SRI PETALING', zone: 'A', amountCents: 1800 },
  { name: 'SUBANG JAYA', zone: 'A', amountCents: 1800 },
  { name: 'TTDI', zone: 'A', amountCents: 1800 },
  { name: 'WANGSA MAJU', zone: 'A', amountCents: 1800 },
  // Zone B — RM20
  { name: 'ELMINA', zone: 'B', amountCents: 2000 },
  { name: 'BANGI', zone: 'B', amountCents: 2000 },
  { name: 'CYBERJAYA', zone: 'B', amountCents: 2000 },
  { name: 'DENAI ALAM', zone: 'B', amountCents: 2000 },
  { name: 'DENGKIL', zone: 'B', amountCents: 2000 },
  { name: 'JENJAROM', zone: 'B', amountCents: 2000 },
  { name: 'KAPAR', zone: 'B', amountCents: 2000 },
  { name: 'KUANG', zone: 'B', amountCents: 2000 },
  { name: 'MERU', zone: 'B', amountCents: 2000 },
  { name: 'PUNCAK ALAM', zone: 'B', amountCents: 2000 },
  { name: 'PUTRAJAYA', zone: 'B', amountCents: 2000 },
  { name: 'PORT KLANG', zone: 'B', amountCents: 2000 },
  { name: 'RAWANG', zone: 'B', amountCents: 2000 },
  { name: 'RIMBAYU', zone: 'B', amountCents: 2000 },
  { name: 'SEMENYIH', zone: 'B', amountCents: 2000 },
  { name: 'SEPANG', zone: 'B', amountCents: 2000 },
  { name: 'SG MERAB', zone: 'B', amountCents: 2000 },
  { name: 'T.P GARANG', zone: 'B', amountCents: 2000 },
  // Zone C — RM23
  { name: 'BDR SERI COALFIELDS', zone: 'C', amountCents: 2300 },
  { name: 'BANTING', zone: 'C', amountCents: 2300 },
  { name: 'BATU ARANG', zone: 'C', amountCents: 2300 },
  { name: 'ECO HILL', zone: 'C', amountCents: 2300 },
  { name: 'ECO MAJESTIC', zone: 'C', amountCents: 2300 },
]

export function findDeliveryArea(name: string): DeliveryArea | undefined {
  return DELIVERY_AREAS.find((a) => a.name === name.trim().toUpperCase())
}
