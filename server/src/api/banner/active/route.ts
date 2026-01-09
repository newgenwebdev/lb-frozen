import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BANNER_MODULE } from "../../../modules/banner";
import type BannerModuleService from "../../../modules/banner/services/banner";

/**
 * GET /banner/active
 * Get the currently enabled banner for frontend display (Public endpoint)
 * Returns the single banner that has is_enabled=true
 * CORS: Open to all origins
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Set CORS headers to allow all origins (public endpoint)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-publishable-api-key");

  const bannerService = req.scope.resolve<BannerModuleService>(BANNER_MODULE);

  // Get all banners and find the enabled one
  const banners = await bannerService.listBanners(
    { is_enabled: true },
    { take: 1 }
  );

  const activeBanner = banners[0] || null;

  res.json({
    banner: activeBanner,
  });
};

/**
 * OPTIONS /banner/active
 * Handle CORS preflight request
 * CORS: Open to all origins
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Set CORS headers to allow all origins (public endpoint)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-publishable-api-key");

  res.status(204).send();
};
