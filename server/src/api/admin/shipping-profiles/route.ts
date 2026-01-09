import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /admin/shipping-profiles
 * List all shipping profiles for dropdown selection
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

  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT);

  const shippingProfiles = await fulfillmentModule.listShippingProfiles();

  res.json({
    shipping_profiles: shippingProfiles.map((profile: any) => ({
      id: profile.id,
      name: profile.name,
      type: profile.type,
    })),
  });
};

/**
 * OPTIONS /admin/shipping-profiles
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
