import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils";
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows";
import {
  CreateShippingOptionSchema,
  ListShippingOptionQuerySchema,
} from "./schemas";
import {
  mapShippingOptionToResponse,
  generateShippingOptionCode,
} from "../../../utils/shipping-option-mapper";

/**
 * GET /admin/store-shipping-options
 * List all shipping options with their prices and rules
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any);
    return;
  }

  // Parse query params
  const queryResult = ListShippingOptionQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      queryResult.error.message
    );
  }

  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT);
  const pricingModule = req.scope.resolve(Modules.PRICING);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // List shipping options with relations (without prices - they're linked separately)
  const shippingOptions = await fulfillmentModule.listShippingOptions(
    {},
    {
      relations: ["type", "rules", "service_zone"],
    }
  );

  // Filter out return shipping options (is_return = true)
  const storeShippingOptions = shippingOptions.filter((option: any) => {
    const isReturnRule = option.rules?.find(
      (r: any) => r.attribute === "is_return"
    );
    return !isReturnRule || isReturnRule.value === "false";
  });

  // Get all shipping option IDs
  const shippingOptionIds = storeShippingOptions.map((so: any) => so.id);

  // Fetch prices for all shipping options via the link table
  const pricesMap = new Map<string, any[]>();

  if (shippingOptionIds.length > 0) {
    try {
      // Get shipping option price set links
      const { data: shippingOptionPriceSets } = await query.graph({
        entity: "shipping_option_price_set",
        fields: ["shipping_option_id", "price_set_id"],
        filters: {
          shipping_option_id: shippingOptionIds,
        },
      });

      // Get prices for all price sets
      const priceSetIds = shippingOptionPriceSets
        .map((sops: any) => sops.price_set_id)
        .filter(Boolean);

      if (priceSetIds.length > 0) {
        const prices = await pricingModule.listPrices(
          { price_set_id: priceSetIds },
          { select: ["id", "amount", "currency_code", "price_set_id"] }
        );

        // Create map of price_set_id to prices
        const priceSetToPrices = new Map<string, any[]>();
        for (const price of prices) {
          const existing = priceSetToPrices.get(price.price_set_id) || [];
          existing.push({
            id: price.id,
            amount: Number(price.amount) || 0,
            currency_code: price.currency_code,
          });
          priceSetToPrices.set(price.price_set_id, existing);
        }

        // Map shipping_option_id to prices
        for (const sops of shippingOptionPriceSets) {
          const prices = priceSetToPrices.get(sops.price_set_id) || [];
          pricesMap.set(sops.shipping_option_id, prices);
        }
      }
    } catch (error) {
      // Pricing lookup failed, continue without prices
      console.error("Failed to fetch shipping option prices:", error);
    }
  }

  // Attach prices to shipping options
  const shippingOptionsWithPrices = storeShippingOptions.map((option: any) => ({
    ...option,
    prices: pricesMap.get(option.id) || [],
  }));

  // Map to response format
  const mapped = shippingOptionsWithPrices.map(mapShippingOptionToResponse);

  res.json({
    shipping_options: mapped,
    count: mapped.length,
  });
};

/**
 * POST /admin/store-shipping-options
 * Create a new shipping option using Medusa workflow
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any);
    return;
  }

  // Validate request body
  const result = CreateShippingOptionSchema.safeParse(req.body);
  if (!result.success) {
    // Format Zod errors into readable message
    const errorMessages = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessages);
  }

  const data = result.data;
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT);
  const pricingModule = req.scope.resolve(Modules.PRICING);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // Get default service zone if not provided
  let serviceZoneId = data.service_zone_id;
  if (!serviceZoneId) {
    const serviceZones = await fulfillmentModule.listServiceZones();
    if (serviceZones.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No service zones found. Please run seed first."
      );
    }
    serviceZoneId = serviceZones[0].id;
  }

  // Get default shipping profile if not provided
  let shippingProfileId = data.shipping_profile_id;
  if (!shippingProfileId) {
    const shippingProfiles = await fulfillmentModule.listShippingProfiles({
      type: "default",
    });
    if (shippingProfiles.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No shipping profiles found. Please run seed first."
      );
    }
    shippingProfileId = shippingProfiles[0].id;
  }

  // Create shipping option using Medusa workflow
  const { result: workflowResult } = await createShippingOptionsWorkflow(
    req.scope
  ).run({
    input: [
      {
        name: data.name,
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfileId,
        type: {
          label: data.name,
          description: data.description || "",
          code: generateShippingOptionCode(data.name),
        },
        prices: data.prices.map((p) => ({
          currency_code: p.currency_code,
          amount: p.amount,
        })),
        rules: [
          {
            attribute: "enabled_in_store",
            value: data.enabled ? "true" : "false",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });

  // Fetch the created shipping option with relations for response
  const createdOption = await fulfillmentModule.retrieveShippingOption(
    workflowResult[0].id,
    {
      relations: ["type", "rules", "service_zone"],
    }
  );

  // Fetch prices for the created shipping option
  let prices: any[] = [];
  try {
    const { data: shippingOptionPriceSets } = await query.graph({
      entity: "shipping_option_price_set",
      fields: ["shipping_option_id", "price_set_id"],
      filters: {
        shipping_option_id: createdOption.id,
      },
    });

    if (shippingOptionPriceSets.length > 0) {
      const priceSetId = shippingOptionPriceSets[0].price_set_id;
      const pricesList = await pricingModule.listPrices(
        { price_set_id: [priceSetId] },
        { select: ["id", "amount", "currency_code", "price_set_id"] }
      );
      prices = pricesList.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount) || 0,
        currency_code: p.currency_code,
      }));
    }
  } catch (error) {
    console.error("Failed to fetch created shipping option prices:", error);
  }

  const optionWithPrices = {
    ...createdOption,
    prices,
  };

  res.status(201).json({
    shipping_option: mapShippingOptionToResponse(optionWithPrices),
  });
};

/**
 * OPTIONS /admin/store-shipping-options
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
