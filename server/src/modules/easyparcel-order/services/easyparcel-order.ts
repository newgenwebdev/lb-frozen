import { MedusaService } from "@medusajs/framework/utils"
import EasyParcelOrder from "../models/easyparcel-order"

type EasyParcelOrderData = {
  id?: string
  order_id: string
  order_no?: string | null
  parcel_no?: string | null
  awb?: string | null
  service_id: string
  service_name: string
  courier_id: string
  courier_name: string
  weight: number
  rate: number
  pickup_date?: string | null
  pickup_time?: string | null
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  receiver_postcode: string
  receiver_country?: string
  status?: string
  tracking_url?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * EasyParcelOrderModuleService
 * Handles EasyParcel order CRUD operations
 */
class EasyParcelOrderModuleService extends MedusaService({
  EasyParcelOrder,
}) {
  /**
   * Get EasyParcel order by Medusa order ID
   */
  async getByOrderId(orderId: string): Promise<EasyParcelOrderData | null> {
    const orders = await this.listEasyParcelOrders(
      { order_id: orderId },
      { take: 1 }
    )
    return orders.length > 0 ? orders[0] : null
  }

  /**
   * Get EasyParcel order by AWB
   */
  async getByAwb(awb: string): Promise<EasyParcelOrderData | null> {
    const orders = await this.listEasyParcelOrders({ awb }, { take: 1 })
    return orders.length > 0 ? orders[0] : null
  }

  /**
   * Get EasyParcel order by EasyParcel order number
   */
  async getByOrderNo(orderNo: string): Promise<EasyParcelOrderData | null> {
    const orders = await this.listEasyParcelOrders(
      { order_no: orderNo },
      { take: 1 }
    )
    return orders.length > 0 ? orders[0] : null
  }

  /**
   * Create a new EasyParcel order record
   */
  async createOrder(data: EasyParcelOrderData): Promise<EasyParcelOrderData> {
    return this.createEasyParcelOrders({
      order_id: data.order_id,
      order_no: data.order_no ?? null,
      parcel_no: data.parcel_no ?? null,
      awb: data.awb ?? null,
      service_id: data.service_id,
      service_name: data.service_name,
      courier_id: data.courier_id,
      courier_name: data.courier_name,
      weight: data.weight,
      rate: data.rate,
      pickup_date: data.pickup_date ?? null,
      pickup_time: data.pickup_time ?? null,
      receiver_name: data.receiver_name,
      receiver_phone: data.receiver_phone,
      receiver_address: data.receiver_address,
      receiver_postcode: data.receiver_postcode,
      receiver_country: data.receiver_country || "MY",
      status: data.status || "rate_checked",
      tracking_url: data.tracking_url ?? null,
      metadata: data.metadata ?? null,
    })
  }

  /**
   * Update EasyParcel order status and details
   */
  async updateOrder(
    id: string,
    data: Partial<EasyParcelOrderData>
  ): Promise<EasyParcelOrderData> {
    return this.updateEasyParcelOrders({
      id,
      ...data,
    })
  }

  /**
   * Update order after EasyParcel submission (add order_no)
   */
  async markAsSubmitted(
    id: string,
    orderNo: string
  ): Promise<EasyParcelOrderData> {
    return this.updateEasyParcelOrders({
      id,
      order_no: orderNo,
      status: "order_created",
    })
  }

  /**
   * Update order after payment (add AWB)
   */
  async markAsPaid(
    id: string,
    parcelNo: string,
    awb: string,
    trackingUrl?: string
  ): Promise<EasyParcelOrderData> {
    return this.updateEasyParcelOrders({
      id,
      parcel_no: parcelNo,
      awb,
      tracking_url: trackingUrl ?? null,
      status: "paid",
    })
  }

  /**
   * Update order status
   */
  async updateStatus(
    id: string,
    status: string
  ): Promise<EasyParcelOrderData> {
    return this.updateEasyParcelOrders({
      id,
      status,
    })
  }
}

export default EasyParcelOrderModuleService
