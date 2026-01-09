/**
 * Idempotency service for preventing duplicate event processing
 * Stores processed event IDs to prevent replay attacks and duplicate processing
 *
 * Uses in-memory storage by default, can be extended to use Redis for production
 */

interface IdempotencyStore {
  has(key: string): Promise<boolean> | boolean
  set(key: string, value: any, ttlSeconds?: number): Promise<void> | void
  get(key: string): Promise<any> | any
  delete(key: string): Promise<void> | void
}

/**
 * In-memory idempotency store
 * Good for development and single-server deployments
 */
class InMemoryIdempotencyStore implements IdempotencyStore {
  private store: Map<string, { value: any; expiresAt: number }> = new Map()

  constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  has(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return false
    }

    return true
  }

  set(key: string, value: any, ttlSeconds: number = 259200): void {
    // Default TTL: 72 hours (3 days) - Stripe retries for up to 3 days
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.store.set(key, { value, expiresAt })
  }

  get(key: string): any {
    const entry = this.store.get(key)
    if (!entry) return null

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return null
    }

    return entry.value
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key)
      }
    }
  }

  getStats() {
    return {
      totalKeys: this.store.size,
      keys: Array.from(this.store.keys()),
    }
  }
}

/**
 * Redis-backed idempotency store (for production with multiple servers)
 * Uncomment and use this if you have Redis configured
 */
/*
import Redis from 'ioredis'
import { REDIS_URL } from '../lib/constants'

class RedisIdempotencyStore implements IdempotencyStore {
  private client: Redis

  constructor() {
    if (!REDIS_URL) {
      throw new Error('REDIS_URL is required for RedisIdempotencyStore')
    }
    this.client = new Redis(REDIS_URL)
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key)
    return exists === 1
  }

  async set(key: string, value: any, ttlSeconds: number = 259200): Promise<void> {
    const serialized = JSON.stringify(value)
    await this.client.setex(key, ttlSeconds, serialized)
  }

  async get(key: string): Promise<any> {
    const value = await this.client.get(key)
    if (!value) return null
    return JSON.parse(value)
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }
}
*/

// Singleton instance
let idempotencyStore: IdempotencyStore

/**
 * Get or create the idempotency store instance
 * Uses in-memory store by default
 */
export function getIdempotencyStore(): IdempotencyStore {
  if (!idempotencyStore) {
    // Use in-memory store by default
    // For production with Redis, uncomment the RedisIdempotencyStore above
    idempotencyStore = new InMemoryIdempotencyStore()

    // For Redis (uncomment when Redis is available):
    // idempotencyStore = new RedisIdempotencyStore()
  }

  return idempotencyStore
}

/**
 * Check if an event has already been processed
 * @param eventId Unique event identifier (e.g., Stripe event ID)
 * @param prefix Optional prefix for namespacing (e.g., 'stripe:', 'webhook:')
 * @returns true if already processed, false if new
 */
export async function isEventProcessed(
  eventId: string,
  prefix: string = 'event:'
): Promise<boolean> {
  const store = getIdempotencyStore()
  const key = `${prefix}${eventId}`
  return await store.has(key)
}

/**
 * Mark an event as processed
 * @param eventId Unique event identifier
 * @param prefix Optional prefix for namespacing
 * @param ttlSeconds Time to live in seconds (default: 72 hours)
 * @param metadata Optional metadata to store with the event
 */
export async function markEventProcessed(
  eventId: string,
  prefix: string = 'event:',
  ttlSeconds: number = 259200,
  metadata?: any
): Promise<void> {
  const store = getIdempotencyStore()
  const key = `${prefix}${eventId}`
  const value = {
    processedAt: new Date().toISOString(),
    eventId,
    metadata,
  }
  await store.set(key, value, ttlSeconds)
}

/**
 * Get metadata for a processed event
 * @param eventId Unique event identifier
 * @param prefix Optional prefix for namespacing
 * @returns Event metadata or null if not found
 */
export async function getEventMetadata(
  eventId: string,
  prefix: string = 'event:'
): Promise<any> {
  const store = getIdempotencyStore()
  const key = `${prefix}${eventId}`
  return await store.get(key)
}

/**
 * Idempotency wrapper for webhook handlers
 * Automatically checks if event was processed and marks it as processed
 *
 * @example
 * await withIdempotency('stripe_evt_123', async () => {
 *   // Your webhook processing logic here
 *   await processPayment()
 *   await sendEmail()
 * })
 */
export async function withIdempotency<T>(
  eventId: string,
  handler: () => Promise<T>,
  options?: {
    prefix?: string
    ttlSeconds?: number
    onDuplicate?: () => void | Promise<void>
  }
): Promise<{ result: T | null; isDuplicate: boolean }> {
  const prefix = options?.prefix || 'event:'
  const ttlSeconds = options?.ttlSeconds || 259200

  // Check if already processed
  const alreadyProcessed = await isEventProcessed(eventId, prefix)

  if (alreadyProcessed) {
    // Event already processed, skip
    if (options?.onDuplicate) {
      await options.onDuplicate()
    }
    return { result: null, isDuplicate: true }
  }

  // Process the event
  const result = await handler()

  // Mark as processed
  await markEventProcessed(eventId, prefix, ttlSeconds, { result })

  return { result, isDuplicate: false }
}
