import { MedusaService } from "@medusajs/framework/utils"
import Article from "../models/article"

type CreateArticleInput = {
  title: string
  slug: string
  content: string
  excerpt?: string | null
  thumbnail?: string | null
  category?: string | null
  tags?: string[]
  author?: string | null
  status?: "draft" | "published"
  featured?: boolean
  published_at?: Date | string | null
}

type UpdateArticleInput = {
  id: string
  title?: string
  slug?: string
  content?: string
  excerpt?: string | null
  thumbnail?: string | null
  category?: string | null
  tags?: string[]
  author?: string | null
  status?: "draft" | "published"
  featured?: boolean
  published_at?: Date | string | null
}

/**
 * ArticleModuleService
 * Handles article CRUD operations
 */
class ArticleModuleService extends MedusaService({
  Article,
}) {
  /**
   * Create a new article
   */
  async createArticle(data: CreateArticleInput): Promise<any> {
    const article = await this.createArticles({
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt || null,
      thumbnail: data.thumbnail || null,
      category: data.category || null,
      tags: { items: data.tags || [] },
      author: data.author || null,
      status: data.status || "draft",
      featured: data.featured || false,
      published_at: data.published_at
        ? typeof data.published_at === "string"
          ? new Date(data.published_at)
          : data.published_at
        : null,
    })

    return article
  }

  /**
   * Update an article
   */
  async updateArticle(data: UpdateArticleInput): Promise<any> {
    const updateData: Record<string, unknown> = { id: data.id }

    if (data.title !== undefined) updateData.title = data.title
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.content !== undefined) updateData.content = data.content
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail
    if (data.category !== undefined) updateData.category = data.category
    if (data.tags !== undefined) updateData.tags = { items: data.tags }
    if (data.author !== undefined) updateData.author = data.author
    if (data.status !== undefined) updateData.status = data.status
    if (data.featured !== undefined) updateData.featured = data.featured
    if (data.published_at !== undefined) {
      updateData.published_at = data.published_at
        ? typeof data.published_at === "string"
          ? new Date(data.published_at)
          : data.published_at
        : null
    }

    const article = await this.updateArticles(updateData)

    return article
  }

  /**
   * Get article by ID
   */
  async getArticleById(id: string): Promise<any> {
    const article = await this.retrieveArticle(id)
    return article
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string): Promise<any> {
    const articles = await this.listArticles({ slug })
    return articles[0] || null
  }

  /**
   * List all articles with pagination and filtering
   */
  async listAllArticles(filters?: {
    limit?: number
    offset?: number
    status?: "draft" | "published" | "all"
    category?: string
    featured?: boolean
    order?: Record<string, "ASC" | "DESC">
  }) {
    const whereClause: Record<string, unknown> = {}

    // Filter by status
    if (filters?.status && filters.status !== "all") {
      whereClause.status = filters.status
    }

    // Filter by category
    if (filters?.category) {
      whereClause.category = filters.category
    }

    // Filter by featured
    if (filters?.featured !== undefined) {
      whereClause.featured = filters.featured
    }

    const articles = await this.listArticles(whereClause, {
      order: filters?.order || { created_at: "DESC" },
    })

    // Apply pagination
    const totalCount = articles.length
    const paginatedArticles = articles.slice(
      filters?.offset || 0,
      (filters?.offset || 0) + (filters?.limit || 50)
    )

    return [paginatedArticles, totalCount] as const
  }

  /**
   * Delete an article
   */
  async deleteArticle(id: string): Promise<void> {
    await this.deleteArticles(id)
  }
}

export default ArticleModuleService
