import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { SHIPMENT_MODULE } from "../../../modules/shipment";
import type ShipmentModuleService from "../../../modules/shipment/services/shipment";
import { CreateShipmentSchema, ListShipmentQuerySchema } from "./schemas";

/**
 * GET /admin/shipment
 * List all shipments with pagination and filtering
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

  const shipmentService = req.scope.resolve<ShipmentModuleService>(SHIPMENT_MODULE);

  // Parse query params
  const queryResult = ListShipmentQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      queryResult.error.message
    );
  }

  const { limit, offset, status } = queryResult.data;

  // Get shipments with pagination and filtering
  const [shipments, count] = await shipmentService.listAllShipments({
    limit,
    offset,
    status: status as "Active" | "Non Active" | "all",
  });

  res.json({
    shipments,
    count,
    limit,
    offset,
  });
};

/**
 * POST /admin/shipment
 * Create a new shipment
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

  const shipmentService = req.scope.resolve<ShipmentModuleService>(SHIPMENT_MODULE);

  // Validate request body
  const result = CreateShipmentSchema.safeParse(req.body);
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message);
  }

  const data = result.data;

  // Create shipment
  const shipment = await shipmentService.createShipment({
    name: data.name,
    base_rate: data.base_rate,
    eta: data.eta,
    status: data.status || "Active",
  });

  // Format response
  const formattedShipment = {
    id: shipment.id,
    name: shipment.name,
    base_rate: shipment.base_rate,
    eta: shipment.eta,
    status: shipment.status,
    created_at: shipment.created_at,
    updated_at: shipment.updated_at,
  };

  res.status(201).json({ shipment: formattedShipment });
};

/**
 * OPTIONS /admin/shipment
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};

