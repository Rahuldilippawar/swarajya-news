#!/usr/bin/env node
// Post-deploy smoke test. Checks only public, read-only behaviour, so it is safe
// to run against production at any time. No dependencies (Node 22 fetch).
//
//   node scripts/smoke.mjs --site https://swarajyanews.in \
//     --admin https://admin.swarajyanews.in --reporter https://reporter.swarajyanews.in \
//     --functions https://asia-south1-<project>.cloudfunctions.net
//
// Any subset of the options may be given. Exits 1 if a check fails.
import { parseArgs } from "node:util";

const { values: opts } = parseArgs({
  options: { site: { type: "string" }, admin: { type: "string" }, reporter: { type: "string" }, functions: { type: "string" } },
});
if (!Object.values(opts).some(Boolean)) {
  console.error("Usage: node scripts/smoke.mjs [--site URL] [--admin URL] [--reporter URL] [--functions URL]");
  process.exit(2);
}

const results = [];
async function check(name, run) {
  try {
    const detail = await run();
    results.push({ ok: true, name, detail: detail ?? "" });
  } catch (err) {
    results.push({ ok: false, name, detail: err instanceof Error ? err.message : String(err) });
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const base = (u) => u.replace(/\/+$/, "");
async function get(url, init) {
  const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20_000), ...init });
  return { res, text: await res.text() };
}
const header = (res, name) => res.headers.get(name) ?? "";

if (opts.site) {
  const site = base(opts.site);
  await check("website: home page", async () => {
    const { res, text } = await get(`${site}/`);
    assert(res.status === 200, `status ${res.status}`);
    assert(text.includes("स्वराज्य"), "channel name missing from the page");
    assert(header(res, "x-content-type-options") === "nosniff", "nosniff header missing");
    assert(/frame-ancestors 'self'/.test(header(res, "content-security-policy")), "frame-ancestors missing");
    return `${(text.match(/href="\/news\//g) ?? []).length} article links`;
  });
  let firstArticle = null;
  await check("website: sitemap uses the live domain", async () => {
    const { res, text } = await get(`${site}/sitemap.xml`);
    assert(res.status === 200, `status ${res.status}`);
    const locs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert(locs.length > 0, "no URLs in the sitemap");
    const foreign = locs.find((l) => !l.startsWith(`${site}/`) && l !== site);
    assert(!foreign, `URL on another origin: ${foreign} (check NEXT_PUBLIC_SITE_URL)`);
    firstArticle = locs.find((l) => l.includes("/news/")) ?? null;
    return `${locs.length} URLs`;
  });
  await check("website: robots.txt allows crawling", async () => {
    const { res, text } = await get(`${site}/robots.txt`);
    assert(res.status === 200, `status ${res.status}`);
    assert(!/^Disallow:\s*\/\s*$/m.test(text), "robots.txt blocks the whole site");
    assert(text.includes(`${site}/sitemap.xml`), "sitemap link missing or on another origin");
  });
  await check("website: an article opens", async () => {
    if (!firstArticle) return "skipped: no published articles yet";
    const { res } = await get(firstArticle);
    assert(res.status === 200, `status ${res.status} for ${firstArticle}`);
    return firstArticle;
  });
  for (const path of ["/privacy-policy", "/editorial-policy", "/contact"]) {
    await check(`website: ${path}`, async () => {
      const { res, text } = await get(`${site}${path}`);
      assert(res.status === 200, `status ${res.status}`);
      assert(!text.includes("लवकरच प्रकाशित केले जाईल"), "still the placeholder text");
    });
  }
  await check("website: unknown page returns 404", async () => {
    const { res } = await get(`${site}/news/this-article-does-not-exist-${Date.now()}`);
    assert(res.status === 404, `status ${res.status}`);
  });
}

for (const [label, url] of [["admin panel", opts.admin], ["reporter panel", opts.reporter]]) {
  if (!url) continue;
  await check(`${label}: login page, private headers`, async () => {
    const { res } = await get(`${base(url)}/login`);
    assert(res.status === 200, `status ${res.status}`);
    assert(header(res, "x-frame-options") === "DENY", "X-Frame-Options DENY missing");
    assert(header(res, "x-robots-tag").includes("noindex"), "noindex missing");
  });
}

if (opts.functions) {
  const fn = base(opts.functions);
  await check("functions: health", async () => {
    const { res, text } = await get(`${fn}/health`);
    assert(res.status === 200, `status ${res.status}`);
    assert(JSON.parse(text).ok === true, "unexpected body");
  });
  await check("functions: view counter ignores unknown articles", async () => {
    const { res } = await get(`${fn}/recordView`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newsId: `smoke-test-${Date.now()}` }),
    });
    assert(res.status === 204, `status ${res.status}`);
  });
  await check("functions: WhatsApp webhook rejects a wrong verify token", async () => {
    const { res } = await get(`${fn}/whatsappWebhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1`);
    assert(res.status === 403, `status ${res.status}`);
  });
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\nAll ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
