import { MedusaService } from "@medusajs/framework/utils"
import OrderExtension from "../models/order-extension"

type PaymentStatus = "awaiting" | "paid" | "refunded" | "partially_refunded"
type FulfillmentStatus = "unfulfilled" | "processing" | "shipped" | "delivered" | "cancelled"

type CreateOrderExtensionInput = {
  order_id: string
  payment_status?: PaymentStatus
  fulfillment_status?: FulfillmentStatus
  payment_method?: string
}

type UpdatePaymentStatusInput = {
  order_id: string
  payment_status: PaymentStatus
  paid_at?: Date
  payment_method?: string
}

type UpdateFulfillmentStatusInput = {
  order_id: string
  fulfillment_status: FulfillmentStatus
  courier?: string
  tracking_number?: string
  shipped_at?: Date
  delivered_at?: Date
  estimated_delivery?: Date
}

type InjectedDependencies = {
  logger: any
}

/**
 * OrderExtensionService
 * Manages additional order status and tracking data
 */
class OrderExtensionService extends MedusaService({
  OrderExtension,
}) {
  protected logger: any

  constructor({ logger }: InjectedDependencies) {
    super(...arguments)
    this.logger = logger
  }

  /**
   * Create extension record for a new order
   */
  async createExtension(data: CreateOrderExtensionInput): Promise<any> {
    this.logger.info(`Creating order extension for order ${data.order_id}`)

    const extension = await this.createOrderExtensions({
      order_id: data.order_id,
      payment_status: data.payment_status || "awaiting",
      fulfillment_status: data.fulfillment_status || "unfulfilled",
      payment_method: data.payment_method || null,
    })

    this.logger.info(`Order extension created for order ${data.order_id}`)
    return extension
  }

  /**
   * Get extension by order ID
   */
  async getByOrderId(orderId: string): Promise<any> {
    const [extension] = await this.listOrderExtensions({ order_id: orderId })

    return extension || null
  }

  /**
   * Get or create extension for an order
   */
  async getOrCreate(orderId: string): Promise<any> {
    let extension = await this.getByOrderId(orderId)

    if (!extension) {
      extension = await this.createExtension({ order_id: orderId })
    }

    return extension
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(data: UpdatePaymentStatusInput): Promise<any> {
    this.logger.info(`Updating payment status for order ${data.order_id} to ${data.payment_status}`)

    let extension = await this.getByOrderId(data.order_id)

    if (!extension) {
      extension = await this.createExtension({ order_id: data.order_id })
    }

    const updated = await this.updateOrderExtensions({
      id: extension.id,
      payment_status: data.payment_status,
      paid_at: data.paid_at || (data.payment_status === "paid" ? new Date() : null),
      payment_method: data.payment_method || extension.payment_method,
    })

    this.logger.info(`Payment status updated for order ${data.order_id}`)
    return updated
  }

  /**
   * Update fulfillment status
   */
  async updateFulfillmentStatus(data: UpdateFulfillmentStatusInput): Promise<any> {
    this.logger.info(`Updating fulfillment status for order ${data.order_id} to ${data.fulfillment_status}`)

    let extension = await this.getByOrderId(data.order_id)

    if (!extension) {
      extension = await this.createExtension({ order_id: data.order_id })
    }

    const updateData: Record<string, any> = {
      id: extension.id,
      fulfillment_status: data.fulfillment_status,
    }

    // Set shipped_at when shipping
    if (data.fulfillment_status === "shipped") {
      updateData.shipped_at = data.shipped_at || new Date()
      updateData.courier = data.courier || extension.courier
      updateData.tracking_number = data.tracking_number || extension.tracking_number
      updateData.estimated_delivery = data.estimated_delivery || extension.estimated_delivery
    }

    // Set delivered_at when delivered
    if (data.fulfillment_status === "delivered") {
      updateData.delivered_at = data.delivered_at || new Date()
    }

    const updated = await this.updateOrderExtensions(updateData)

    this.logger.info(`Fulfillment status updated for order ${data.order_id}`)
    return updated
  }

  /**
   * Mark order as shipped with tracking info
   */
  async markAsShipped(
    orderId: string,
    trackingInfo: {
      courier: string
      tracking_number: string
      estimated_delivery?: Date
    }
  ): Promise<any> {
    return this.updateFulfillmentStatus({
      order_id: orderId,
      fulfillment_status: "shipped",
      courier: trackingInfo.courier,
      tracking_number: trackingInfo.tracking_number,
      estimated_delivery: trackingInfo.estimated_delivery,
    })
  }

  /**
   * Mark order as delivered
   */
  async markAsDelivered(orderId: string): Promise<any> {
    return this.updateFulfillmentStatus({
      order_id: orderId,
      fulfillment_status: "delivered",
    })
  }

  /**
   * Get orders by payment status
   */
  async listByPaymentStatus(
    status: PaymentStatus,
    options?: { limit?: number; offset?: number }
  ) {
    return await this.listAndCountOrderExtensions(
      { payment_status: status },
      {
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }
    )
  }

  /**
   * Get orders by fulfillment status
   */
  async listByFulfillmentStatus(
    status: FulfillmentStatus,
    options?: { limit?: number; offset?: number }
  ) {
    return await this.listAndCountOrderExtensions(
      { fulfillment_status: status },
      {
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }
    )
  }

  /**
   * Get orders that are "ready to ship" (paid but not yet shipped)
   */
  async listReadyToShip(options?: { limit?: number; offset?: number }) {
    return await this.listAndCountOrderExtensions(
      {
        payment_status: "paid",
        fulfillment_status: "unfulfilled"
      },
      {
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }
    )
  }
}

export default OrderExtensionService
