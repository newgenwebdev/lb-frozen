// Journal/Article API types and functions

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY;

/**
 * Article type from the backend
 */
export type Article = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  thumbnail: string | null;
  category: string | null;
  tags: string[] | { items: string[] };
  author: string | null;
  status: "draft" | "published";
  featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Helper to get tags as array (handles both array and {items:[]} formats)
 */
export function getTagsArray(tags: string[] | { items: string[] } | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "object" && "items" in tags) return tags.items || [];
  return [];
}

/**
 * Article list response from the backend
 */
export type ArticleListResponse = {
  articles: Article[];
  count: number;
  limit: number;
  offset: number;
};

/**
 * Article filter parameters
 */
export type ArticleFilters = {
  limit?: number;
  offset?: number;
  category?: string;
  featured?: boolean;
};

/**
 * Fetch all published articles from store endpoint
 * For use in Server Components
 */
export async function getArticles(
  filters?: ArticleFilters
): Promise<{ articles: Article[]; count: number }> {
  try {
    const params = new URLSearchParams();

    if (filters?.limit) {
      params.set("limit", filters.limit.toString());
    }
    if (filters?.offset) {
      params.set("offset", filters.offset.toString());
    }
    if (filters?.category) {
      params.set("category", filters.category);
    }
    if (filters?.featured !== undefined) {
      params.set("featured", filters.featured.toString());
    }

    const url = `${BACKEND_URL}/store/articles${params.toString() ? `?${params}` : ""}`;
    console.log("[getArticles] Fetching from:", url);

    const response = await fetch(url, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    console.log("[getArticles] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[getArticles] Error response:", errorText);
      return { articles: [], count: 0 };
    }

    const data = (await response.json()) as ArticleListResponse;
    console.log("[getArticles] Received articles:", data.articles?.length || 0, "count:", data.count);
    return { articles: data.articles, count: data.count };
  } catch (error) {
    console.error("[getArticles] Fetch error:", error);
    return { articles: [], count: 0 };
  }
}

/**
 * Fetch a single article by slug from store endpoint
 * For use in Server Components
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/store/articles/${slug}`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.article as Article;
  } catch {
    return null;
  }
}

/**
 * Fetch featured articles
 * For use in Server Components
 */
export async function getFeaturedArticles(
  limit: number = 3
): Promise<Article[]> {
  const { articles } = await getArticles({ featured: true, limit });
  return articles;
}

/**
 * Fetch articles by category
 * For use in Server Components
 */
export async function getArticlesByCategory(
  category: string,
  limit?: number
): Promise<Article[]> {
  const { articles } = await getArticles({ category, limit });
  return articles;
}

/**
 * Client-side version of getArticles
 * For use in Client Components
 */
export async function getArticlesClient(
  filters?: ArticleFilters
): Promise<{ articles: Article[]; count: number }> {
  try {
    const params = new URLSearchParams();

    if (filters?.limit) {
      params.set("limit", filters.limit.toString());
    }
    if (filters?.offset) {
      params.set("offset", filters.offset.toString());
    }
    if (filters?.category) {
      params.set("category", filters.category);
    }
    if (filters?.featured !== undefined) {
      params.set("featured", filters.featured.toString());
    }

    const url = `${BACKEND_URL}/store/articles${params.toString() ? `?${params}` : ""}`;

    const response = await fetch(url, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY || "",
      },
    });

    if (!response.ok) {
      return { articles: [], count: 0 };
    }

    const data = (await response.json()) as ArticleListResponse;
    return { articles: data.articles, count: data.count };
  } catch {
    return { articles: [], count: 0 };
  }
}

/**
 * Format published date for display
 */
export function formatPublishedDate(dateString: string | null): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
