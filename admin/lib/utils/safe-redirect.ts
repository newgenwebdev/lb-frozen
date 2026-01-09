/**
 * Safe redirect URL validation utility
 *
 * Prevents open redirect vulnerabilities by validating that
 * redirect URLs are safe (relative paths or same-origin only).
 */

/**
 * Validates and sanitizes a redirect URL to prevent open redirect attacks.
 *
 * Only allows:
 * - Relative paths starting with "/" (e.g., "/admin/overview", "/admin/orders")
 * - Same-origin URLs (same protocol + host)
 *
 * Blocks:
 * - External URLs (https://evil.com)
 * - Protocol-relative URLs (//evil.com)
 * - javascript: URLs
 * - data: URLs
 * - Any other potentially dangerous schemes
 *
 * @param url - The URL to validate (from query params, etc.)
 * @param fallback - The fallback URL if validation fails (default: "/")
 * @returns A safe URL to redirect to
 *
 * @example
 * ```ts
 * // In a login page:
 * const from = searchParams.get('from')
 * const safeRedirect = getSafeRedirectUrl(from, '/admin/overview')
 * router.push(safeRedirect)
 * ```
 */
export function getSafeRedirectUrl(
  url: string | null | undefined,
  fallback: string = "/"
): string {
  // If no URL provided, use fallback
  if (!url) {
    return fallback
  }

  // Trim whitespace
  const trimmedUrl = url.trim()

  // Block empty strings
  if (!trimmedUrl) {
    return fallback
  }

  // Block dangerous URL schemes
  const lowerUrl = trimmedUrl.toLowerCase()
  const dangerousSchemes = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "blob:",
  ]

  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return fallback
    }
  }

  // Block protocol-relative URLs (//evil.com)
  if (trimmedUrl.startsWith("//")) {
    return fallback
  }

  // Allow relative paths starting with /
  // But not // (protocol-relative) which we already blocked above
  if (trimmedUrl.startsWith("/") && !trimmedUrl.startsWith("//")) {
    // Additional check: block /\ which could be interpreted as absolute on Windows
    if (trimmedUrl.startsWith("/\\")) {
      return fallback
    }
    return trimmedUrl
  }

  // For absolute URLs, check if same origin
  try {
    const redirectUrl = new URL(trimmedUrl, window.location.origin)
    const currentUrl = new URL(window.location.href)

    // Only allow same origin
    if (redirectUrl.origin === currentUrl.origin) {
      // Return just the pathname + search + hash (relative form)
      return redirectUrl.pathname + redirectUrl.search + redirectUrl.hash
    }
  } catch {
    // Invalid URL, use fallback
    return fallback
  }

  // Default: use fallback for any other case
  return fallback
}

/**
 * Checks if a URL is safe for redirection without modifying it.
 *
 * @param url - The URL to check
 * @returns true if the URL is safe, false otherwise
 */
export function isRedirectUrlSafe(url: string | null | undefined): boolean {
  if (!url) return false

  const safeUrl = getSafeRedirectUrl(url, "__FALLBACK__")
  return safeUrl !== "__FALLBACK__"
}
