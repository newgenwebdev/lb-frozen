import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import Stripe from "stripe";
import { STRIPE_API_KEY } from "../../../../lib/constants";
import { createPaymentCollectionForCartWorkflow } from "@medusajs/medusa/core-flows";

/**
 * POST /store/customer/pay-with-saved-card
 * Pay for a cart using a saved payment method
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { payment_method_id, cart_id } = req.body as {
      payment_method_id: string;
      cart_id: string;
    };

    if (!payment_method_id || !cart_id) {
      return res.status(400).json({
        error: "payment_method_id and cart_id are required",
      });
    }

    if (!STRIPE_API_KEY) {
      return res.status(500).json({
        error: "Stripe is not configured",
      });
    }

    const customerId = (req as any).auth_context?.actor_id;
    if (!customerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const stripe = new Stripe(STRIPE_API_KEY, {
      apiVersion: "2024-06-20" as any,
    });

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const customerService = req.scope.resolve(Modules.CUSTOMER);
    const paymentService = req.scope.resolve(Modules.PAYMENT);

    // Get cart with totals
    const { data: [cart] } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "currency_code",
        "total",
        "subtotal",
        "item_total",
        "shipping_total",
        "region_id",
        "email",
        "items.*",
      ],
      filters: { id: cart_id },
    });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const customer = await customerService.retrieveCustomer(customerId);
    const stripeCustomerId = customer?.metadata?.stripe_customer_id as string;

    if (!stripeCustomerId) {
      return res.status(400).json({
        error: "No Stripe customer found. Please add a card first.",
      });
    }

    const amount = Number(cart.total) || 0;
    const currency = cart.currency_code || "myr";

    console.log("[PAY-SAVED-CARD] Cart:", { id: cart.id, total: cart.total, amount, currency });

    const minAmounts: Record<string, number> = { myr: 200, usd: 50, sgd: 50 };
    const minAmount = minAmounts[currency.toLowerCase()] || 200;

    if (amount < minAmount) {
      return res.status(400).json({
        error: `Minimum order amount is ${(minAmount / 100).toFixed(2)} ${currency.toUpperCase()}. Current total: ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`,
      });
    }

    // Step 1: Get or create payment collection
    let paymentCollectionId: string;
    
    // Check if cart already has a payment collection
    const { data: [cartWithPayment] } = await query.graph({
      entity: "cart",
      fields: ["payment_collection.id", "payment_collection.payment_sessions.*"],
      filters: { id: cart_id },
    });
    
    if (cartWithPayment?.payment_collection?.id) {
      paymentCollectionId = cartWithPayment.payment_collection.id;
      console.log("[PAY-SAVED-CARD] Using existing payment collection:", paymentCollectionId);
    } else {
      console.log("[PAY-SAVED-CARD] Creating payment collection via workflow...");
      const { result: paymentCollectionResult } = await createPaymentCollectionForCartWorkflow(req.scope).run({
        input: { cart_id },
      });
      paymentCollectionId = paymentCollectionResult.id;
      console.log("[PAY-SAVED-CARD] Payment collection created:", paymentCollectionId);
    }

    // Step 2: Get or create payment session for Stripe
    let paymentSession = cartWithPayment?.payment_collection?.payment_sessions?.find(
      (s: any) => s.provider_id === "pp_stripe_stripe"
    );
    
    if (!paymentSession) {
      console.log("[PAY-SAVED-CARD] Initializing payment session...");
      paymentSession = await paymentService.createPaymentSession(paymentCollectionId, {
        provider_id: "pp_stripe_stripe",
        amount: amount,
        currency_code: currency,
        data: {
          customer: stripeCustomerId,
        },
      });
      console.log("[PAY-SAVED-CARD] Payment session created:", paymentSession.id);
    } else {
      console.log("[PAY-SAVED-CARD] Using existing payment session:", paymentSession.id);
    }

    // Step 3: Get the PaymentIntent ID from the session data
    const stripePaymentIntentId = paymentSession.data?.id as string;
    if (!stripePaymentIntentId) {
      return res.status(500).json({
        error: "Failed to get Stripe PaymentIntent from session",
      });
    }
    console.log("[PAY-SAVED-CARD] Stripe PaymentIntent ID:", stripePaymentIntentId);

    // Step 4: Update PaymentIntent to attach customer, then confirm with saved payment method
    console.log("[PAY-SAVED-CARD] Updating payment intent with customer...");
    await stripe.paymentIntents.update(stripePaymentIntentId, {
      customer: stripeCustomerId,
    });

    console.log("[PAY-SAVED-CARD] Confirming payment intent with saved card...");
    const paymentIntent = await stripe.paymentIntents.confirm(stripePaymentIntentId, {
      payment_method: payment_method_id,
      off_session: true,
    });

    console.log("[PAY-SAVED-CARD] Payment intent status:", paymentIntent.status);

    if (paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded") {
      // Step 5: Authorize payment session in Medusa
      console.log("[PAY-SAVED-CARD] Authorizing payment session...");
      try {
        await paymentService.authorizePaymentSession(paymentSession.id, {});
        console.log("[PAY-SAVED-CARD] Payment session authorized");
      } catch (authError: any) {
        console.log("[PAY-SAVED-CARD] Auth note:", authError.message);
      }

      // Step 6: If requires_capture, capture the payment immediately
      let finalStatus: string = paymentIntent.status;
      if (paymentIntent.status === "requires_capture") {
        console.log("[PAY-SAVED-CARD] Capturing payment intent...");
        try {
          const capturedIntent = await stripe.paymentIntents.capture(stripePaymentIntentId);
          finalStatus = capturedIntent.status;
          console.log("[PAY-SAVED-CARD] Payment captured, status:", finalStatus);
          
          // Step 7: Now capture in Medusa as well
          // First, get the payment from the payment collection
          const { data: [updatedCart] } = await query.graph({
            entity: "cart",
            fields: [
              "payment_collection.id",
              "payment_collection.status",
              "payment_collection.payments.id",
              "payment_collection.payments.amount",
              "payment_collection.payments.captured_at",
            ],
            filters: { id: cart_id },
          });
          
          const payments = updatedCart?.payment_collection?.payments || [];
          for (const payment of payments) {
            if (!payment.captured_at) {
              console.log("[PAY-SAVED-CARD] Capturing Medusa payment:", payment.id);
              try {
                await paymentService.capturePayment({
                  payment_id: payment.id,
                  amount: payment.amount,
                });
                console.log("[PAY-SAVED-CARD] Medusa payment captured");
              } catch (captureErr: any) {
                console.log("[PAY-SAVED-CARD] Medusa capture note:", captureErr.message);
              }
            }
          }
        } catch (captureError: any) {
          console.log("[PAY-SAVED-CARD] Capture note:", captureError.message);
          // Even if capture fails, authorization was successful
        }
      }

      return res.json({
        success: true,
        payment_intent_id: paymentIntent.id,
        payment_collection_id: paymentCollectionId,
        status: finalStatus,
      });
    } else if (paymentIntent.status === "requires_action") {
      return res.json({
        success: false,
        requires_action: true,
        payment_intent_client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        payment_collection_id: paymentCollectionId,
      });
    } else {
      return res.status(400).json({
        error: `Payment failed with status: ${paymentIntent.status}`,
      });
    }
  } catch (error: any) {
    console.error("Pay with saved card error:", error);

    if (error.type === "StripeCardError") {
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to process payment",
    });
  }
}
