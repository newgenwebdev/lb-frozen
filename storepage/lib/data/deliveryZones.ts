export type ZoneKey = 'A' | 'B' | 'C'

export const ZONE_PRICES: Record<ZoneKey, number> = {
  A: 1300,
  B: 1500,
  C: 1800,
}

export interface DeliveryArea {
  name: string
  zone: ZoneKey
  amountCents: number
}

export const DELIVERY_AREAS: DeliveryArea[] = [
  // Zone A — RM13
  { name: 'KL', zone: 'A', amountCents: 1300 },
  { name: 'AMPANG', zone: 'A', amountCents: 1300 },
  { name: 'ARA DAMANSARA', zone: 'A', amountCents: 1300 },
  { name: 'BALAKONG', zone: 'A', amountCents: 1300 },
  { name: 'BATU CAVES', zone: 'A', amountCents: 1300 },
  { name: 'BUKIT JALIL', zone: 'A', amountCents: 1300 },
  { name: 'CHERAS', zone: 'A', amountCents: 1300 },
  { name: 'DAMANSARA', zone: 'A', amountCents: 1300 },
  { name: 'GOMBAK', zone: 'A', amountCents: 1300 },
  { name: 'KEPONG', zone: 'A', amountCents: 1300 },
  { name: 'KAJANG', zone: 'A', amountCents: 1300 },
  { name: 'KLANG', zone: 'A', amountCents: 1300 },
  { name: 'KLANG LAMA', zone: 'A', amountCents: 1300 },
  { name: 'KOTA DAMANSARA', zone: 'A', amountCents: 1300 },
  { name: 'KOTA KEMUNING', zone: 'A', amountCents: 1300 },
  { name: 'MONT KIARA', zone: 'A', amountCents: 1300 },
  { name: 'OUG', zone: 'A', amountCents: 1300 },
  { name: 'PJ', zone: 'A', amountCents: 1300 },
  { name: 'PETALING JAYA', zone: 'A', amountCents: 1300 },
  { name: 'PUCHONG', zone: 'A', amountCents: 1300 },
  { name: 'SELAYANG', zone: 'A', amountCents: 1300 },
  { name: 'SERI KEMBANGAN', zone: 'A', amountCents: 1300 },
  { name: 'SENTUL', zone: 'A', amountCents: 1300 },
  { name: 'SETAPAK', zone: 'A', amountCents: 1300 },
  { name: 'SETIA ALAM', zone: 'A', amountCents: 1300 },
  { name: 'SG BESI', zone: 'A', amountCents: 1300 },
  { name: 'SG BULOH', zone: 'A', amountCents: 1300 },
  { name: 'SG LONG', zone: 'A', amountCents: 1300 },
  { name: 'SHAH ALAM', zone: 'A', amountCents: 1300 },
  { name: 'SRI DAMANSARA', zone: 'A', amountCents: 1300 },
  { name: 'SRI PETALING', zone: 'A', amountCents: 1300 },
  { name: 'SUBANG JAYA', zone: 'A', amountCents: 1300 },
  { name: 'TTDI', zone: 'A', amountCents: 1300 },
  { name: 'WANGSA MAJU', zone: 'A', amountCents: 1300 },
  // Zone B — RM15
  { name: 'ELMINA', zone: 'B', amountCents: 1500 },
  { name: 'BANGI', zone: 'B', amountCents: 1500 },
  { name: 'CYBERJAYA', zone: 'B', amountCents: 1500 },
  { name: 'DENAI ALAM', zone: 'B', amountCents: 1500 },
  { name: 'DENGKIL', zone: 'B', amountCents: 1500 },
  { name: 'JENJAROM', zone: 'B', amountCents: 1500 },
  { name: 'KAPAR', zone: 'B', amountCents: 1500 },
  { name: 'KUANG', zone: 'B', amountCents: 1500 },
  { name: 'MERU', zone: 'B', amountCents: 1500 },
  { name: 'PUNCAK ALAM', zone: 'B', amountCents: 1500 },
  { name: 'PUTRAJAYA', zone: 'B', amountCents: 1500 },
  { name: 'PORT KLANG', zone: 'B', amountCents: 1500 },
  { name: 'RAWANG', zone: 'B', amountCents: 1500 },
  { name: 'RIMBAYU', zone: 'B', amountCents: 1500 },
  { name: 'SEMENYIH', zone: 'B', amountCents: 1500 },
  { name: 'SEPANG', zone: 'B', amountCents: 1500 },
  { name: 'SG MERAB', zone: 'B', amountCents: 1500 },
  { name: 'T.P GARANG', zone: 'B', amountCents: 1500 },
  // Zone C — RM18
  { name: 'BDR SERI COALFIELDS', zone: 'C', amountCents: 1800 },
  { name: 'BANTING', zone: 'C', amountCents: 1800 },
  { name: 'BATU ARANG', zone: 'C', amountCents: 1800 },
  { name: 'ECO HILL', zone: 'C', amountCents: 1800 },
  { name: 'ECO MAJESTIC', zone: 'C', amountCents: 1800 },
]

export function findDeliveryArea(name: string): DeliveryArea | undefined {
  return DELIVERY_AREAS.find((a) => a.name === name.trim().toUpperCase())
}
