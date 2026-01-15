import { loadEnv } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

/**
 * Is development environment
 */
export const IS_DEV = process.env.NODE_ENV === 'development'

/**
 * Public URL for the backend
 */
export const BACKEND_URL = process.env.BACKEND_PUBLIC_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN_VALUE ?? 'http://localhost:9000'

/**
 * Public URL for the storefront
 */
export const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'http://localhost:3000'

/**
 * Email logo URL - hosted on MinIO/S3 bucket for reliable email rendering
 */
export const EMAIL_LOGO_URL = process.env.EMAIL_LOGO_URL

/**
 * Email brand name for email templates
 */
export const EMAIL_BRAND_NAME = process.env.EMAIL_BRAND_NAME || 'LB Frozen'

/**
 * Database URL for Postgres instance used by the backend
 * Note: Don't assert at module load time to allow build without env vars
 */
export const DATABASE_URL = process.env.DATABASE_URL || ''

/**
 * (optional) Redis URL for Redis instance used by the backend
 */
export const REDIS_URL = process.env.REDIS_URL;

/**
 * Admin CORS origins
 */
export const ADMIN_CORS = process.env.ADMIN_CORS || 'http://localhost:3001,https://lb-frozen-admin-production.up.railway.app';

/**
 * Auth CORS origins
 */
export const AUTH_CORS = process.env.AUTH_CORS || 'http://localhost:3000,http://localhost:3001,https://lb-frozen-production.up.railway.app,https://lb-frozen-admin-production.up.railway.app';

/**
 * Store/frontend CORS origins
 */
export const STORE_CORS = process.env.STORE_CORS || 'http://localhost:3000,https://lb-frozen-production.up.railway.app';

/**
 * JWT Secret used for signing JWT tokens
 * Note: Uses fallback for build time, must be set at runtime
 */
export const JWT_SECRET = process.env.JWT_SECRET || 'build-time-placeholder'

/**
 * Cookie secret used for signing cookies
 * Note: Uses fallback for build time, must be set at runtime
 */
export const COOKIE_SECRET = process.env.COOKIE_SECRET || 'build-time-placeholder'

/**
 * (optional) Minio configuration for file storage
 */
export const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
export const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
export const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
export const MINIO_BUCKET = process.env.MINIO_BUCKET; // Optional, if not set bucket will be called: medusa-media

/**
 * (optional) Resend API Key and from Email - do not set if using SendGrid
 */
export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;

/**
 * (optionl) SendGrid API Key and from Email - do not set if using Resend
 */
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
export const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM;

/**
 * (optional) Stripe API key and webhook secret
 */
export const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * (optional) Meilisearch configuration
 */
export const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST;
export const MEILISEARCH_ADMIN_KEY = process.env.MEILISEARCH_ADMIN_KEY;

/**
 * Worker mode
 */
export const WORKER_MODE =
  (process.env.MEDUSA_WORKER_MODE as 'worker' | 'server' | 'shared' | undefined) ?? 'shared'

/**
 * Disable Admin
 */
export const SHOULD_DISABLE_ADMIN = process.env.MEDUSA_DISABLE_ADMIN === 'true'

/**
 * Membership Configuration
 */
export const MEMBERSHIP_DEFAULT_PRICE = parseInt(
  process.env.MEMBERSHIP_DEFAULT_PRICE || '999', // Default: $9.99
  10
)
export const MEMBERSHIP_STRIPE_PRICE_ID = process.env.MEMBERSHIP_STRIPE_PRICE_ID
export const MEMBERSHIP_GROUP_ID = process.env.MEMBERSHIP_GROUP_ID || 'cgrp_members'

/**
 * Points System Configuration
 */
export const POINTS_EARNING_TYPE = (process.env.POINTS_EARNING_TYPE as 'percentage' | 'per_product') || 'percentage'
export const POINTS_EARNING_RATE = parseFloat(process.env.POINTS_EARNING_RATE || '5') // Default: 5%
export const POINTS_REDEMPTION_RATE = parseFloat(process.env.POINTS_REDEMPTION_RATE || '0.01') // Default: 100 points = $1
export const POINTS_ENABLED = process.env.POINTS_ENABLED !== 'false' // Default: true

/**
 * Customer Pricing Roles
 * Used to determine which pricing tier a customer can see
 */
export const CUSTOMER_ROLES = {
  RETAIL: 'retail',      // Default - public/guest visitors see this price
  BULK: 'bulk',          // Bulk purchase customers - wholesalers
  VIP: 'vip',            // VIP customers - premium pricing
  SUPPLIER: 'supplier',  // Suppliers - may have special views
} as const

export type CustomerRole = typeof CUSTOMER_ROLES[keyof typeof CUSTOMER_ROLES]

/**
 * Customer Group IDs for pricing tiers
 * These map to Medusa Price Lists for role-based pricing
 */
export const CUSTOMER_GROUP_IDS = {
  RETAIL: process.env.CUSTOMER_GROUP_RETAIL_ID || 'cgrp_retail',
  BULK: process.env.CUSTOMER_GROUP_BULK_ID || 'cgrp_bulk',
  VIP: process.env.CUSTOMER_GROUP_VIP_ID || 'cgrp_vip',
  SUPPLIER: process.env.CUSTOMER_GROUP_SUPPLIER_ID || 'cgrp_supplier',
} as const

/**
 * Default customer role for guests/public visitors
 */
export const DEFAULT_CUSTOMER_ROLE = CUSTOMER_ROLES.RETAIL

/**
 * Enable/disable public registration
 * When false, only admins can create customer accounts
 */
export const ALLOW_PUBLIC_REGISTRATION = process.env.ALLOW_PUBLIC_REGISTRATION === 'true' // Default: false
