export type ArticleStatus = "draft" | "published";

// API Response Types
export type ArticleAPI = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  thumbnail: string | null;
  category: string | null;
  tags: string[];
  author: string | null;
  status: ArticleStatus;
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ArticleAPIListResponse = {
  articles: ArticleAPI[];
  count: number;
  limit: number;
  offset: number;
};

export type ArticleAPISingleResponse = {
  article: ArticleAPI;
};

// UI Types
export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  status: ArticleStatus;
  featured: boolean;
  author: string;
  publishedAt: string;
  createdAt: string;
  thumbnail: string;
};

export type ArticleListResponse = {
  articles: Article[];
  count: number;
  page: number;
  limit: number;
};

// Form Data
export type ArticleFormData = {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  author?: string;
  status: ArticleStatus;
  featured: boolean;
  published_at?: string;
};

// API Query Parameters
export type ArticleListParams = {
  limit?: number;
  offset?: number;
  status?: "draft" | "published" | "all";
  category?: string;
  featured?: boolean;
};
