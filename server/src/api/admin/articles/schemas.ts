import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

/**
 * Schema for creating a new article
 */
export const CreateArticleSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(255)
      .describe("Article title"),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only")
      .describe("URL-friendly slug (e.g. my-article-title)"),
    content: z
      .string()
      .min(1)
      .describe("Article content (HTML supported)"),
    excerpt: z
      .string()
      .max(500)
      .optional()
      .nullable()
      .describe("Short summary of the article"),
    thumbnail: z
      .string()
      .url()
      .optional()
      .nullable()
      .describe("Thumbnail image URL"),
    category: z
      .string()
      .max(100)
      .optional()
      .nullable()
      .describe("Article category"),
    tags: z
      .array(z.string())
      .optional()
      .default([])
      .describe("Array of tags"),
    author: z
      .string()
      .max(255)
      .optional()
      .nullable()
      .describe("Author name"),
    status: z
      .enum(["draft", "published"])
      .optional()
      .default("draft")
      .describe("Publication status"),
    featured: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether the article is featured"),
    published_at: z
      .union([z.string().datetime(), z.coerce.date()])
      .optional()
      .nullable()
      .describe("Publication date (ISO 8601 format)"),
  })
  .openapi("CreateArticleRequest", {
    example: {
      title: "My First Article",
      slug: "my-first-article",
      content: "<p>This is the article content...</p>",
      excerpt: "A brief summary of the article",
      thumbnail: "https://example.com/image.jpg",
      category: "News",
      tags: ["technology", "updates"],
      author: "John Doe",
      status: "draft",
      featured: false,
      published_at: "2025-01-15T00:00:00Z",
    },
  });

/**
 * Schema for updating an article
 */
export const UpdateArticleSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe("Article title"),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens only")
      .optional()
      .describe("URL-friendly slug"),
    content: z
      .string()
      .min(1)
      .optional()
      .describe("Article content"),
    excerpt: z
      .string()
      .max(500)
      .optional()
      .nullable()
      .describe("Short summary"),
    thumbnail: z
      .string()
      .url()
      .optional()
      .nullable()
      .describe("Thumbnail image URL"),
    category: z
      .string()
      .max(100)
      .optional()
      .nullable()
      .describe("Article category"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Array of tags"),
    author: z
      .string()
      .max(255)
      .optional()
      .nullable()
      .describe("Author name"),
    status: z
      .enum(["draft", "published"])
      .optional()
      .describe("Publication status"),
    featured: z
      .boolean()
      .optional()
      .describe("Whether the article is featured"),
    published_at: z
      .union([z.string().datetime(), z.coerce.date()])
      .optional()
      .nullable()
      .describe("Publication date"),
  })
  .openapi("UpdateArticleRequest", {
    example: {
      title: "Updated Article Title",
      status: "published",
    },
  });

/**
 * Query schema for list endpoint
 */
export const ListArticleQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z
    .enum(["draft", "published", "all"])
    .optional()
    .default("all")
    .describe("Filter by article status"),
  category: z
    .string()
    .optional()
    .describe("Filter by category"),
  featured: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true" ? true : val === "false" ? false : undefined)
    .describe("Filter by featured status"),
});

// Infer types from schemas
export type CreateArticleRequest = z.infer<typeof CreateArticleSchema>;
export type UpdateArticleRequest = z.infer<typeof UpdateArticleSchema>;
export type ListArticleQuery = z.infer<typeof ListArticleQuerySchema>;
