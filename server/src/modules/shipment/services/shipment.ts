import { MedusaService } from "@medusajs/framework/utils"
import Shipment from "../models/shipment"

type CreateShipmentInput = {
  name: string
  base_rate: number
  eta: string
  status?: string
}

type UpdateShipmentInput = {
  id: string
  name?: string
  base_rate?: number
  eta?: string
  status?: string
}

/**
 * ShipmentModuleService
 * Handles shipment CRUD operations
 */
class ShipmentModuleService extends MedusaService({
  Shipment,
}) {
  /**
   * Create a new shipment
   */
  async createShipment(data: CreateShipmentInput): Promise<any> {
    const shipment = await this.createShipments({
      name: data.name,
      base_rate: data.base_rate,
      eta: data.eta,
      status: data.status || "Active",
    })

    return shipment
  }

  /**
   * Update a shipment
   */
  async updateShipment(data: UpdateShipmentInput): Promise<any> {
    const updateData: Record<string, unknown> = { id: data.id }

    if (data.name !== undefined) updateData.name = data.name
    if (data.base_rate !== undefined) updateData.base_rate = data.base_rate
    if (data.eta !== undefined) updateData.eta = data.eta
    if (data.status !== undefined) updateData.status = data.status

    const shipment = await this.updateShipments(updateData)

    return shipment
  }

  /**
   * Get shipment by ID
   */
  async getShipmentById(id: string): Promise<any> {
    const shipment = await this.retrieveShipment(id)
    return shipment
  }

  /**
   * List all shipments with pagination and filtering
   */
  async listAllShipments(filters?: {
    limit?: number
    offset?: number
    status?: "Active" | "Non Active" | "all"
    order?: Record<string, "ASC" | "DESC">
  }) {
    const where: Record<string, unknown> = {}

    // Filter by status if specified
    if (filters?.status && filters.status !== "all") {
      where.status = filters.status
    }

    const shipments = await this.listShipments(where, {
      order: filters?.order || { created_at: "DESC" },
    })

    // Apply pagination
    const totalCount = shipments.length
    const paginatedShipments = shipments.slice(
      filters?.offset || 0,
      (filters?.offset || 0) + (filters?.limit || 50)
    )

    return [paginatedShipments, totalCount] as const
  }

  /**
   * Delete a shipment
   */
  async deleteShipment(id: string): Promise<void> {
    await this.deleteShipments(id)
  }
}

export default ShipmentModuleService

