import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { BANNER_MODULE } from "../../../../modules/banner";
import type BannerModuleService from "../../../../modules/banner/services/banner";
import { UpdateBannerSchema, ToggleBannerStatusSchema } from "../schemas";

/**
 * GET /admin/banner/:id
 * Get a single banner by ID
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
  const bannerService = req.scope.resolve<BannerModuleService>(BANNER_MODULE);

  try {
    const banner = await bannerService.getBannerById(id);

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

    res.json({ banner: formattedBanner });
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Banner with id "${id}" not found`
    );
  }
};

/**
 * PUT /admin/banner/:id
 * Update a banner
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
  const bannerService = req.scope.resolve<BannerModuleService>(BANNER_MODULE);

  // Validate request body
  const validationResult = UpdateBannerSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      validationResult.error.message
    );
  }

  const data = validationResult.data;

  // Check if banner exists
  let banner;
  try {
    banner = await bannerService.getBannerById(id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Banner with id "${id}" not found`
    );
  }

  // Validate date range if both dates are being updated
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (endDate <= startDate) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "End date must be after start date"
      );
    }
  } else if (data.start_date) {
    // If only start_date is updated, check against existing end_date
    const startDate = new Date(data.start_date);
    const endDate = new Date(banner.end_date);

    if (endDate <= startDate) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "End date must be after start date"
      );
    }
  } else if (data.end_date) {
    // If only end_date is updated, check against existing start_date
    const startDate = new Date(banner.start_date);
    const endDate = new Date(data.end_date);

    if (endDate <= startDate) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "End date must be after start date"
      );
    }
  }

  // Prepare update data
  const updateData: any = { id };
  if (data.announcement_text !== undefined)
    updateData.announcement_text = data.announcement_text;
  if (data.link !== undefined) updateData.link = data.link;
  if (data.start_date !== undefined) updateData.start_date = data.start_date;
  if (data.end_date !== undefined) updateData.end_date = data.end_date;
  if (data.background_color !== undefined)
    updateData.background_color = data.background_color;
  if (data.text_color !== undefined) updateData.text_color = data.text_color;
  if (data.is_enabled !== undefined) updateData.is_enabled = data.is_enabled;

  // Update banner
  const updatedBanner = await bannerService.updateBanner(updateData);

  // Calculate active status based on dates ONLY (not is_enabled)
  // is_active = is the banner within its date range?
  // is_enabled = is this banner selected to show on frontend? (separate concept)
  const now = new Date();
  const isActive =
    now >= new Date(updatedBanner.start_date) &&
    now <= new Date(updatedBanner.end_date);

  // Format response
  const formattedBanner = {
    id: updatedBanner.id,
    announcement_text: updatedBanner.announcement_text,
    link: updatedBanner.link,
    start_date: updatedBanner.start_date,
    end_date: updatedBanner.end_date,
    background_color: updatedBanner.background_color,
    text_color: updatedBanner.text_color,
    is_enabled: updatedBanner.is_enabled ?? true,
    is_active: isActive,
    created_at: updatedBanner.created_at,
    updated_at: updatedBanner.updated_at,
  };

  res.json({ banner: formattedBanner });
};

/**
 * DELETE /admin/banner/:id
 * Delete a banner
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
  const bannerService = req.scope.resolve<BannerModuleService>(BANNER_MODULE);

  // Check if banner exists
  try {
    await bannerService.getBannerById(id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Banner with id "${id}" not found`
    );
  }

  // Delete banner
  await bannerService.deleteBanner(id);

  res.status(200).json({ id, deleted: true });
};

/**
 * PATCH /admin/banner/:id
 * Toggle banner enabled status (quick toggle endpoint)
 */
export const PATCH = async (
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
  const bannerService = req.scope.resolve<BannerModuleService>(BANNER_MODULE);

  // Validate request body
  const validationResult = ToggleBannerStatusSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      validationResult.error.message
    );
  }

  const { is_enabled } = validationResult.data;

  // Check if banner exists
  let banner;
  try {
    banner = await bannerService.getBannerById(id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Banner with id "${id}" not found`
    );
  }

  // Toggle banner status
  const updatedBanner = await bannerService.toggleBannerEnabled(id, is_enabled);

  // Calculate active status based on dates ONLY (not is_enabled)
  // is_active = is the banner within its date range?
  // is_enabled = is this banner selected to show on frontend? (separate concept)
  const now = new Date();
  const isActive =
    now >= new Date(updatedBanner.start_date) &&
    now <= new Date(updatedBanner.end_date);

  // Format response
  const formattedBanner = {
    id: updatedBanner.id,
    announcement_text: updatedBanner.announcement_text,
    link: updatedBanner.link,
    start_date: updatedBanner.start_date,
    end_date: updatedBanner.end_date,
    background_color: updatedBanner.background_color,
    text_color: updatedBanner.text_color,
    is_enabled: updatedBanner.is_enabled,
    is_active: isActive,
    created_at: updatedBanner.created_at,
    updated_at: updatedBanner.updated_at,
  };

  res.json({ banner: formattedBanner });
};

/**
 * OPTIONS /admin/banner/:id
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};

