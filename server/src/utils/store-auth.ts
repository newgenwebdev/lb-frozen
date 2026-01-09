import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

/**
 * JWT payload structure for customer tokens
 */
type CustomerTokenPayload = {
  actor_type: string
  actor_id: string
  auth_identity_id?: string
  app_metadata?: Record<string, unknown>
  iat?: number
  exp?: number
}

/**
 * Type for the auth context available on authenticated requests
 */
type StoreAuthContext = {
  actor_id: string
  actor_type: "customer"
  auth_identity_id?: string
}

/**
 * Extended request type with store auth context
 */
export type AuthenticatedStoreRequest<T = unknown> = MedusaRequest<T> & {
  store_auth: StoreAuthContext
}

/**
 * Handler function type for authenticated store routes
 */
type StoreRouteHandler<T = unknown> = (
  req: AuthenticatedStoreRequest<T>,
  res: MedusaResponse
) => Promise<void> | void

/**
 * Securely extracts and verifies customer ID from JWT token.
 *
 * This function properly validates the JWT signature using the JWT_SECRET,
 * unlike the previous implementation which only decoded without verification.
 *
 * Security features:
 * 1. Verifies JWT signature (prevents token forgery)
 * 2. Checks token expiration automatically
 * 3. Validates actor_type is "customer"
 * 4. Falls back to Medusa's auth context if already populated
 *
 * @param req - The Medusa request object
 * @returns The customer ID if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
 *   const customerId = getVerifiedCustomerId(req)
 *   if (!customerId) {
 *     return res.status(401).json({ message: "Unauthorized" })
 *   }
 *   // customerId is verified and safe to use
 * }
 * ```
 */
export function getVerifiedCustomerId(req: MedusaRequest): string | null {
  // First check if Medusa's auth middleware already populated the context
  // This is secure because it's set by Medusa's internal authentication
  const authContext = (req as any).auth
  if (authContext?.actor_id && authContext?.actor_type === "customer") {
    return authContext.actor_id
  }

  // Fallback: manually verify JWT from Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const secret = process.env.JWT_SECRET

    if (!secret) {
      console.error("[STORE-AUTH] JWT_SECRET environment variable is not configured")
      return null
    }

    // SECURE: Verify signature + check expiration
    // jwt.verify() will throw if:
    // - Signature doesn't match (token was forged)
    // - Token is expired (exp claim in the past)
    // - Token is malformed
    const payload = jwt.verify(token, secret) as CustomerTokenPayload

    // Validate this is a customer token
    if (payload.actor_type !== "customer" || !payload.actor_id) {
      return null
    }

    return payload.actor_id
  } catch (error) {
    // Log the error type for debugging (but not the token itself)
    if (error instanceof jwt.TokenExpiredError) {
      // Token expired - this is normal, don't log as error
      return null
    }
    if (error instanceof jwt.JsonWebTokenError) {
      // Invalid token (forged, malformed, wrong signature)
      // Could log for security monitoring but don't expose details
      return null
    }
    // Unexpected error
    console.error("[STORE-AUTH] Unexpected error verifying token:", error)
    return null
  }
}

/**
 * Wrapper function that adds customer authentication to store route handlers.
 *
 * Similar to withAdminAuth but for store/customer endpoints.
 * Verifies JWT signature and populates req.store_auth with customer info.
 *
 * @example
 * ```typescript
 * import { withStoreAuth } from "utils/store-auth"
 *
 * export const GET = withStoreAuth(async (req, res) => {
 *   // req.store_auth.actor_id is guaranteed to be a verified customer ID
 *   const customerId = req.store_auth.actor_id
 *   res.json({ data: "protected" })
 * })
 * ```
 */
export function withStoreAuth<T = unknown>(
  handler: StoreRouteHandler<T>
): (req: MedusaRequest<T>, res: MedusaResponse) => Promise<void> {
  return async (req: MedusaRequest<T>, res: MedusaResponse): Promise<void> => {
    const customerId = getVerifiedCustomerId(req)

    if (!customerId) {
      res.status(401).json({ message: "Unauthorized" })
      return
    }

    // Attach verified auth context to request
    const authenticatedReq = req as AuthenticatedStoreRequest<T>
    authenticatedReq.store_auth = {
      actor_id: customerId,
      actor_type: "customer",
    }

    await handler(authenticatedReq, res)
  }
}

/**
 * Helper function to check store auth without wrapping.
 * Returns true if authenticated, false otherwise.
 *
 * @example
 * ```typescript
 * import { checkStoreAuth } from "utils/store-auth"
 *
 * export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
 *   if (!checkStoreAuth(req)) {
 *     return res.status(401).json({ message: "Authentication required" })
 *   }
 *   // Customer is authenticated
 * }
 * ```
 */
export function checkStoreAuth(req: MedusaRequest): boolean {
  return getVerifiedCustomerId(req) !== null
}
