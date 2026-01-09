import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { ARTICLE_MODULE } from "../../../modules/article";
import type ArticleModuleService from "../../../modules/article/services/article";
import { CreateArticleSchema, ListArticleQuerySchema } from "./schemas";

/**
 * GET /admin/articles
 * List all articles with pagination and filtering
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

  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE);

  // Validate query params
  const queryResult = ListArticleQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, queryResult.error.message);
  }

  const query = queryResult.data;

  const [articles, count] = await articleService.listAllArticles({
    limit: query.limit,
    offset: query.offset,
    status: query.status as "draft" | "published" | "all",
    category: query.category,
    featured: query.featured,
  });

  res.json({
    articles,
    count,
    limit: query.limit,
    offset: query.offset,
  });
};

/**
 * POST /admin/articles
 * Create a new article
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

  const articleService = req.scope.resolve<ArticleModuleService>(ARTICLE_MODULE);

  // Validate request body
  const result = CreateArticleSchema.safeParse(req.body);
  if (!result.success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, result.error.message);
  }

  const data = result.data;

  // Check if slug already exists
  const existingArticle = await articleService.getArticleBySlug(data.slug);
  if (existingArticle) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Article with slug "${data.slug}" already exists`
    );
  }

  // Create article
  const article = await articleService.createArticle({
    title: data.title,
    slug: data.slug,
    content: data.content,
    excerpt: data.excerpt,
    thumbnail: data.thumbnail,
    category: data.category,
    tags: data.tags,
    author: data.author,
    status: data.status,
    featured: data.featured,
    published_at: data.published_at,
  });

  res.status(201).json({ article });
};

/**
 * OPTIONS /admin/articles
 * Handle CORS preflight request
 */
export const OPTIONS = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  res.status(204).send();
};
