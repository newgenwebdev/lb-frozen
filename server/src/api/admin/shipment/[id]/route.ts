import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { SHIPMENT_MODULE } from "../../../../modules/shipment";
import type ShipmentModuleService from "../../../../modules/shipment/services/shipment";
import { UpdateShipmentSchema } from "../schemas";

/**
 * GET /admin/shipment/:id
 * Get a single shipment by ID
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
  const shipmentService = req.scope.resolve<ShipmentModuleService>(SHIPMENT_MODULE);

  try {
    const shipment = await shipmentService.getShipmentById(id);

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

    res.json({ shipment: formattedShipment });
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipment with id "${id}" not found`
    );
  }
};

/**
 * PUT /admin/shipment/:id
 * Update a shipment
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
  const shipmentService = req.scope.resolve<ShipmentModuleService>(SHIPMENT_MODULE);

  // Validate request body
  const validationResult = UpdateShipmentSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      validationResult.error.message
    );
  }

  const data = validationResult.data;

  // Check if shipment exists
  try {
    await shipmentService.getShipmentById(id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipment with id "${id}" not found`
    );
  }

  // Prepare update data
  const updateData: any = { id };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.base_rate !== undefined) updateData.base_rate = data.base_rate;
  if (data.eta !== undefined) updateData.eta = data.eta;
  if (data.status !== undefined) updateData.status = data.status;

  // Update shipment
  const updatedShipment = await shipmentService.updateShipment(updateData);

  // Format response
  const formattedShipment = {
    id: updatedShipment.id,
    name: updatedShipment.name,
    base_rate: updatedShipment.base_rate,
    eta: updatedShipment.eta,
    status: updatedShipment.status,
    created_at: updatedShipment.created_at,
    updated_at: updatedShipment.updated_at,
  };

  res.json({ shipment: formattedShipment });
};

/**
 * DELETE /admin/shipment/:id
 * Delete a shipment
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
  const shipmentService = req.scope.resolve<ShipmentModuleService>(SHIPMENT_MODULE);

  // Check if shipment exists
  try {
    await shipmentService.getShipmentById(id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Shipment with id "${id}" not found`
    );
  }

  // Delete shipment
  await shipmentService.deleteShipment(id);

  res.status(200).json({ id, deleted: true });
};

/**
 * OPTIONS /admin/shipment/:id
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};

