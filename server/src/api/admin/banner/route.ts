import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { BANNER_MODULE } from "../../../modules/banner";
import type BannerModuleService from "../../../modules/banner/services/banner";
import { CreateBannerSchema } from "./schemas";

/**
 * POST /admin/banner
 * Create a new banner
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

  const bannerService = req.scope.resolve<BannerModuleService>(BANNER_MODULE);

  // Validate request body
  const result = CreateBannerSchema.safeParse(req.body);
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message);
  }

  const data = result.data;

  // Validate date range
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);

  if (endDate <= startDate) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "End date must be after start date"
    );
  }

  // Create banner
  const banner = await bannerService.createBanner({
    announcement_text: data.announcement_text,
    link: data.link || null,
    start_date: startDate,
    end_date: endDate,
    background_color: data.background_color,
    text_color: data.text_color,
  });

  // Calculate active status based on dates ONLY (not is_enabled)
  // is_active = is the banner within its date range?
  // is_enabled = is this banner selected to show on frontend? (separate concept)
  const now = new Date();
  const isActive =
    now >= new Date(banner.start_date) && now <= new Date(banner.end_date);

  // Format response
  const formattedBanner = {
    id: banner.id,
    announcement_text: banner.announcement_text,
    link: banner.link,
    start_date: banner.start_date,
    end_date: banner.end_date,
    background_color: banner.background_color,
    text_color: banner.text_color,
    is_enabled: banner.is_enabled ?? true,
    is_active: isActive,
    created_at: banner.created_at,
    updated_at: banner.updated_at,
  };

  res.status(201).json({ banner: formattedBanner });
};

/**
 * OPTIONS /admin/banner
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
