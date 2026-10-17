import { HttpsError } from "firebase-functions/v2/https";
import {
  COLLECTIONS,
  hasPermission,
  type CallableResponse,
  type NewsDoc,
  type ReportArticle,
  type ReporterReportRow,
  type ReportRow,
} from "@swarajya/shared";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./admin";
import { indiaDate } from "./ads";
import type { Caller } from "./users";
import { asPayload, requireString } from "./validate";

const MAX_DAYS = 366;
const MAX_ARTICLES = 5000;
const MAX_LOGS = 20000;
const RETURNED_ARTICLES = 1000;
const DAY = 24 * 3600_000;

type Report = CallableResponse<"getReport">;

function parseDay(value: string, key: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpsError("invalid-argument", `${key} must be YYYY-MM-DD.`);
  const t = Date.parse(`${value}T00:00:00+05:30`);
  if (Number.isNaN(t)) throw new HttpsError("invalid-argument", `${key} is not a valid date.`);
  return t;
}

async function namesOf(collection: string, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 300) {
    const snaps = await db.getAll(...unique.slice(i, i + 300).map((id) => db.collection(collection).doc(id)));
    for (const s of snaps) if (s.exists) map.set(s.id, (s.get("name") as string) ?? s.id);
  }
  return map;
}

/**
 * Publication and editorial report for a date range (India time). Runs with
 * full access on the server, so the Owner sees complete numbers without being
 * able to read drafts directly.
 */
