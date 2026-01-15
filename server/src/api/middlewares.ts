import { defineMiddlewares } from "@medusajs/framework/http"
import express from "express"
import { rateLimitAuth, rateLimitRegistration } from "./middlewares/rate-limit"
import { securityHeaders } from "./middlewares/security-headers"

// Custom body parser with larger limit for uploads
const largeBodyParser = express.json({ limit: "50mb" })

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
    // ===== FILE UPLOAD ENDPOINTS =====
    // Increase body size limit for file uploads (50MB)
    // Must be defined BEFORE security headers to override default body parser
    {
      matcher: "/store/uploads",
      method: ["POST"],
      bodyParser: { sizeLimit: 1024 * 1024 * 50 }, // 50MB
    },
    {
      matcher: "/admin/uploads",
      method: ["POST"],
      bodyParser: { sizeLimit: 1024 * 1024 * 50 }, // 50MB
    },

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
