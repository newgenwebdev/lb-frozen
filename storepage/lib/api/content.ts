/**
 * Content API Service
 * Handles blog articles, banners, and other content
 */

import { apiClient } from './client';

export interface Article {
  id: string;
  title: string;
  handle: string;
  content: string;
  excerpt?: string;
  author?: string;
  thumbnail?: string;
  published_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url?: string;
  description?: string;
  position: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  metadata?: Record<string, any>;
}

/**
 * Get all articles
 */
export async function getArticles(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ articles: Article[]; count: number }> {
  const queryParams = new URLSearchParams();
  
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = `/store/articles${queryString ? `?${queryString}` : ''}`;

  return apiClient.get(endpoint);
}

/**
 * Get article by ID or handle
 */
export async function getArticle(
  idOrHandle: string
): Promise<{ article: Article }> {
  return apiClient.get(`/store/articles/${idOrHandle}`);
}

/**
 * Get active banners
 */
export async function getBanners(): Promise<{ banners: Banner[] }> {
  return apiClient.get('/store/banners');
}

/**
 * Get banner by position
 */
export async function getBannersByPosition(
  position: 'hero' | 'sidebar' | 'footer' | string
): Promise<{ banners: Banner[] }> {
  const response = await getBanners();
  return {
    banners: response.banners.filter(
      (b) => b.metadata?.position === position || b.position.toString() === position
    ),
  };
}
