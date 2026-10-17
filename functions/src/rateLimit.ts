/**
 * Fixed-window counter per key (an IP address), kept in the memory of one
 * function instance. It does not need to be exact: it stops one client from
 * inflating view or ad counters with a script, and maxInstances bounds the
 * total. Old windows are dropped so memory stays small.
 */
export class RateLimiter {
  private hits = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 20_000,
  ) {}

  /** True when the request is allowed (and counts it). */
  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      if (this.hits.size >= this.maxKeys) this.prune(now);
      this.hits.set(key, { windowStart: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  private prune(now: number) {
    for (const [key, entry] of this.hits) if (now - entry.windowStart >= this.windowMs) this.hits.delete(key);
    // Still full (a flood of distinct addresses): start over rather than grow without bound.
    if (this.hits.size >= this.maxKeys) this.hits.clear();
  }
}

/**
 * The client address. Google's front end appends the address it saw to
 * X-Forwarded-For, so the last hop is the trustworthy one; earlier hops are
 * whatever the client sent and could be forged to dodge the limit.
 */
export function clientIp(req: { get(name: string): string | undefined; ip?: string }): string {
  return req.get("x-forwarded-for")?.split(",").pop()?.trim() || req.ip || "unknown";
}
