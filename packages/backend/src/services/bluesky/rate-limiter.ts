/**
 * RateLimiter class - Manages API rate limits for Bluesky
 */
export class RateLimiter {
  private limits: Map<
    string,
    {
      count: number;
      resetAt: number;
      maxPerWindow: number;
      windowMs: number;
    }
  >;

  /**
   * Create a new RateLimiter instance
   */
  constructor() {
    this.limits = new Map();
  }

  /**
   * Configure a rate limit for a specific endpoint
   * @param endpoint Endpoint key
   * @param maxPerWindow Maximum number of requests per window
   * @param windowMs Time window in milliseconds
   */
  configureLimit(endpoint: string, maxPerWindow: number, windowMs: number): void {
    this.limits.set(endpoint, {
      count: 0,
      resetAt: Date.now() + windowMs,
      maxPerWindow,
      windowMs,
    });
  }

  /**
   * Check if a request would exceed the rate limit
   * @param endpoint Endpoint key
   * @param count Number of requests to check (default: 1)
   * @returns Whether the request would exceed the limit
   */
  wouldExceedLimit(endpoint: string, count = 1): boolean {
    const limit = this.limits.get(endpoint);

    if (!limit) {
      return false; // No limit configured
    }

    // Reset counter if window has passed
    const now = Date.now();
    if (now > limit.resetAt) {
      limit.count = 0;
      limit.resetAt = now + limit.windowMs;
    }

    return limit.count + count > limit.maxPerWindow;
  }

  /**
   * Record a request against the rate limit
   * @param endpoint Endpoint key
   * @param count Number of requests to record (default: 1)
   * @returns Remaining requests in the window
   */
  recordRequest(endpoint: string, count = 1): number {
    const limit = this.limits.get(endpoint);

    if (!limit) {
      return Infinity; // No limit configured
    }

    // Reset counter if window has passed
    const now = Date.now();
    if (now > limit.resetAt) {
      limit.count = 0;
      limit.resetAt = now + limit.windowMs;
    }

    // Record the request
    limit.count += count;

    return Math.max(0, limit.maxPerWindow - limit.count);
  }

  /**
   * Get time until the rate limit resets
   * @param endpoint Endpoint key
   * @returns Time in milliseconds until reset, or 0 if no limit
   */
  getTimeUntilReset(endpoint: string): number {
    const limit = this.limits.get(endpoint);

    if (!limit) {
      return 0; // No limit configured
    }

    const now = Date.now();
    return Math.max(0, limit.resetAt - now);
  }

  /**
   * Get the remaining requests in the current window
   * @param endpoint Endpoint key
   * @returns Remaining requests, or Infinity if no limit
   */
  getRemainingRequests(endpoint: string): number {
    const limit = this.limits.get(endpoint);

    if (!limit) {
      return Infinity; // No limit configured
    }

    // Reset counter if window has passed
    const now = Date.now();
    if (now > limit.resetAt) {
      limit.count = 0;
      limit.resetAt = now + limit.windowMs;
    }

    return Math.max(0, limit.maxPerWindow - limit.count);
  }

  /**
   * Wait until the rate limit allows a request
   * @param endpoint Endpoint key
   * @param count Number of requests to check (default: 1)
   * @returns Promise that resolves when the request can be made
   */
  async waitForAvailability(endpoint: string, count = 1): Promise<void> {
    const limit = this.limits.get(endpoint);

    if (!limit) {
      return; // No limit configured
    }

    // Check if we need to wait
    while (this.wouldExceedLimit(endpoint, count)) {
      const waitTime = this.getTimeUntilReset(endpoint);
      await new Promise(resolve => setTimeout(resolve, waitTime + 100)); // Add 100ms buffer
    }
  }
}
