import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ARTICLE_MODULE } from "../../../modules/article";
import type ArticleModuleService from "../../../modules/article/services/article";
import { z } from "zod";

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  category: z.string().optional(),
  featured: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
});

/**
 * GET /store/articles
 * List published articles (public endpoint)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE);

  const queryResult = ListQuerySchema.safeParse(req.query);
  const query = queryResult.success ? queryResult.data : { limit: 20, offset: 0 };

  const [articles, count] = await articleService.listAllArticles({
    limit: query.limit,
    offset: query.offset,
    status: "published", // Only published articles
    category: query.category,
    featured: query.featured,
    order: { published_at: "DESC" },
  });

  res.json({
    articles,
    count,
    limit: query.limit,
    offset: query.offset,
  });
};

/**
 * OPTIONS /store/articles
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