export async function getReport(caller: Caller, data: unknown): Promise<Report> {
  if (!hasPermission(caller.role, "reports.view")) throw new HttpsError("permission-denied", "You are not allowed to view reports.");
  const payload = asPayload(data);
  const from = requireString(payload, "from", { max: 10 });
  const to = requireString(payload, "to", { max: 10 });
  const start = parseDay(from, "from");
  const end = parseDay(to, "to") + DAY; // exclusive
  if (end <= start) throw new HttpsError("invalid-argument", "to must not be before from.");
  if ((end - start) / DAY > MAX_DAYS) throw new HttpsError("invalid-argument", `Choose at most ${MAX_DAYS} days.`);
  const range = (field: string) => [
    [field, ">=", Timestamp.fromMillis(start)],
    [field, "<", Timestamp.fromMillis(end)],
  ] as const;

  // Articles first published in the range (still published or since archived).
  let q = db.collection(COLLECTIONS.news).orderBy("publishedAt").limit(MAX_ARTICLES + 1);
  for (const [f, op, v] of range("publishedAt")) q = q.where(f, op, v);
  const newsDocs = (await q.get()).docs;
  const truncated = newsDocs.length > MAX_ARTICLES;
  const published = newsDocs
    .slice(0, MAX_ARTICLES)
    .map((d) => d.data() as NewsDoc)
    .filter((n) => n.status === "PUBLISHED" || n.status === "ARCHIVED");

  // Editorial decisions in the range, from the audit log.
  let lq = db.collection(COLLECTIONS.auditLogs).orderBy("timestamp").limit(MAX_LOGS);
  for (const [f, op, v] of range("timestamp")) lq = lq.where(f, op, v);
  const logs = (await lq.get()).docs
    .map((d) => ({ action: d.get("action") as string, newsId: d.get("targetId") as string }))
    .filter((l) => ["NEWS_SUBMITTED", "NEWS_APPROVED", "NEWS_REJECTED", "NEWS_CHANGES_REQUESTED"].includes(l.action));

  // Attribute decisions to the article's reporter.
  const reporterOf = new Map<string, { uid: string; name: string; reporterId: string }>();
  for (const n of published) reporterOf.set(n.newsId, { uid: n.reporterUid, name: n.reporterName, reporterId: n.reporterId });
  const missing = [...new Set(logs.map((l) => l.newsId).filter((id) => !reporterOf.has(id)))];
  for (let i = 0; i < missing.length; i += 300) {
    const snaps = await db.getAll(...missing.slice(i, i + 300).map((id) => db.collection(COLLECTIONS.news).doc(id)));
    for (const s of snaps) {
      if (s.exists) reporterOf.set(s.id, { uid: s.get("reporterUid"), name: s.get("reporterName"), reporterId: s.get("reporterId") ?? "" });
    }
  }

  const reporters = new Map<string, ReporterReportRow>();
  const reporterRow = (r: { uid: string; name: string; reporterId: string }) => {
    let row = reporters.get(r.uid);
    if (!row) {
      row = { reporterUid: r.uid, name: r.name, reporterId: r.reporterId, submitted: 0, published: 0, changesRequested: 0, rejected: 0, views: 0 };
      reporters.set(r.uid, row);
    }
    return row;
  };
  const totals = { published: published.length, submitted: 0, approved: 0, rejected: 0, changesRequested: 0, views: 0, videos: 0 };
  for (const l of logs) {
    const r = reporterOf.get(l.newsId);
    if (l.action === "NEWS_APPROVED") totals.approved++;
    if (l.action === "NEWS_SUBMITTED") totals.submitted++;
    if (l.action === "NEWS_REJECTED") totals.rejected++;
    if (l.action === "NEWS_CHANGES_REQUESTED") totals.changesRequested++;
    if (!r) continue;
    const row = reporterRow(r);
    if (l.action === "NEWS_SUBMITTED") row.submitted++;
    if (l.action === "NEWS_REJECTED") row.rejected++;
    if (l.action === "NEWS_CHANGES_REQUESTED") row.changesRequested++;
  }

  const byDay = new Map<string, number>();
  for (let t = start; t < end; t += DAY) byDay.set(indiaDate(new Date(t)), 0);
  const categories = new Map<string, ReportRow>();
  const districts = new Map<string, ReportRow>();
  const bump = (map: Map<string, ReportRow>, key: string, views: number) => {
    const row = map.get(key) ?? { key, label: key || "—", published: 0, views: 0 };
    row.published++;
    row.views += views;
    map.set(key, row);
  };
  for (const n of published) {
    const views = n.viewCount ?? 0;
    totals.views += views;
    if (n.videoProvider === "YOUTUBE") totals.videos++;
    const day = indiaDate(n.publishedAt!.toDate());
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    bump(categories, n.categoryId, views);
    bump(districts, n.districtId, views);
    const row = reporterRow({ uid: n.reporterUid, name: n.reporterName, reporterId: n.reporterId });
    row.published++;
    row.views += views;
  }

  const [categoryNames, districtNames] = await Promise.all([
    namesOf(COLLECTIONS.categories, [...categories.keys()]),
    namesOf(COLLECTIONS.locations, [...districts.keys()]),
  ]);
  for (const r of categories.values()) r.label = categoryNames.get(r.key) ?? r.label;
  for (const r of districts.values()) r.label = districtNames.get(r.key) ?? r.label;
  const byPublished = (a: ReportRow, b: ReportRow) => b.published - a.published || b.views - a.views;

  const articles: ReportArticle[] = published
    .map((n) => ({
      newsId: n.newsId,
      slug: n.slug,
      headline: n.headline,
      reporterName: n.reporterName,
      categoryId: n.categoryId,
      districtId: n.districtId,
      publishedAt: n.publishedAt!.toDate().toISOString(),
      views: n.viewCount ?? 0,
      hasVideo: n.videoProvider === "YOUTUBE",
    }))
    .sort((a, b) => b.views - a.views);

  return {
    from,
    to,
    totals,
    byDay: [...byDay].map(([date, count]) => ({ date, published: count })),
    byReporter: [...reporters.values()].sort((a, b) => b.published - a.published || b.submitted - a.submitted),
    byCategory: [...categories.values()].sort(byPublished),
    byDistrict: [...districts.values()].sort(byPublished),
    articles: articles.slice(0, RETURNED_ARTICLES),
    truncated: truncated || articles.length > RETURNED_ARTICLES,
  };
}
