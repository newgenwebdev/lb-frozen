import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"

/**
 * Security headers middleware
 *
 * Adds important security headers to all API responses:
 * - X-Content-Type-Options: Prevents MIME type sniffing
 * - X-Frame-Options: Prevents clickjacking
 * - X-XSS-Protection: Legacy XSS protection for older browsers
 * - Referrer-Policy: Controls referrer information
 * - Strict-Transport-Security: Enforces HTTPS (only in production)
 * - Cache-Control: Prevents caching of sensitive data
 * - Content-Security-Policy: Restricts resource loading
 */
export function securityHeaders(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff")

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY")

  // Legacy XSS protection for older browsers
  res.setHeader("X-XSS-Protection", "1; mode=block")

  // Control referrer information
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")

  // Prevent caching of API responses that may contain sensitive data
  // Individual endpoints can override this if caching is needed
  if (req.path.includes("/admin/") || req.path.includes("/auth/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    res.setHeader("Pragma", "no-cache")
    res.setHeader("Expires", "0")
  }

  // Strict Transport Security (only in production with HTTPS)
  if (process.env.NODE_ENV === "production") {
    // 1 year, include subdomains
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }

  // Content Security Policy for API responses
  // This is a strict policy for API endpoints
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'"
  )

  // Permissions Policy - disable unnecessary browser features
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
  )

  next()
}
