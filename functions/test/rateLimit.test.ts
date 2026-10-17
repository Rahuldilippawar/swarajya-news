import { describe, expect, it } from "vitest";
import { clientIp, RateLimiter } from "../src/rateLimit";

describe("RateLimiter", () => {
  it("allows up to the limit per window, per key", () => {
    const rl = new RateLimiter(3, 60_000);
    expect([1, 2, 3, 4].map(() => rl.allow("a", 1000))).toEqual([true, true, true, false]);
    expect(rl.allow("b", 1000)).toBe(true);
    expect(rl.allow("a", 61_000)).toBe(true);
  });

  it("stays bounded under many distinct keys", () => {
    const rl = new RateLimiter(1, 60_000, 100);
    for (let i = 0; i < 1000; i++) expect(rl.allow(`ip${i}`, 0)).toBe(true);
    expect((rl as unknown as { hits: Map<string, unknown> }).hits.size).toBeLessThanOrEqual(100);
  });
});

describe("clientIp", () => {
  const req = (h: Record<string, string>, ip?: string) => ({ get: (n: string) => h[n], ip });
  it("uses the hop Google appended (the last), else the socket address", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" }))).toBe("1.2.3.4");
    expect(clientIp(req({}, "5.6.7.8"))).toBe("5.6.7.8");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
