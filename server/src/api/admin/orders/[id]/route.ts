import type { MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules, MedusaError } from "@medusajs/framework/utils";
import { withAdminAuth } from "../../../../utils/admin-auth";
import { formatOrderResponse } from "../../../../utils/format-order";


/**
 * GET /admin/orders/:id
 * Get single order by ID with full details
 */
export const GET = withAdminAuth(async (req, res) => {
  const orderModule = req.scope.resolve(Modules.ORDER);
  const customerModule = req.scope.resolve(Modules.CUSTOMER);
  const productModule = req.scope.resolve(Modules.PRODUCT);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { id } = req.params;

  // Get order with relations using listOrders
  // Note: In Medusa v2, item metadata should be included by default with items relation
  const orders = await orderModule.listOrders(
    { id },
    {
      relations: ["items", "items.adjustments", "shipping_address", "shipping_methods"],
    }
  );

  if (!orders || orders.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id ${id} not found`
    );
  }

  const order = orders[0];

  // Debug: Log what metadata we got from the order and items
  const logger = req.scope.resolve("logger") as any;
  logger.info(`[ADMIN ORDER] Order ${order.id} metadata: ${JSON.stringify(order.metadata)}`);
  logger.info(`[ADMIN ORDER] Items count: ${order.items?.length || 0}`);
  if (order.items?.length) {
    order.items.forEach((item: any, idx: number) => {
      logger.info(`[ADMIN ORDER] Item ${idx}: id=${item.id}, title=${item.title}, metadata=${JSON.stringify(item.metadata)}, is_pwp=${item.metadata?.is_pwp_item}`);
    });
  }

  // Get customer info and payment status in parallel
  const [customer, orderWithPayment] = await Promise.all([
    order.customer_id
      ? customerModule.listCustomers({ id: [order.customer_id] }).then((c) => c[0] || null)
      : Promise.resolve(null),
    // Query payment status from payment collections
    query.graph({
      entity: "order",
      filters: { id },
      fields: [
        "id",
        "payment_collections.id",
        "payment_collections.status",
        "payment_collections.payments.id",
        "payment_collections.payments.captured_at",
      ],
    }).then((result: any) => result.data?.[0] || null),
  ]);

  // Determine payment status from payment collections
  let paymentStatus: string | undefined;
  if (orderWithPayment) {
    const paymentCollections = orderWithPayment.payment_collections || [];
    let hasCapture = false;
    let hasPayment = false;

    for (const collection of paymentCollections) {
      const payments = collection.payments || [];
      for (const payment of payments) {
        hasPayment = true;
        if (payment.captured_at) {
          hasCapture = true;
          break;
        }
      }
      if (hasCapture) break;
    }

    if (hasCapture) {
      paymentStatus = "captured";
    } else if (hasPayment) {
      paymentStatus = "authorized";
    }
  }

  // Get variant IDs from order items
  const variantIds = order.items
    ?.map((item) => item.variant_id)
    .filter(Boolean) || [];

  // Fetch product variants with their products for thumbnails
  let variantMap = new Map<
    string,
    { thumbnail: string | null; product_name: string }
  >();
  if (variantIds.length > 0) {
    try {
      const variants = await productModule.listProductVariants(
        { id: variantIds },
        { relations: ["product"] }
      );
      variantMap = new Map(
        variants.map((v) => [
          v.id,
          {
            thumbnail: (v.product as any)?.thumbnail || null,
            product_name:
              (v.product as any)?.title || v.title || "Unknown Product",
          },
        ])
      );
    } catch {
      // If product module fails, continue without thumbnails
    }
  }

  const formattedOrder = formatOrderResponse({
    order,
    customer,
    variantMap,
    overrides: paymentStatus ? { payment_status: paymentStatus } : undefined,
  });

  res.json({
    order: formattedOrder,
  });
});
