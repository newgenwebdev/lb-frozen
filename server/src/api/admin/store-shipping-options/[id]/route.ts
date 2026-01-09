import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils";
import {
  updateShippingOptionsWorkflow,
  deleteShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";
import { UpdateShippingOptionSchema } from "../schemas";
import { mapShippingOptionToResponse } from "../../../../utils/shipping-option-mapper";

/**
 * Helper function to fetch prices for a shipping option
 */
async function fetchShippingOptionPrices(
  shippingOptionId: string,
  query: any,
  pricingModule: any
): Promise<any[]> {
  try {
    const { data: shippingOptionPriceSets } = await query.graph({
      entity: "shipping_option_price_set",
      fields: ["shipping_option_id", "price_set_id"],
      filters: {
        shipping_option_id: shippingOptionId,
      },
    });

    if (shippingOptionPriceSets.length > 0) {
      const priceSetId = shippingOptionPriceSets[0].price_set_id;
      const pricesList = await pricingModule.listPrices(
        { price_set_id: [priceSetId] },
        { select: ["id", "amount", "currency_code", "price_set_id"] }
      );
      return pricesList.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount) || 0,
        currency_code: p.currency_code,
      }));
    }
  } catch (error) {
    console.error("Failed to fetch shipping option prices:", error);
  }
  return [];
}

/**
 * GET /admin/store-shipping-options/:id
 * Get a single shipping option by ID
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

  const { id } = req.params;
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT);
  const pricingModule = req.scope.resolve(Modules.PRICING);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  try {
    const shippingOption = await fulfillmentModule.retrieveShippingOption(id, {
      relations: ["type", "rules", "service_zone"],
    });

    // Fetch prices separately
    const prices = await fetchShippingOptionPrices(id, query, pricingModule);

    const optionWithPrices = {
      ...shippingOption,
      prices,
    };

    res.json({
      shipping_option: mapShippingOptionToResponse(optionWithPrices),
    });
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping option with id ${id} not found`
    );
  }
};

/**
 * PUT /admin/store-shipping-options/:id
 * Update an existing shipping option
 */
export const PUT = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any);
    return;
  }

  const { id } = req.params;

  // Validate request body
  const result = UpdateShippingOptionSchema.safeParse(req.body);
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message);
  }

  const data = result.data;
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT);
  const pricingModule = req.scope.resolve(Modules.PRICING);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // Verify the shipping option exists
  try {
    await fulfillmentModule.retrieveShippingOption(id);
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping option with id ${id} not found`
    );
  }

  // Get existing shipping option to merge updates
  const existingOption = await fulfillmentModule.retrieveShippingOption(id, {
    relations: ["type", "rules"],
  });

  // Fetch existing prices
  const existingPrices = await fetchShippingOptionPrices(id, query, pricingModule);

  // Build update payload
  const updatePayload: any = { id };

  if (data.name !== undefined) {
    updatePayload.name = data.name;
  }

  // Update type if description changed
  if (data.description !== undefined) {
    updatePayload.type = {
      id: existingOption.type?.id,
      label: data.name || existingOption.name,
      description: data.description,
      code: existingOption.type?.code,
    };
  }

  // Update prices if provided
  if (data.prices !== undefined) {
    updatePayload.prices = data.prices.map((p) => {
      // Try to find existing price for this currency to update it
      const existingPrice = existingPrices?.find(
        (ep: any) => ep.currency_code === p.currency_code
      );
      return {
        id: existingPrice?.id,
        currency_code: p.currency_code,
        amount: p.amount,
      };
    });
  }

  // Update enabled status via rules if provided
  if (data.enabled !== undefined) {
    const existingRules = existingOption.rules || [];
    updatePayload.rules = existingRules.map((rule: any) => {
      if (rule.attribute === "enabled_in_store") {
        return {
          id: rule.id,
          attribute: "enabled_in_store",
          operator: "eq",
          value: data.enabled ? "true" : "false",
        };
      }
      return rule;
    });

    // If no enabled_in_store rule exists, add it
    const hasEnabledRule = existingRules.some(
      (r: any) => r.attribute === "enabled_in_store"
    );
    if (!hasEnabledRule) {
      updatePayload.rules = [
        ...(updatePayload.rules || []),
        {
          attribute: "enabled_in_store",
          operator: "eq",
          value: data.enabled ? "true" : "false",
        },
      ];
    }
  }

  // Run update workflow
  await updateShippingOptionsWorkflow(req.scope).run({
    input: [updatePayload],
  });

  // Fetch updated shipping option with relations
  const updatedOption = await fulfillmentModule.retrieveShippingOption(id, {
    relations: ["type", "rules", "service_zone"],
  });

  // Fetch updated prices
  const updatedPrices = await fetchShippingOptionPrices(id, query, pricingModule);

  const optionWithPrices = {
    ...updatedOption,
    prices: updatedPrices,
  };

  res.json({
    shipping_option: mapShippingOptionToResponse(optionWithPrices),
  });
};

/**
 * DELETE /admin/store-shipping-options/:id
 * Delete a shipping option
 */
export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Custom auth check
  const authContext = (req as any).auth_context;
  if (!authContext?.actor_id) {
    res.status(401).json({ message: "Unauthorized" } as any);
    return;
  }

  const { id } = req.params;
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT);

  // Verify the shipping option exists
  try {
    await fulfillmentModule.retrieveShippingOption(id);
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipping option with id ${id} not found`
    );
  }

  // Delete using workflow
  await deleteShippingOptionsWorkflow(req.scope).run({
    input: { ids: [id] },
  });

  res.json({
    id,
    deleted: true,
  });
};

/**
 * OPTIONS /admin/store-shipping-options/:id
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
