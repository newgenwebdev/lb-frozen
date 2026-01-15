import { MedusaService } from "@medusajs/framework/utils"
import EasyParcelReturn from "../models/easyparcel-return"

type EasyParcelReturnData = {
  id?: string
  return_id: string
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
  sender_name: string
  sender_phone: string
  sender_address: string
  sender_postcode: string
  sender_country?: string
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
 * EasyParcelReturnModuleService
 * Handles EasyParcel return shipment CRUD operations
 */
class EasyParcelReturnModuleService extends MedusaService({
  EasyParcelReturn,
}) {
  /**
   * Get EasyParcel return by return request ID
   */
  async getByReturnId(returnId: string): Promise<EasyParcelReturnData | null> {
    const returns = await this.listEasyParcelReturns(
      { return_id: returnId },
      { take: 1 }
    )
    return returns.length > 0 ? returns[0] : null
  }

  /**
   * Get EasyParcel return by AWB
   */
  async getByAwb(awb: string): Promise<EasyParcelReturnData | null> {
    const returns = await this.listEasyParcelReturns({ awb }, { take: 1 })
    return returns.length > 0 ? returns[0] : null
  }

  /**
   * Get EasyParcel return by EasyParcel order number
   */
  async getByOrderNo(orderNo: string): Promise<EasyParcelReturnData | null> {
    const returns = await this.listEasyParcelReturns(
      { order_no: orderNo },
      { take: 1 }
    )
    return returns.length > 0 ? returns[0] : null
  }

  /**
   * Get all EasyParcel returns for a Medusa order
   */
  async getByOrderId(orderId: string): Promise<EasyParcelReturnData[]> {
    return this.listEasyParcelReturns({ order_id: orderId })
  }

  /**
   * Create a new EasyParcel return record
   */
  async createReturn(data: EasyParcelReturnData): Promise<EasyParcelReturnData> {
    return this.createEasyParcelReturns({
      return_id: data.return_id,
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
      sender_name: data.sender_name,
      sender_phone: data.sender_phone,
      sender_address: data.sender_address,
      sender_postcode: data.sender_postcode,
      sender_country: data.sender_country || "MY",
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
   * Update EasyParcel return status and details
   */
  async updateReturn(
    id: string,
    data: Partial<EasyParcelReturnData>
  ): Promise<EasyParcelReturnData> {
    return this.updateEasyParcelReturns({
      id,
      ...data,
    })
  }

  /**
   * Update return after EasyParcel submission (add order_no)
   */
  async markAsSubmitted(
    id: string,
    orderNo: string
  ): Promise<EasyParcelReturnData> {
    return this.updateEasyParcelReturns({
      id,
      order_no: orderNo,
      status: "order_created",
    })
  }

  /**
   * Update return after payment (add AWB)
   */
  async markAsPaid(
    id: string,
    parcelNo: string,
    awb: string,
    trackingUrl?: string
  ): Promise<EasyParcelReturnData> {
    return this.updateEasyParcelReturns({
      id,
      parcel_no: parcelNo,
      awb,
      tracking_url: trackingUrl ?? null,
      status: "paid",
    })
  }

  /**
   * Update return status
   */
  async updateStatus(
    id: string,
    status: string
  ): Promise<EasyParcelReturnData> {
    return this.updateEasyParcelReturns({
      id,
      status,
    })
  }
}

export default EasyParcelReturnModuleService
