import { defineMiddlewares } from "@medusajs/framework/http"
import { rateLimitAuth, rateLimitRegistration } from "./middlewares/rate-limit"
import { securityHeaders } from "./middlewares/security-headers"

/**
 * Global middleware configuration for Medusa API
 *
 * Applies:
 * - Security headers to all API responses
 * - Rate limiting to authentication endpoints to prevent:
 *   - Brute force password attacks
 *   - Account enumeration
 *   - Registration spam
 */
export default defineMiddlewares({
  routes: [
    // ===== GLOBAL SECURITY HEADERS =====
    // Apply security headers to all API endpoints
    {
      matcher: "/admin/*",
      middlewares: [securityHeaders],
    },
    {
      matcher: "/store/*",
      middlewares: [securityHeaders],
    },
    {
      matcher: "/auth/*",
      middlewares: [securityHeaders],
    },

    // ===== ADMIN AUTH ENDPOINTS =====
    // Rate limit admin login attempts
    {
      matcher: "/auth/user/emailpass",
      method: "POST",
      middlewares: [rateLimitAuth],
    },
    // Rate limit admin registration (if enabled)
    {
      matcher: "/admin/users",
      method: "POST",
      middlewares: [rateLimitRegistration],
    },

    // ===== STORE AUTH ENDPOINTS =====
    // Rate limit customer login attempts
    {
      matcher: "/auth/customer/emailpass",
      method: "POST",
      middlewares: [rateLimitAuth],
    },
    // Rate limit customer registration
    {
      matcher: "/store/customers",
      method: "POST",
      middlewares: [rateLimitRegistration],
    },

    // ===== PASSWORD RESET ENDPOINTS =====
    // Rate limit password reset requests (prevent email spam)
    {
      matcher: "/auth/user/emailpass/reset-password",
      method: "POST",
      middlewares: [rateLimitAuth],
    },
    {
      matcher: "/auth/customer/emailpass/reset-password",
      method: "POST",
      middlewares: [rateLimitAuth],
    },
  ],
})
