/**
 * Category API Service
 * Handles product category operations
 */

import { apiClient } from './client';
import type { ProductCategory } from './types';

/**
 * Get all categories
 */
export async function getCategories(params?: {
  parent_category_id?: string;
  include_descendants_tree?: boolean;
}): Promise<{ product_categories: ProductCategory[] }> {
  const queryParams = new URLSearchParams();
  
  if (params?.parent_category_id) {
    queryParams.append('parent_category_id', params.parent_category_id);
  }
  if (params?.include_descendants_tree) {
    queryParams.append('include_descendants_tree', 'true');
  }

  const queryString = queryParams.toString();
  const endpoint = `/store/product-categories${queryString ? `?${queryString}` : ''}`;

  return apiClient.get(endpoint);
}

/**
 * Get category by ID
 */
export async function getCategory(
  categoryId: string
): Promise<{ product_category: ProductCategory }> {
  return apiClient.get(`/store/product-categories/${categoryId}`);
}

/**
 * Get category by handle
 */
export async function getCategoryByHandle(
  handle: string
): Promise<{ product_category: ProductCategory }> {
  const response = await getCategories();
  const category = response.product_categories.find(
    (cat) => cat.handle === handle
  );

  if (!category) {
    throw new Error(`Category with handle "${handle}" not found`);
  }

  return { product_category: category };
}
