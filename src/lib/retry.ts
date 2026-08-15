import { logWarning } from "./logger";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  context?: string;
}

/**
 * Retry `fn`, and if it still fails, log a warning and return `fallback`
 * instead of throwing.
 *
 * This is the contract every build-time query uses: a page's
 * generateStaticParams must never fail the build just because the database is
 * briefly unreachable. Returning an empty list leaves the route as
 * SSG-with-no-prerendered-params, so pages render on demand and are then
 * ISR-cached exactly as if they had been listed.
 */
export async function withRetryOrDefault<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string,
  options: Omit<RetryOptions, "context"> = {}
): Promise<T> {
  try {
    return await withRetry(fn, { maxRetries: 2, ...options, context });
  } catch (err) {
    logWarning({
      method: "",
      path: context,
      errorMessage: `Falling back to default: ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
    return fallback;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    context = "retry",
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxRetries) break;

      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelayMs;
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

      logWarning({
        method: "",
        path: context,
        errorMessage: `Attempt ${attempt + 1}/${maxRetries + 1} failed: ${
          err instanceof Error ? err.message : String(err)
        }. Retrying in ${Math.round(delay)}ms...`,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
