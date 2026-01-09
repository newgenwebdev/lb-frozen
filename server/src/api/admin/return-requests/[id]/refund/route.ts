import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../modules/return";
import { POINTS_MODULE } from "../../../../../modules/points";
import { withAdminAuth } from "../../../../../utils/admin-auth";
import Stripe from "stripe";

/**
 * POST /admin/returns/:id/refund
 * Process refund via Stripe for a completed return
 */
export const POST = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const pointsService = req.scope.resolve(POINTS_MODULE) as any;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const logger = req.scope.resolve("logger") as any;
  const { id } = req.params;

  try {
    // Get the return request
    const returns = await returnService.listReturns({ id });
    if (!returns || returns.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Return with id ${id} not found`
      );
    }

    const returnRequest = returns[0];

    // Check if return is in a valid state for refund
    if (returnRequest.status !== "completed") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Return must be completed before processing refund"
      );
    }

    if (returnRequest.refund_status === "completed") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Refund has already been processed"
      );
    }

    // Only process refund for refund type (not replacement)
    if (returnRequest.return_type !== "refund") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This return is for replacement, not refund"
      );
    }

    // Get the order's payment collection using Query graph API (Medusa 2.x pattern)
    const { data: ordersWithPayments } = await query.graph({
      entity: "order",
      filters: { id: returnRequest.order_id },
      fields: [
        "id",
        "payment_collections.id",
        "payment_collections.status",
        "payment_collections.payments.id",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.captured_at",
        "payment_collections.payments.data",
        "payment_collections.payments.amount",
      ],
    });

    if (!ordersWithPayments || ordersWithPayments.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Order not found"
      );
    }

    const orderWithPayments = ordersWithPayments[0] as any;
    const paymentCollections = orderWithPayments.payment_collections || [];

    if (paymentCollections.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No payment collection found for this order"
      );
    }

    // Find the successful Stripe payment across all collections
    let stripePayment: any = null;
    for (const collection of paymentCollections) {
      const payments = collection.payments || [];
      stripePayment = payments.find(
        (p: any) =>
          p.provider_id === "pp_stripe_stripe" && p.captured_at !== null
      );
      if (stripePayment) break;
    }

    if (!stripePayment) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No captured Stripe payment found for this order"
      );
    }

    // Update refund status to processing
    await returnService.updateRefundStatus(id, "processing");

    // Initialize Stripe
    const stripeApiKey = process.env.STRIPE_API_KEY;
    if (!stripeApiKey) {
      await returnService.updateRefundStatus(id, "failed");
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe API key not configured"
      );
    }

    const stripe = new Stripe(stripeApiKey, {
      // @ts-ignore - Using latest Stripe API version
      apiVersion: "2024-12-18.acacia",
    });

    // Get the payment intent ID from the payment data
    const paymentData = stripePayment.data as any;
    const paymentIntentId = paymentData?.id;

    if (!paymentIntentId) {
      await returnService.updateRefundStatus(id, "failed");
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Could not find Stripe payment intent ID"
      );
    }

    // Create the refund in Stripe
    // Use refund_amount + shipping_refund to ensure consistency with displayed values
    // This avoids issues with legacy returns that may have stored incorrect total_refund values
    const refundAmount = Number(returnRequest.refund_amount) + Number(returnRequest.shipping_refund || 0);

    const stripeRefund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount, // Amount in cents
      reason: "requested_by_customer",
      metadata: {
        return_id: returnRequest.id,
        order_id: returnRequest.order_id,
        return_reason: returnRequest.reason,
      },
    });

    // Update the return with refund info
    await returnService.updateReturns({
      id: returnRequest.id,
      refund_status: "completed",
      stripe_refund_id: stripeRefund.id,
      refunded_at: new Date(),
    });

    // Handle points adjustment for the return
    let pointsResult = null;
    try {
      // Get points earned from the original order
      const pointsEarned = await pointsService.getPointsEarnedFromOrder(
        returnRequest.customer_id,
        returnRequest.order_id
      );

      // Get points redeemed on the original order
      const pointsRedeemed = await pointsService.getPointsRedeemedOnOrder(
        returnRequest.customer_id,
        returnRequest.order_id
      );

      // Calculate proportional points to deduct based on return amount vs order total
      // For full returns, deduct all earned points; for partial returns, calculate proportionally
      const returnItems = returnRequest.items || [];
      const returnItemsValue = returnItems.reduce((sum: number, item: any) => {
        return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0);
      }, 0);

      // For now, we deduct all points if any items are returned
      // In a more sophisticated implementation, you could calculate proportionally
      const pointsToDeduct = pointsEarned;
      const pointsToRestore = pointsRedeemed;

      if (pointsToDeduct > 0 || pointsToRestore > 0) {
        pointsResult = await pointsService.handleReturnPoints({
          customer_id: returnRequest.customer_id,
          order_id: returnRequest.order_id,
          return_id: returnRequest.id,
          points_to_deduct: pointsToDeduct,
          points_to_restore: pointsToRestore,
        });

        logger.info(
          `[REFUND] Points adjusted for return ${id}: ` +
          `deducted=${pointsResult.points_deducted}, restored=${pointsResult.points_restored}, ` +
          `new_balance=${pointsResult.new_balance}`
        );
      }
    } catch (pointsError: any) {
      // Log but don't fail the refund if points adjustment fails
      logger.error(`[REFUND] Error adjusting points for return ${id}: ${pointsError.message}`);
    }

    // Get updated return
    const updatedReturns = await returnService.listReturns({ id });
    const updatedReturn = updatedReturns[0];

    res.json({
      success: true,
      return: updatedReturn,
      refund: {
        id: stripeRefund.id,
        amount: stripeRefund.amount,
        status: stripeRefund.status,
        currency: stripeRefund.currency,
      },
      points: pointsResult,
    });
  } catch (error: any) {
    // If it's already a MedusaError, rethrow it
    if (error instanceof MedusaError) {
      throw error;
    }

    // Update status to failed if Stripe error
    try {
      await returnService.updateRefundStatus(id, "failed");
    } catch {
      // Ignore errors from status update
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Refund failed: ${error.message}`
    );
  }
});
