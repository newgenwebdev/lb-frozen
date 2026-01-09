/**
 * Shipment API Functions
 *
 * API layer for shipment management operations
 */

import { api } from "./client";
import type {
  ShipmentAPIListResponse,
  ShipmentListParams,
  ShipmentAPI,
  ShipmentFormData,
  ShipmentAPIGetResponse,
} from "../types/shipment";

/**
 * Fetch all shipments with pagination and filtering
 * @param params - Query parameters (limit, offset, status)
 * @returns Shipment list response
 */
export async function getShipments(
  params: ShipmentListParams = {}
): Promise<ShipmentAPIListResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit !== undefined) {
    queryParams.append("limit", params.limit.toString());
  }
  if (params.offset !== undefined) {
    queryParams.append("offset", params.offset.toString());
  }
  if (params.status && params.status !== "all") {
    queryParams.append("status", params.status);
  }

  const queryString = queryParams.toString();
  const url = `/admin/shipment${queryString ? `?${queryString}` : ""}`;

  const response = await api.get<ShipmentAPIListResponse>(url);
  return response.data;
}

/**
 * Get a single shipment by ID
 * @param id - Shipment ID
 * @returns Shipment or null if not found
 */
export async function getShipmentById(id: string): Promise<ShipmentAPI | null> {
  try {
    const response = await api.get<ShipmentAPIGetResponse>(`/admin/shipment/${id}`);
    return response.data.shipment;
  } catch (error) {
    console.error("Failed to fetch shipment:", error);
    return null;
  }
}

/**
 * Create a new shipment
 * @param data - Shipment form data
 * @returns Created shipment
 */
export async function createShipment(data: ShipmentFormData): Promise<ShipmentAPI> {
  const response = await api.post<{ shipment: ShipmentAPI }>("/admin/shipment", {
    name: data.name,
    base_rate: data.base_rate,
    eta: data.eta,
    status: data.status,
  });
  return response.data.shipment;
}

/**
 * Update an existing shipment
 * @param id - Shipment ID
 * @param data - Partial shipment form data (only fields to update)
 * @returns Updated shipment
 */
export async function updateShipment(
  id: string,
  data: Partial<ShipmentFormData>
): Promise<ShipmentAPI> {
  const payload: Record<string, string | number> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.base_rate !== undefined) payload.base_rate = data.base_rate;
  if (data.eta !== undefined) payload.eta = data.eta;
  if (data.status !== undefined) payload.status = data.status;

  const response = await api.put<{ shipment: ShipmentAPI }>(`/admin/shipment/${id}`, payload);
  return response.data.shipment;
}

/**
 * Delete a shipment
 * @param id - Shipment ID
 * @returns void
 */
export async function deleteShipment(id: string): Promise<void> {
  await api.delete(`/admin/shipment/${id}`);
}

