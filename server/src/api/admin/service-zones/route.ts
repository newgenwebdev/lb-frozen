import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /admin/service-zones
 * List all service zones for dropdown selection
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

  const serviceZones = await fulfillmentModule.listServiceZones();

  res.json({
    service_zones: serviceZones.map((zone: any) => ({
      id: zone.id,
      name: zone.name,
    })),
  });
};

/**
 * OPTIONS /admin/service-zones
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
