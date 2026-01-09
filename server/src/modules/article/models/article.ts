import { model } from "@medusajs/framework/utils"

/**
 * Article Model
 * Represents a news-style article with rich content support
 */
const Article = model.define("article", {
  id: model.id().primaryKey(),
  title: model.text(),
  slug: model.text().unique(),
  content: model.text(), // Rich text/HTML content
  excerpt: model.text().nullable(), // Short summary
  thumbnail: model.text().nullable(), // Image URL
  category: model.text().nullable(), // Article category
  tags: model.json().default({ items: [] }), // Array of tags stored as { items: string[] }
  author: model.text().nullable(), // Author name
  status: model.enum(["draft", "published"]).default("draft"),
  featured: model.boolean().default(false),
  published_at: model.dateTime().nullable(),
})

export default Article
