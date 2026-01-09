/**
 * Shipment Mapper Utilities
 *
 * Functions to map API responses to UI format
 */

import type { ShipmentAPI, Shipment, ShipmentStatus } from "../types/shipment";

/**
 * Extract display ID from shipment ID (last 4 characters or a short version)
 */
function extractDisplayId(id: string): string {
  // Use last 4 characters of the ID as display ID
  // If ID is shorter, use the whole ID
  if (id.length <= 4) {
    return id.toUpperCase();
  }
  return id.slice(-4).toUpperCase();
}

/**
 * Map API shipment to UI shipment format
 */
export function mapShipmentAPIToUI(apiShipment: ShipmentAPI): Shipment {
  return {
    id: apiShipment.id,
    displayId: extractDisplayId(apiShipment.id),
    name: apiShipment.name,
    baseRate: typeof apiShipment.base_rate === "number" ? apiShipment.base_rate : parseFloat(String(apiShipment.base_rate)) || 0,
    eta: apiShipment.eta,
    status: apiShipment.status,
  };
}

/**
 * Map API shipment list response to UI format
 */
export function mapShipmentListAPIToUI(apiResponse: {
  shipments: ShipmentAPI[];
  count: number;
  limit: number;
  offset: number;
}): {
  shipments: Shipment[];
  count: number;
  page: number;
  limit: number;
} {
  return {
    shipments: apiResponse.shipments.map(mapShipmentAPIToUI),
    count: apiResponse.count,
    page: apiResponse.limit > 0 ? Math.floor(apiResponse.offset / apiResponse.limit) + 1 : 1,
    limit: apiResponse.limit,
  };
}

