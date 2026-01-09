import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import Return from "../models/return"

type ReturnStatus = "requested" | "approved" | "rejected" | "in_transit" | "received" | "inspecting" | "completed" | "cancelled"
type ReturnType = "refund" | "replacement"
type ReturnReason = "defective" | "wrong_item" | "not_as_described" | "changed_mind" | "other"
type RefundStatus = "pending" | "processing" | "completed" | "failed"

type ReturnItem = {
  item_id: string
  variant_id: string
  product_name: string
  quantity: number
  unit_price: number
}

type CreateReturnInput = {
  order_id: string
  customer_id: string
  return_type: ReturnType
  reason: ReturnReason
  reason_details?: string
  items: ReturnItem[]
  refund_amount: number
  shipping_refund?: number
  admin_notes?: string
}

type InjectedDependencies = {
  logger: any
}

/**
 * ReturnService
 * Manages return requests lifecycle from creation to completion
 */
class ReturnService extends MedusaService({
  Return,
}) {
  protected logger: any

  constructor({ logger }: InjectedDependencies) {
    super(...arguments)
    this.logger = logger
  }

  /**
   * Create a new return request
   */
  async createReturnRequest(data: CreateReturnInput): Promise<any> {
    this.logger.info(`Creating return request for order ${data.order_id}`)

    const total_refund = data.refund_amount + (data.shipping_refund || 0)

    const returnRequest = await this.createReturns({
      order_id: data.order_id,
      customer_id: data.customer_id,
      status: "requested",
      return_type: data.return_type,
      reason: data.reason,
      reason_details: data.reason_details || null,
      items: data.items as unknown as Record<string, unknown>,
      refund_amount: data.refund_amount,
      shipping_refund: data.shipping_refund || 0,
      total_refund,
      requested_at: new Date(),
      admin_notes: data.admin_notes || null,
      refund_status: data.return_type === "refund" ? "pending" : null,
    })

    this.logger.info(`Return request created: ${returnRequest.id}`)
    return returnRequest
  }

  /**
   * Approve a return request
   */
  async approveReturn(returnId: string, adminNotes?: string): Promise<any> {
    this.logger.info(`Approving return ${returnId}`)

    const returnRequest = await this.retrieveReturn(returnId)

    if (returnRequest.status !== "requested") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot approve return with status: ${returnRequest.status}`
      )
    }

    const updated = await this.updateReturns({
      id: returnId,
      status: "approved",
      approved_at: new Date(),
      admin_notes: adminNotes || returnRequest.admin_notes,
    })

    this.logger.info(`Return ${returnId} approved`)
    return updated
  }

  /**
   * Reject a return request
   */
  async rejectReturn(returnId: string, reason: string): Promise<any> {
    this.logger.info(`Rejecting return ${returnId}`)

    const returnRequest = await this.retrieveReturn(returnId)

    if (returnRequest.status !== "requested") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot reject return with status: ${returnRequest.status}`
      )
    }

    const updated = await this.updateReturns({
      id: returnId,
      status: "rejected",
      rejected_at: new Date(),
      rejection_reason: reason,
    })

    this.logger.info(`Return ${returnId} rejected`)
    return updated
  }

  /**
   * Mark return as in transit (customer shipped product back)
   */
  async markReturnInTransit(
    returnId: string,
    tracking: { courier: string; tracking_number: string }
  ): Promise<any> {
    this.logger.info(`Marking return ${returnId} as in transit`)

    const returnRequest = await this.retrieveReturn(returnId)

    if (returnRequest.status !== "approved") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot mark as in transit with status: ${returnRequest.status}`
      )
    }

    const updated = await this.updateReturns({
      id: returnId,
      status: "in_transit",
      return_courier: tracking.courier,
      return_tracking_number: tracking.tracking_number,
    })

    this.logger.info(`Return ${returnId} marked as in transit`)
    return updated
  }

  /**
   * Mark return as received at warehouse
   */
  async markReturnReceived(returnId: string): Promise<any> {
    this.logger.info(`Marking return ${returnId} as received`)

    const returnRequest = await this.retrieveReturn(returnId)

    if (returnRequest.status !== "in_transit") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot mark as received with status: ${returnRequest.status}`
      )
    }

    const updated = await this.updateReturns({
      id: returnId,
      status: "received",
      received_at: new Date(),
    })

    this.logger.info(`Return ${returnId} marked as received`)
    return updated
  }

  /**
   * Start inspection process
   */
  async startInspection(returnId: string): Promise<any> {
    this.logger.info(`Starting inspection for return ${returnId}`)

    const returnRequest = await this.retrieveReturn(returnId)

    if (returnRequest.status !== "received") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot start inspection with status: ${returnRequest.status}`
      )
    }

    const updated = await this.updateReturns({
      id: returnId,
      status: "inspecting",
    })

    this.logger.info(`Return ${returnId} inspection started`)
    return updated
  }

  /**
   * Complete return (after refund processed or replacement sent)
   */
  async completeReturn(returnId: string, adminNotes?: string): Promise<any> {
    this.logger.info(`Completing return ${returnId}`)

    const returnRequest = await this.retrieveReturn(returnId)

    const allowedStatuses: ReturnStatus[] = ["received", "inspecting"]
    if (!allowedStatuses.includes(returnRequest.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot complete return with status: ${returnRequest.status}`
      )
    }

    const updated = await this.updateReturns({
      id: returnId,
      status: "completed",
      completed_at: new Date(),
      admin_notes: adminNotes || returnRequest.admin_notes,
    })

    this.logger.info(`Return ${returnId} completed`)
    return updated
  }

  /**
   * Cancel a return request
   */
  async cancelReturn(returnId: string, reason?: string): Promise<any> {
    this.logger.info(`Cancelling return ${returnId}`)

    const returnRequest = await this.retrieveReturn(returnId)

    const cancellableStatuses: ReturnStatus[] = ["requested", "approved"]
    if (!cancellableStatuses.includes(returnRequest.status)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot cancel return with status: ${returnRequest.status}`
      )
    }

    const updated = await this.updateReturns({
      id: returnId,
      status: "cancelled",
      admin_notes: reason || returnRequest.admin_notes,
    })

    this.logger.info(`Return ${returnId} cancelled`)
    return updated
  }

  /**
   * Update refund status
   */
  async updateRefundStatus(
    returnId: string,
    refundStatus: RefundStatus,
    stripeRefundId?: string
  ): Promise<any> {
    this.logger.info(`Updating refund status for return ${returnId} to ${refundStatus}`)

    const updateData: Record<string, any> = {
      id: returnId,
      refund_status: refundStatus,
    }

    if (stripeRefundId) {
      updateData.stripe_refund_id = stripeRefundId
    }

    if (refundStatus === "completed") {
      updateData.refunded_at = new Date()
    }

    const updated = await this.updateReturns(updateData)

    this.logger.info(`Refund status updated for return ${returnId}`)
    return updated
  }

  /**
   * Get return by ID
   */
  async getReturn(returnId: string): Promise<any> {
    return await this.retrieveReturn(returnId)
  }

  /**
   * Get returns by order ID
   */
  async getReturnsByOrderId(orderId: string): Promise<any[]> {
    const returns = await this.listReturns({ order_id: orderId })
    return returns
  }

  /**
   * Check if order has pending return
   */
  async hasExistingPendingReturn(orderId: string): Promise<boolean> {
    const returns = await this.listReturns({ order_id: orderId })
    const pendingStatuses: ReturnStatus[] = ["requested", "approved", "in_transit", "received", "inspecting"]
    return returns.some((r: any) => pendingStatuses.includes(r.status))
  }

  /**
   * Get returns by status
   */
  async listByStatus(
    status: ReturnStatus,
    options?: { limit?: number; offset?: number }
  ) {
    return await this.listAndCountReturns(
      { status },
      {
        take: options?.limit || 50,
        skip: options?.offset || 0,
        order: { requested_at: "DESC" },
      }
    )
  }

  /**
   * Get return statistics
   */
  async getReturnStats(): Promise<{
    requested: number
    approved: number
    in_transit: number
    received: number
    inspecting: number
    completed: number
    rejected: number
    cancelled: number
    total_refunded: number
  }> {
    const [requested] = await this.listAndCountReturns({ status: "requested" })
    const [approved] = await this.listAndCountReturns({ status: "approved" })
    const [in_transit] = await this.listAndCountReturns({ status: "in_transit" })
    const [received] = await this.listAndCountReturns({ status: "received" })
    const [inspecting] = await this.listAndCountReturns({ status: "inspecting" })
    const [completed, completedCount] = await this.listAndCountReturns({ status: "completed" })
    const [rejected] = await this.listAndCountReturns({ status: "rejected" })
    const [cancelled] = await this.listAndCountReturns({ status: "cancelled" })

    // Calculate total refunded amount from completed returns
    const totalRefunded = completed.reduce((sum: number, r: any) => {
      return sum + (Number(r.total_refund) || 0)
    }, 0)

    return {
      requested: requested.length,
      approved: approved.length,
      in_transit: in_transit.length,
      received: received.length,
      inspecting: inspecting.length,
      completed: completedCount,
      rejected: rejected.length,
      cancelled: cancelled.length,
      total_refunded: totalRefunded,
    }
  }
}

export default ReturnService
