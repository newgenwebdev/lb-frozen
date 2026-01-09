import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { ARTICLE_MODULE } from "../../../../modules/article";
import type ArticleModuleService from "../../../../modules/article/services/article";

/**
 * GET /store/articles/:slug
 * Get a published article by slug (public endpoint)
 */
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const { slug } = req.params;
  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE);

  const article = await articleService.getArticleBySlug(slug);

  if (!article) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Article not found`
    );
  }

  // Only return published articles
  if (article.status !== "published") {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Article not found`
    );
  }

  res.json({ article });
};

/**
 * OPTIONS /store/articles/:slug
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
