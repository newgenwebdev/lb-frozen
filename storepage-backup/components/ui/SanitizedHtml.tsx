"use client"

import DOMPurify, { type Config } from "isomorphic-dompurify"

/**
 * Configuration for DOMPurify sanitization
 * This allows safe HTML elements while blocking dangerous ones
 */
const SANITIZE_CONFIG: Config = {
  // Allowed HTML tags (safe for content rendering)
  ALLOWED_TAGS: [
    // Text formatting
    "p", "br", "span", "strong", "b", "em", "i", "u", "s", "strike",
    "sub", "sup", "small", "mark", "del", "ins",
    // Headings
    "h1", "h2", "h3", "h4", "h5", "h6",
    // Lists
    "ul", "ol", "li",
    // Links (href will be validated)
    "a",
    // Images (src will be validated)
    "img",
    // Block elements
    "div", "section", "article", "aside", "header", "footer", "main", "nav",
    // Tables
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    // Quotes
    "blockquote", "q", "cite",
    // Code
    "pre", "code",
    // Other
    "hr", "figure", "figcaption", "picture", "source",
  ],
  // Allowed attributes (safe for styling and links)
  ALLOWED_ATTR: [
    // Global
    "class", "id", "style",
    // Links
    "href", "target", "rel",
    // Images
    "src", "alt", "width", "height", "loading",
    // Tables
    "colspan", "rowspan",
    // Data attributes (for styling hooks)
    "data-*",
  ],
  // Force all links to open safely
  ADD_ATTR: ["target"],
  // Ensure links have safe defaults
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
}

/**
 * Hook to customize link behavior for security
 */
if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    // Set external links to open in new tab with security attributes
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || ""
      // Check if it's an external link
      if (href.startsWith("http") && !href.includes(window.location.hostname)) {
        node.setAttribute("target", "_blank")
        node.setAttribute("rel", "noopener noreferrer")
      }
    }
    // Ensure images have alt text for accessibility
    if (node.tagName === "IMG" && !node.getAttribute("alt")) {
      node.setAttribute("alt", "")
    }
  })
}

type SanitizedHtmlProps = {
  /** The HTML content to sanitize and render */
  html: string
  /** Additional CSS classes to apply to the container */
  className?: string
  /** HTML tag to use for the container (default: div) */
  as?: keyof React.JSX.IntrinsicElements
}

/**
 * Safely renders HTML content with XSS protection.
 *
 * Uses DOMPurify to sanitize HTML before rendering, preventing:
 * - Script injection (<script> tags)
 * - Event handler injection (onclick, onerror, etc.)
 * - Iframe/object embedding
 * - Form injection
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SanitizedHtml html={article.content} />
 *
 * // With custom styling
 * <SanitizedHtml
 *   html={article.content}
 *   className="prose prose-lg"
 * />
 *
 * // As a different element
 * <SanitizedHtml
 *   html={article.content}
 *   as="article"
 * />
 * ```
 */
export function SanitizedHtml({
  html,
  className = "",
  as: Tag = "div",
}: SanitizedHtmlProps): React.JSX.Element {
  // Sanitize the HTML content
  const sanitizedHtml = DOMPurify.sanitize(html, SANITIZE_CONFIG) as string

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

/**
 * Sanitizes HTML string without rendering.
 * Useful when you need the sanitized string for other purposes.
 *
 * @example
 * ```ts
 * const cleanHtml = sanitizeHtml(untrustedInput)
 * ```
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG) as string
}
