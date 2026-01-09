import type { MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { RETURN_MODULE } from "../../../../../modules/return";
import { ORDER_EXTENSION_MODULE } from "../../../../../modules/order-extension";
import { withAdminAuth } from "../../../../../utils/admin-auth";

/**
 * POST /admin/return-requests/:id/create-replacement
 * Create a replacement order for a completed return
 *
 * This endpoint:
 * 1. Validates the return is type "replacement" and in "completed" status
 * 2. Fetches the original order data
 * 3. Creates a new order with same items, shipping address, and customer
 * 4. Preserves original discount info (PWP, coupons, points) in metadata
 * 5. Links the new order to the return request
 * 6. Creates order extension with "paid" status (no charge for replacement)
 */
export const POST = withAdminAuth(async (req, res) => {
  const returnService = req.scope.resolve(RETURN_MODULE) as any;
  const orderModule = req.scope.resolve(Modules.ORDER);
  const orderExtensionService = req.scope.resolve(ORDER_EXTENSION_MODULE) as any;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const logger = req.scope.resolve("logger") as any;
  const { id } = req.params;

  // Optional: Allow admin to specify different shipping address or items
  const {
    shipping_address: customShippingAddress,
    admin_notes: adminNotes,
  } = req.body as {
    shipping_address?: {
      first_name?: string;
      last_name?: string;
      address_1?: string;
      address_2?: string;
      city?: string;
      province?: string;
      postal_code?: string;
      country_code?: string;
      phone?: string;
    };
    admin_notes?: string;
  };

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

    // Validate return type
    if (returnRequest.return_type !== "replacement") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This return is for refund, not replacement"
      );
    }

    // Validate return status - must be completed (item received and inspected)
    if (returnRequest.status !== "completed") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Return must be completed before creating replacement order"
      );
    }

    // Check if replacement order already exists
    if (returnRequest.replacement_order_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Replacement order already created: ${returnRequest.replacement_order_id}`
      );
    }

    // Get the original order with all details using Query graph API
    const { data: originalOrders } = await query.graph({
      entity: "order",
      filters: { id: returnRequest.order_id },
      fields: [
        "id",
        "display_id",
        "customer_id",
        "email",
        "currency_code",
        "region_id",
        "sales_channel_id",
        "shipping_address.*",
        "billing_address.*",
        "items.*",
        "metadata",
      ],
    });

    if (!originalOrders || originalOrders.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Original order not found"
      );
    }

    const originalOrder = originalOrders[0] as any;

    // Prepare items for replacement order
    // Use the return items (what's being replaced)
    const returnItems = returnRequest.items || [];

    // Map return items to order items format
    // Find matching items from original order to get variant_id and other details
    const originalItems = originalOrder.items || [];
    const replacementItems = returnItems.map((returnItem: any) => {
      // Find matching item in original order
      const originalItem = originalItems.find(
        (oi: any) => oi.id === returnItem.item_id || oi.variant_id === returnItem.variant_id
      );

      return {
        variant_id: returnItem.variant_id,
        title: returnItem.product_name,
        quantity: returnItem.quantity,
        unit_price: 0, // Free replacement - no charge
        // Store original price in metadata for reference
        metadata: {
          ...(originalItem?.metadata || {}),
          is_replacement_item: true,
          original_unit_price: returnItem.unit_price,
        },
      };
    });

    // Prepare shipping address (use custom if provided, else original)
    const shippingAddress = customShippingAddress || originalOrder.shipping_address;
    const billingAddress = originalOrder.billing_address || shippingAddress;

    // Build replacement order metadata
    const replacementMetadata: Record<string, unknown> = {
      // Mark this as a replacement order
      is_replacement_order: true,
      original_order_id: originalOrder.id,
      original_order_display_id: originalOrder.display_id,
      return_request_id: returnRequest.id,
      replacement_reason: returnRequest.reason,
      replacement_reason_details: returnRequest.reason_details,
      replacement_created_at: new Date().toISOString(),

      // Copy original discount info for reference (not applied - this is $0 order)
      original_coupon_code: originalOrder.metadata?.applied_coupon_code || null,
      original_coupon_discount: originalOrder.metadata?.applied_coupon_discount || 0,
      original_points_redeemed: originalOrder.metadata?.points_to_redeem || 0,
      original_points_discount: originalOrder.metadata?.points_discount_amount || 0,
    };

    // Create the replacement order
    logger.info(`[REPLACEMENT] Creating replacement order for return ${id}, original order ${originalOrder.id}`);

    const replacementOrder = await orderModule.createOrders({
      region_id: originalOrder.region_id,
      customer_id: originalOrder.customer_id,
      sales_channel_id: originalOrder.sales_channel_id,
      currency_code: originalOrder.currency_code,
      email: originalOrder.email,
      items: replacementItems,
      shipping_address: {
        first_name: shippingAddress?.first_name || "",
        last_name: shippingAddress?.last_name || "",
        address_1: shippingAddress?.address_1 || "",
        address_2: shippingAddress?.address_2 || "",
        city: shippingAddress?.city || "",
        province: shippingAddress?.province || "",
        postal_code: shippingAddress?.postal_code || "",
        country_code: shippingAddress?.country_code || "my",
        phone: shippingAddress?.phone || "",
      },
      billing_address: {
        first_name: billingAddress?.first_name || shippingAddress?.first_name || "",
        last_name: billingAddress?.last_name || shippingAddress?.last_name || "",
        address_1: billingAddress?.address_1 || shippingAddress?.address_1 || "",
        address_2: billingAddress?.address_2 || shippingAddress?.address_2 || "",
        city: billingAddress?.city || shippingAddress?.city || "",
        province: billingAddress?.province || shippingAddress?.province || "",
        postal_code: billingAddress?.postal_code || shippingAddress?.postal_code || "",
        country_code: billingAddress?.country_code || shippingAddress?.country_code || "my",
        phone: billingAddress?.phone || shippingAddress?.phone || "",
      },
      metadata: replacementMetadata,
    });

    logger.info(`[REPLACEMENT] Created replacement order ${replacementOrder.id} (display_id: ${replacementOrder.display_id})`);

    // Create order extension for the replacement order
    // Mark as "paid" since it's a no-charge replacement
    await orderExtensionService.createOrderExtensions({
      order_id: replacementOrder.id,
      payment_status: "paid",
      fulfillment_status: "unfulfilled",
      payment_method: "replacement",
      paid_at: new Date(),
    });

    // Update the return request with replacement order ID
    await returnService.updateReturns({
      id: returnRequest.id,
      replacement_order_id: replacementOrder.id,
      replacement_created_at: new Date(),
      admin_notes: adminNotes || returnRequest.admin_notes,
    });

    // Get the updated return
    const updatedReturns = await returnService.listReturns({ id });
    const updatedReturn = updatedReturns[0];

    // Get the replacement order with items for response
    const [createdOrder] = await orderModule.listOrders(
      { id: replacementOrder.id },
      { relations: ["items", "shipping_address"] }
    );

    logger.info(`[REPLACEMENT] Successfully linked replacement order ${replacementOrder.id} to return ${id}`);

    res.json({
      success: true,
      return: {
        id: updatedReturn.id,
        status: updatedReturn.status,
        return_type: updatedReturn.return_type,
        replacement_order_id: updatedReturn.replacement_order_id,
        replacement_created_at: updatedReturn.replacement_created_at,
      },
      replacement_order: {
        id: createdOrder.id,
        display_id: createdOrder.display_id,
        customer_id: createdOrder.customer_id,
        email: createdOrder.email,
        currency_code: createdOrder.currency_code,
        items: createdOrder.items?.map((item: any) => ({
          id: item.id,
          variant_id: item.variant_id,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        shipping_address: createdOrder.shipping_address,
        metadata: createdOrder.metadata,
        created_at: createdOrder.created_at,
      },
    });
  } catch (error: any) {
    // If it's already a MedusaError, rethrow it
    if (error instanceof MedusaError) {
      throw error;
    }

    logger.error(`[REPLACEMENT] Error creating replacement order for return ${id}: ${error.message}`);
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to create replacement order: ${error.message}`
    );
  }
});
