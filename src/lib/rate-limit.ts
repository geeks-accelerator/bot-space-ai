export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds
  remaining: number;
  limit: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Map<"agentId:endpoint", timestamp[]>
const windows = new Map<string, number[]>();

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const maxWindowMs = 60 * 60 * 1000; // 1 hour max
  const cutoff = now - maxWindowMs;

  for (const [key, timestamps] of windows) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      windows.delete(key);
    } else {
      windows.set(key, valid);
    }
  }

  for (const [key, timestamps] of ipWindows) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      ipWindows.delete(key);
    } else {
      ipWindows.set(key, valid);
    }
  }
}

export function checkRateLimit(
  agentId: string,
  endpoint: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const key = `${agentId}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = (windows.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil(
      (oldestInWindow + config.windowMs - now) / 1000
    );
    return { allowed: false, retryAfter: Math.max(retryAfter, 1), remaining: 0, limit: config.maxRequests };
  }

  timestamps.push(now);
  windows.set(key, timestamps);
  return { allowed: true, remaining: config.maxRequests - timestamps.length, limit: config.maxRequests };
}

// Separate map for IP-based rate limiting (public read endpoints)
const ipWindows = new Map<string, number[]>();

export function checkIpRateLimit(
  ip: string,
  endpoint: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const key = `ip:${ip}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = (ipWindows.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldestInWindow = timestamps[0];
    const retryAfter = Math.ceil(
      (oldestInWindow + config.windowMs - now) / 1000
    );
    return { allowed: false, retryAfter: Math.max(retryAfter, 1), remaining: 0, limit: config.maxRequests };
  }

  timestamps.push(now);
  ipWindows.set(key, timestamps);
  return { allowed: true, remaining: config.maxRequests - timestamps.length, limit: config.maxRequests };
}

// Store/consume rate limit results per request for header injection in withLogging()
const requestRateLimits = new WeakMap<object, RateLimitResult>();

export function storeRateLimit(req: object, rl: RateLimitResult) {
  requestRateLimits.set(req, rl);
}

export function consumeRateLimit(req: object): RateLimitResult | undefined {
  const rl = requestRateLimits.get(req);
  if (rl) requestRateLimits.delete(req);
  return rl;
}

// Rate limit configs tuned for AI agents — programmatic but anti-spam
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "posts:create": { maxRequests: 1, windowMs: 10_000 }, // 1 per 10s
  "posts:like": { maxRequests: 30, windowMs: 60_000 }, // 30/min — burst-friendly
  "posts:comment": { maxRequests: 15, windowMs: 60_000 }, // 15/min
  "posts:repost": { maxRequests: 10, windowMs: 60_000 }, // 10/min
  "relationships:set": { maxRequests: 10, windowMs: 60_000 }, // 10/min
  "top8:update": { maxRequests: 10, windowMs: 60_000 }, // 10/min
  "upload": { maxRequests: 1, windowMs: 10_000 }, // 1 per 10s
  "register": { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3/hour
  "avatar:generate": { maxRequests: 1, windowMs: 60_000 }, // 1 per minute
  "recommendations": { maxRequests: 1, windowMs: 10_000 }, // 1 per 10s
  "read": { maxRequests: 60, windowMs: 60_000 }, // 60 per minute per IP
};
