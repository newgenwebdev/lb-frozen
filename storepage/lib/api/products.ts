/**
 * Product API Service
 * Handles all product-related API calls
 */

import { apiClient } from './client';
import type { Product, PaginatedResponse } from './types';

export interface ProductFilters {
  q?: string;
  category_id?: string | string[];
  tag_id?: string | string[];
  limit?: number;
  offset?: number;
  order?: string;
  // Advanced filters
  min_rating?: number;
  delivery_speed?: 'today' | 'tomorrow' | 'few_days' | 'anytime';
  flash_sale?: boolean;
  trending?: boolean;
  on_brand?: boolean;
}

export interface SearchResponse extends PaginatedResponse<Product> {
  rating_counts?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/**
 * Get default region ID for price calculation
 */
async function getDefaultRegionId(): Promise<string> {
  const defaultRegion = process.env.NEXT_PUBLIC_DEFAULT_REGION || 'sg';
  
  try {
    const response = await apiClient.get<{ regions: any[] }>('/store/regions');
    const region = response.regions.find((r: any) => r.name.toLowerCase() === defaultRegion.toLowerCase());
    return region?.id || response.regions[0]?.id;
  } catch (error) {
    console.error('Failed to fetch regions:', error);
    throw error;
  }
}

/**
 * Fetch all products with optional filters (uses advanced search endpoint)
 */
export async function getProducts(
  filters?: ProductFilters
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  
  // Add region_id for price calculation
  const regionId = await getDefaultRegionId();
  params.append('region_id', regionId);
  
  if (filters) {
    if (filters.q) params.append('q', filters.q);
    if (filters.category_id) {
      const categories = Array.isArray(filters.category_id)
        ? filters.category_id
        : [filters.category_id];
      // For search endpoint, use single category_id
      params.append('category_id', categories[0]);
    }
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    if (filters.order) params.append('order', filters.order);
    
    // Advanced filters
    if (filters.min_rating) params.append('min_rating', filters.min_rating.toString());
    if (filters.delivery_speed) params.append('delivery_speed', filters.delivery_speed);
    if (filters.flash_sale) params.append('flash_sale', 'true');
    if (filters.trending) params.append('trending', 'true');
    if (filters.on_brand) params.append('on_brand', 'true');
  }

  const queryString = params.toString();
  // Use the new search endpoint for advanced filtering
  const endpoint = `/store/products/search${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<{
    products: Product[];
    count: number;
    offset: number;
    limit: number;
    rating_counts?: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  }>(endpoint);

  // Map the response to match SearchResponse interface
  return {
    data: response.products,
    count: response.count,
    offset: response.offset,
    limit: response.limit,
    rating_counts: response.rating_counts,
  };
}

/**
 * Fetch a single product by ID (with inventory quantities)
 */
export async function getProduct(productId: string): Promise<{ product: Product }> {
  const regionId = await getDefaultRegionId();
  // Use custom endpoint that includes inventory quantities
  return apiClient.get(`/store/products/${productId}/with-inventory?region_id=${regionId}`);
}

/**
 * Search products
 */
export async function searchProducts(
  query: string,
  limit = 20
): Promise<PaginatedResponse<Product>> {
  return getProducts({ q: query, limit });
}

/**
 * Get products by category
 */
export async function getProductsByCategory(
  categoryId: string,
  limit = 20
): Promise<PaginatedResponse<Product>> {
  return getProducts({ category_id: categoryId, limit });
}

/**
 * Get featured/trending products
 */
export async function getFeaturedProducts(
  limit = 12
): Promise<PaginatedResponse<Product>> {
  // You can add a specific tag or metadata filter for featured products
  return getProducts({ limit, order: 'created_at' });
}
