import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { ARTICLE_MODULE } from "../../../../modules/article";
import type ArticleModuleService from "../../../../modules/article/services/article";
import { UpdateArticleSchema } from "../schemas";

/**
 * GET /admin/articles/:id
 * Get a single article by ID
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
  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE);

  try {
    const article = await articleService.getArticleById(id);
    res.json({ article });
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Article with id "${id}" not found`
    );
  }
};

/**
 * PUT /admin/articles/:id
 * Update an article
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
  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE);

  // Validate request body
  const validationResult = UpdateArticleSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      validationResult.error.message
    );
  }

  const data = validationResult.data;

  // Check if article exists
  try {
    await articleService.getArticleById(id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Article with id "${id}" not found`
    );
  }

  // If updating slug, check for uniqueness
  if (data.slug) {
    const existingArticle = await articleService.getArticleBySlug(data.slug);
    if (existingArticle && existingArticle.id !== id) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Article with slug "${data.slug}" already exists`
      );
    }
  }

  // Prepare update data
  const updateData: any = { id };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
  if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.author !== undefined) updateData.author = data.author;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.featured !== undefined) updateData.featured = data.featured;
  if (data.published_at !== undefined) updateData.published_at = data.published_at;

  // Update article
  const updatedArticle = await articleService.updateArticle(updateData);

  res.json({ article: updatedArticle });
};

/**
 * DELETE /admin/articles/:id
 * Delete an article
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
  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE);

  // Check if article exists
  try {
    await articleService.getArticleById(id);
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Article with id "${id}" not found`
    );
  }

  // Delete article
  await articleService.deleteArticle(id);

  res.status(200).json({ id, deleted: true });
};

/**
 * OPTIONS /admin/articles/:id
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
