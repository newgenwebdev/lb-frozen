import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Type for the auth context available on authenticated requests
 */
type AuthContext = {
  actor_id: string
  actor_type: string
  auth_identity_id: string
  app_metadata: Record<string, unknown>
}

/**
 * Extended request type with auth context
 */
export type AuthenticatedMedusaRequest<T = unknown> = MedusaRequest<T> & {
  auth_context: AuthContext
}

/**
 * Handler function type for admin routes
 */
type AdminRouteHandler<T = unknown> = (
  req: AuthenticatedMedusaRequest<T>,
  res: MedusaResponse
) => Promise<void> | void

/**
 * Wrapper function that adds admin authentication to route handlers.
 *
 * This uses a custom auth check pattern instead of Medusa's authenticate() middleware
 * to avoid CORS preflight issues. The authenticate() middleware blocks OPTIONS requests
 * which don't include credentials, breaking cross-origin requests from the admin dashboard.
 *
 * With this pattern:
 * 1. OPTIONS requests pass through (handled by Medusa's CORS config)
 * 2. Actual requests (GET, POST, etc.) check auth_context set by Medusa's session handling
 *
 * @example
 * ```typescript
 * import { withAdminAuth } from "utils/admin-auth"
 *
 * export const GET = withAdminAuth(async (req, res) => {
 *   // req.auth_context is guaranteed to exist here
 *   const adminId = req.auth_context.actor_id
 *   res.json({ data: "protected" })
 * })
 * ```
 */
export function withAdminAuth<T = unknown>(
  handler: AdminRouteHandler<T>
): (req: MedusaRequest<T>, res: MedusaResponse) => Promise<void> {
  return async (req: MedusaRequest<T>, res: MedusaResponse): Promise<void> => {
    const authContext = (req as AuthenticatedMedusaRequest<T>).auth_context

    if (!authContext?.actor_id) {
      res.status(401).json({ message: "Unauthorized" })
      return
    }

    // Cast req to authenticated type since we've verified auth_context exists
    await handler(req as AuthenticatedMedusaRequest<T>, res)
  }
}

/**
 * Helper function to check admin auth without wrapping.
 * Returns true if authenticated, false otherwise.
 * Useful when you need more control over the response.
 *
 * @example
 * ```typescript
 * import { checkAdminAuth } from "utils/admin-auth"
 *
 * export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
 *   if (!checkAdminAuth(req)) {
 *     return res.status(401).json({ message: "Unauthorized", code: "ADMIN_AUTH_REQUIRED" })
 *   }
 *   // ... rest of handler
 * }
 * ```
 */
export function checkAdminAuth(req: MedusaRequest): req is AuthenticatedMedusaRequest {
  const authContext = (req as AuthenticatedMedusaRequest).auth_context
  return Boolean(authContext?.actor_id)
}

/**
 * Get the admin actor ID from an authenticated request.
 * Returns undefined if not authenticated.
 *
 * @example
 * ```typescript
 * const adminId = getAdminActorId(req)
 * if (!adminId) {
 *   return res.status(401).json({ message: "Unauthorized" })
 * }
 * ```
 */
export function getAdminActorId(req: MedusaRequest): string | undefined {
  const authContext = (req as AuthenticatedMedusaRequest).auth_context
  return authContext?.actor_id
}
