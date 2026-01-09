/**
 * Article API Functions
 *
 * API layer for article operations
 */

import { api } from "./client";
import type {
  ArticleAPIListResponse,
  ArticleAPISingleResponse,
  ArticleListParams,
  ArticleAPI,
  ArticleFormData,
} from "../types/article";

/**
 * Fetch all articles with pagination and filtering
 * @param params - Query parameters (limit, offset, status, category, featured)
 * @returns Article list response
 */
export async function getArticles(
  params: ArticleListParams = {}
): Promise<ArticleAPIListResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit !== undefined) {
    queryParams.append("limit", params.limit.toString());
  }
  if (params.offset !== undefined) {
    queryParams.append("offset", params.offset.toString());
  }
  if (params.status && params.status !== "all") {
    queryParams.append("status", params.status);
  }
  if (params.category) {
    queryParams.append("category", params.category);
  }
  if (params.featured !== undefined) {
    queryParams.append("featured", params.featured.toString());
  }

  const queryString = queryParams.toString();
  const url = `/admin/articles${queryString ? `?${queryString}` : ""}`;

  const response = await api.get<ArticleAPIListResponse>(url);
  return response.data;
}

/**
 * Get a single article by ID
 * @param id - Article ID
 * @returns Article or null if not found
 */
export async function getArticleById(id: string): Promise<ArticleAPI | null> {
  try {
    const response = await api.get<ArticleAPISingleResponse>(
      `/admin/articles/${id}`
    );
    return response.data.article;
  } catch (error) {
    console.error("Failed to fetch article:", error);
    return null;
  }
}

/**
 * Create a new article
 * @param data - Article form data
 * @returns Created article
 */
export async function createArticle(data: ArticleFormData): Promise<ArticleAPI> {
  const response = await api.post<ArticleAPISingleResponse>("/admin/articles", {
    title: data.title,
    slug: data.slug,
    content: data.content,
    excerpt: data.excerpt || null,
    thumbnail: data.thumbnail || null,
    category: data.category || null,
    tags: data.tags || [],
    author: data.author || null,
    status: data.status,
    featured: data.featured,
    published_at: data.published_at || null,
  });
  return response.data.article;
}

/**
 * Update an existing article
 * @param id - Article ID
 * @param data - Partial article form data (only fields to update)
 * @returns Updated article
 */
export async function updateArticle(
  id: string,
  data: Partial<ArticleFormData>
): Promise<ArticleAPI> {
  const payload: Record<string, unknown> = {};

  if (data.title !== undefined) payload.title = data.title;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.content !== undefined) payload.content = data.content;
  if (data.excerpt !== undefined) payload.excerpt = data.excerpt || null;
  if (data.thumbnail !== undefined) payload.thumbnail = data.thumbnail || null;
  if (data.category !== undefined) payload.category = data.category || null;
  if (data.tags !== undefined) payload.tags = data.tags;
  if (data.author !== undefined) payload.author = data.author || null;
  if (data.status !== undefined) payload.status = data.status;
  if (data.featured !== undefined) payload.featured = data.featured;
  if (data.published_at !== undefined)
    payload.published_at = data.published_at || null;

  const response = await api.put<ArticleAPISingleResponse>(
    `/admin/articles/${id}`,
    payload
  );
  return response.data.article;
}

/**
 * Delete an article
 * @param id - Article ID
 * @returns void
 */
export async function deleteArticle(id: string): Promise<void> {
  await api.delete(`/admin/articles/${id}`);
}
