import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import Stripe from "stripe"
import { STRIPE_API_KEY } from "../../../../lib/constants"
import { getVerifiedCustomerId } from "../../../../utils/store-auth"

/**
 * GET /store/customer/payment-methods
 * List saved payment methods for the authenticated customer
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Customer authentication required"
    )
  }

  if (!STRIPE_API_KEY) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Stripe is not configured"
    )
  }

  const logger = req.scope.resolve("logger")
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  try {
    // Get customer to check for Stripe customer ID
    const customer = await customerModuleService.retrieveCustomer(customerId)

    const metadata = (customer.metadata || {}) as Record<string, unknown>
    let stripeCustomerId = metadata.stripe_customer_id as string | undefined

    if (!stripeCustomerId) {
      // No Stripe customer yet, return empty array
      res.json({ payment_methods: [] })
      return
    }

    const stripe = new Stripe(STRIPE_API_KEY, {
      apiVersion: "2023-10-16",
    })

    // Verify Stripe customer still exists and is not deleted
    let customerValid = false
    try {
      const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId) as any
      // Check if customer is soft-deleted
      customerValid = !stripeCustomer.deleted
    } catch (e) {
      customerValid = false
    }

    if (!customerValid) {
      // Stripe customer was deleted, clear metadata and return empty
      logger.warn(`Stripe customer ${stripeCustomerId} not found or deleted, clearing metadata`)
      try {
        await customerModuleService.updateCustomers(customerId, {
          metadata: {
            ...metadata,
            stripe_customer_id: null,
          },
        })
      } catch (updateErr) {
        logger.error(`Failed to clear stripe_customer_id: ${updateErr}`)
      }
      res.json({ payment_methods: [] })
      return
    }

    // List payment methods for this customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    })

    // Format response
    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
            funding: pm.card.funding,
          }
        : null,
      billing_details: {
        name: pm.billing_details?.name,
        email: pm.billing_details?.email,
      },
      created: pm.created,
    }))

    res.json({ payment_methods: formattedMethods })
  } catch (error: any) {
    logger.error(`Failed to list payment methods: ${error}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to list payment methods: ${error.message}`
    )
  }
}

/**
 * POST /store/customer/payment-methods
 * Create a SetupIntent for adding a new payment method
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const customerId = getVerifiedCustomerId(req)

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Customer authentication required"
    )
  }

  if (!STRIPE_API_KEY) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Stripe is not configured"
    )
  }

  const logger = req.scope.resolve("logger")
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)

  try {
    // Get customer
    const customer = await customerModuleService.retrieveCustomer(customerId)

    const metadata = (customer.metadata || {}) as Record<string, unknown>
    let stripeCustomerId = metadata.stripe_customer_id as string | undefined

    const stripe = new Stripe(STRIPE_API_KEY, {
      apiVersion: "2023-10-16",
    })

    // Helper function to create a new Stripe customer
    const createStripeCustomer = async () => {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: [customer.first_name, customer.last_name].filter(Boolean).join(" ") || undefined,
        metadata: {
          medusa_customer_id: customerId,
        },
      })

      // Save Stripe customer ID to Medusa customer metadata
      await customerModuleService.updateCustomers(customerId, {
        metadata: {
          ...metadata,
          stripe_customer_id: stripeCustomer.id,
        },
      })

      logger.info(`Created Stripe customer ${stripeCustomer.id} for Medusa customer ${customerId}`)
      return stripeCustomer.id
    }

    // Verify Stripe customer exists and is not deleted
    if (stripeCustomerId) {
      let needsNewCustomer = false
      try {
        const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId) as any
        // Check if customer is soft-deleted
        if (stripeCustomer.deleted) {
          needsNewCustomer = true
        }
      } catch (stripeError: any) {
        needsNewCustomer = true
      }
      
      if (needsNewCustomer) {
        logger.warn(`Stripe customer ${stripeCustomerId} not found or deleted, creating new one`)
        stripeCustomerId = await createStripeCustomer()
      }
    } else {
      // No Stripe customer ID stored, create one
      stripeCustomerId = await createStripeCustomer()
    }

    // Create SetupIntent for saving the card
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      metadata: {
        medusa_customer_id: customerId,
      },
    })

    res.json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
    })
  } catch (error: any) {
    logger.error(`Failed to create setup intent: ${error}`)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to create setup intent: ${error.message}`
    )
  }
}

/**
 * OPTIONS /store/customer/payment-methods
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  _req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send()
}
