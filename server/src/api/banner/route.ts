import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { BANNER_MODULE } from "../../modules/banner";
import type BannerModuleService from "../../modules/banner/services/banner";
import { ListBannerQuerySchema } from "../admin/banner/schemas";

/**
 * GET /banner
 * List all banners with pagination and filtering (Public endpoint)
 * CORS: Open to all origins
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  // Set CORS headers to allow all origins (public endpoint)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  const bannerService = req.scope.resolve<BannerModuleService>(BANNER_MODULE);

  // Parse query params
  const queryResult = ListBannerQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      queryResult.error.message
    );
  }

  const { limit, offset, status } = queryResult.data;

  // Get banners with pagination, filtering, and sorting
  const [banners, count] = await bannerService.listAllBanners({
    limit,
    offset,
    status: status as "active" | "non_active" | "all",
  });

  res.json({
    banners,
    count,
    limit,
    offset,
  });
};

/**
 * OPTIONS /banner
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  res.status(204).send();
};
