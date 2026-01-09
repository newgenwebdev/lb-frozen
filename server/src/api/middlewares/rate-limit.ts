import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

/**
 * Simple in-memory rate limiter for webhooks
 * Tracks requests per IP address within a time window
 *
 * For production with multiple servers, consider using Redis-based rate limiting
 */
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly windowMs: number
  private readonly maxRequests: number
  private readonly blockDurationMs: number
  private blockedIPs: Map<string, number> = new Map()

  constructor(options: {
    windowMs: number
    maxRequests: number
    blockDurationMs?: number
  }) {
    this.windowMs = options.windowMs
    this.maxRequests = options.maxRequests
    this.blockDurationMs = options.blockDurationMs || 15 * 60 * 1000 // 15 minutes default

    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000)
  }

  /**
   * Check if IP is allowed to make a request
   * Returns true if allowed, false if rate limited
   */
  checkLimit(ip: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now()

    // Check if IP is blocked
    const blockedUntil = this.blockedIPs.get(ip)
    if (blockedUntil && blockedUntil > now) {
      const retryAfter = Math.ceil((blockedUntil - now) / 1000)
      return { allowed: false, retryAfter }
    } else if (blockedUntil) {
      // Block expired, remove it
      this.blockedIPs.delete(ip)
    }

    // Get request timestamps for this IP
    const timestamps = this.requests.get(ip) || []

    // Remove timestamps outside the current window
    const windowStart = now - this.windowMs
    const recentTimestamps = timestamps.filter(ts => ts > windowStart)

    // Check if limit exceeded
    if (recentTimestamps.length >= this.maxRequests) {
      // Block this IP
      this.blockedIPs.set(ip, now + this.blockDurationMs)
      const retryAfter = Math.ceil(this.blockDurationMs / 1000)
      return { allowed: false, retryAfter }
    }

    // Add current timestamp
    recentTimestamps.push(now)
    this.requests.set(ip, recentTimestamps)

    return { allowed: true }
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Clean up request timestamps
    for (const [ip, timestamps] of this.requests.entries()) {
      const recentTimestamps = timestamps.filter(ts => ts > windowStart)
      if (recentTimestamps.length === 0) {
        this.requests.delete(ip)
      } else {
        this.requests.set(ip, recentTimestamps)
      }
    }

    // Clean up expired blocks
    for (const [ip, blockedUntil] of this.blockedIPs.entries()) {
      if (blockedUntil <= now) {
        this.blockedIPs.delete(ip)
      }
    }
  }

  /**
   * Get current stats (for debugging)
   */
  getStats() {
    return {
      trackedIPs: this.requests.size,
      blockedIPs: this.blockedIPs.size,
    }
  }
}

// Create rate limiter instance for webhooks
// 100 requests per minute, block for 15 minutes if exceeded
const webhookRateLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  blockDurationMs: 15 * 60 * 1000, // 15 minutes
})

// Strict rate limiter for authentication endpoints (login)
// 5 attempts per 15 minutes, block for 30 minutes if exceeded
const authRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  blockDurationMs: 30 * 60 * 1000, // 30 minutes
})

// Rate limiter for registration endpoints
// 3 attempts per hour, block for 1 hour if exceeded
const registrationRateLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  blockDurationMs: 60 * 60 * 1000, // 1 hour
})

/**
 * Rate limiting middleware for webhook endpoints
 * Prevents DoS attacks and brute force attempts
 */
export const rateLimitWebhook = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  // Get client IP (handle proxy headers)
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    'unknown'

  const logger = req.scope.resolve("logger")

  // Check rate limit
  const { allowed, retryAfter } = webhookRateLimiter.checkLimit(ip)

  if (!allowed) {
    logger.warn(
      `Rate limit exceeded for IP ${ip}. Blocked for ${retryAfter} seconds`
    )

    // Set retry-after header
    res.setHeader('Retry-After', retryAfter || 900)
    res.setHeader('X-RateLimit-Limit', '100')
    res.setHeader('X-RateLimit-Remaining', '0')
    res.setHeader('X-RateLimit-Reset', Date.now() + (retryAfter || 900) * 1000)

    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Too many requests. Please try again in ${retryAfter} seconds.`
    )
  }

  // Set rate limit headers for successful requests
  res.setHeader('X-RateLimit-Limit', '100')

  next()
}

/**
 * General rate limiting middleware for API endpoints
 * More permissive than webhook rate limiting
 */
export const rateLimitAPI = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  // 300 requests per minute for general API
  const apiRateLimiter = new InMemoryRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 300,
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  })

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    'unknown'

  const { allowed, retryAfter } = apiRateLimiter.checkLimit(ip)

  if (!allowed) {
    res.setHeader('Retry-After', retryAfter || 300)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      'Too many requests. Please try again later.'
    )
  }

  next()
}

/**
 * Helper to get client IP address
 */
function getClientIP(req: MedusaRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    'unknown'
  )
}

/**
 * Rate limiting middleware for authentication endpoints (login)
 * Strict limits to prevent brute force attacks
 * 5 attempts per 15 minutes, block for 30 minutes if exceeded
 */
export const rateLimitAuth = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const ip = getClientIP(req)

  const { allowed, retryAfter } = authRateLimiter.checkLimit(ip)

  if (!allowed) {
    const logger = req.scope.resolve("logger")
    logger.warn(
      `[SECURITY] Auth rate limit exceeded for IP ${ip}. Blocked for ${retryAfter} seconds`
    )

    res.setHeader('Retry-After', retryAfter || 1800)
    res.setHeader('X-RateLimit-Limit', '5')
    res.setHeader('X-RateLimit-Remaining', '0')
    res.setHeader('X-RateLimit-Reset', Date.now() + (retryAfter || 1800) * 1000)

    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Too many login attempts. Please try again in ${Math.ceil((retryAfter || 1800) / 60)} minutes.`
    )
  }

  res.setHeader('X-RateLimit-Limit', '5')
  next()
}

/**
 * Rate limiting middleware for registration endpoints
 * Very strict limits to prevent account enumeration and spam
 * 3 attempts per hour, block for 1 hour if exceeded
 */
export const rateLimitRegistration = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const ip = getClientIP(req)

  const { allowed, retryAfter } = registrationRateLimiter.checkLimit(ip)

  if (!allowed) {
    const logger = req.scope.resolve("logger")
    logger.warn(
      `[SECURITY] Registration rate limit exceeded for IP ${ip}. Blocked for ${retryAfter} seconds`
    )

    res.setHeader('Retry-After', retryAfter || 3600)
    res.setHeader('X-RateLimit-Limit', '3')
    res.setHeader('X-RateLimit-Remaining', '0')
    res.setHeader('X-RateLimit-Reset', Date.now() + (retryAfter || 3600) * 1000)

    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Too many registration attempts. Please try again in ${Math.ceil((retryAfter || 3600) / 60)} minutes.`
    )
  }

  res.setHeader('X-RateLimit-Limit', '3')
  next()
}
