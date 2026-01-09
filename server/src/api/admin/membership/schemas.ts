import { z } from "zod"

/**
 * Admin membership endpoints are GET-only (no request schemas needed)
 *
 * Available endpoints:
 * - GET /admin/membership/config - Get membership configuration
 * - GET /admin/membership/members - List all members
 * - GET /admin/membership/members/:id - Get specific member details
 *
 * All endpoints use query parameters only, no request body validation needed.
 */

// Placeholder for future request schemas if POST/PUT endpoints are added
// Currently all admin membership endpoints are read-only
