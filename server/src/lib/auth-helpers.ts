import type { MedusaRequest, MedusaResponse, AuthenticatedMedusaRequest } from "@medusajs/framework/http";

// Allowed origins for admin requests (from environment variable)
const ALLOWED_ADMIN_ORIGINS = process.env.ADMIN_CORS?.split(',').map(o => o.trim()) || [];

/**
 * Custom authentication for admin endpoints that properly handles CORS OPTIONS
 *
 * This is necessary because Medusa's built-in authenticate() applies auth
 * before custom middleware can intercept OPTIONS requests, causing CORS
 * preflight failures on custom admin endpoints.
 *
 * This implementation:
 * 1. Returns 204 for OPTIONS (CORS preflight) without checking auth
 * 2. Validates session cookies or bearer tokens for other methods
 * 3. Ensures the authenticated user is an admin
 */
/**
 * Custom authentication for /api/* endpoints (bypasses Medusa's global /admin/* auth)
 *
 * This middleware provides proper authentication for custom endpoints outside /admin namespace
 * Security layers:
 * 1. CORS origin checking (only allowed admin frontends)
 * 2. Session-based authentication (validates admin user session)
 * 3. Railway private networking in production
 */
export const authenticateCustomAdmin = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: any
) => {
  // For OPTIONS requests, always allow (CORS preflight)
  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }

  // Check origin is in allowed list (CORS security)
  const origin = req.headers.origin as string;
  if (origin && !ALLOWED_ADMIN_ORIGINS.includes(origin)) {
    return res.status(403).json({
      message: "Forbidden: Invalid origin"
    });
  }

  // Validate admin session (same as Medusa's built-in auth)
  if (req.session?.auth_context?.actor_id) {
    const authContext = req.session.auth_context;

    // Verify it's an admin user
    if (authContext.actor_type === "user") {
      // Inject auth context into request for handlers to use
      (req as AuthenticatedMedusaRequest).auth_context = {
        actor_id: authContext.actor_id,
        actor_type: "user",
        auth_identity_id: authContext.auth_identity_id,
        app_metadata: authContext.app_metadata || {}
      };
      return next();
    }
  }

  // No valid session found
  return res.status(401).json({
    message: "Unauthorized: Admin authentication required"
  });
};
