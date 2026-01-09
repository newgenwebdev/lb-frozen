import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { SHIPPING_SETTINGS_MODULE } from "../../../../modules/shipping-settings";
import type ShippingSettingsModuleService from "../../../../modules/shipping-settings/services/shipping-settings";

/**
 * Validate Singapore phone number for EasyParcel
 * Must be 8 digits starting with 6, 8, or 9
 */
function isValidSingaporePhone(phone: string): boolean {
  if (!phone) return false;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Remove country code if present (65)
  if (cleaned.startsWith("65") && cleaned.length > 8) {
    cleaned = cleaned.slice(2);
  }

  // Singapore numbers are 8 digits starting with 6, 8, or 9
  if (cleaned.length !== 8) return false;
  if (!cleaned.startsWith("6") && !cleaned.startsWith("8") && !cleaned.startsWith("9")) return false;

  return true;
}

/**
 * Zod schema for updating shipping settings
 */
const UpdateShippingSettingsSchema = z.object({
  sender_name: z.string().min(1, "Business name is required"),
  sender_phone: z.string()
    .min(1, "Phone number is required")
    .refine(isValidSingaporePhone, {
      message: "Must be a valid Singapore phone number (8 digits starting with 6, 8, or 9)",
    }),
  sender_address: z.string().min(1, "Address is required"),
  sender_unit: z.string().optional().nullable(),
  sender_postcode: z.string().length(6, "Postal code must be 6 digits"),
  sender_country: z.string().default("SG"),
});

/**
 * GET /admin/shipping/settings
 * Get the current shipping settings (pickup address)
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

  const settingsService = req.scope.resolve<ShippingSettingsModuleService>(
    SHIPPING_SETTINGS_MODULE
  );

  const settings = await settingsService.getSettings();

  res.json({
    settings: settings || null,
  });
};

/**
 * PUT /admin/shipping/settings
 * Create or update shipping settings
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

  const settingsService = req.scope.resolve<ShippingSettingsModuleService>(
    SHIPPING_SETTINGS_MODULE
  );

  // Validate request body
  const result = UpdateShippingSettingsSchema.safeParse(req.body);
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message);
  }

  const data = result.data;

  // Create or update settings
  const settings = await settingsService.upsertSettings({
    sender_name: data.sender_name,
    sender_phone: data.sender_phone,
    sender_address: data.sender_address,
    sender_unit: data.sender_unit ?? null,
    sender_postcode: data.sender_postcode,
    sender_country: data.sender_country || "SG",
  });

  res.json({
    settings,
    message: "Shipping settings updated successfully",
  });
};

/**
 * OPTIONS /admin/shipping/settings
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
