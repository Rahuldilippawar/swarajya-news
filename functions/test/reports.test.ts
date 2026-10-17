// Runs against the Firestore emulator: `npm test -w functions`.
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/admin";
import { indiaDate, recordAdEvent } from "../src/ads";
import { getReport } from "../src/reports";
import type { Caller } from "../src/users";

const owner: Caller = { uid: "owner", role: "OWNER" };
const at = (iso: string) => Timestamp.fromDate(new Date(iso));

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents`, {
    method: "DELETE",
  });
});

async function expectCode(promise: Promise<unknown>, code: HttpsError["code"]) {
  await expect(promise).rejects.toSatisfy((err) => err instanceof HttpsError && err.code === code);
}

describe("recordAdEvent", () => {
  beforeEach(async () => {
    await db.doc("advertisements/live").set({ isActive: true, startAt: at("2026-01-01T00:00:00Z"), endAt: at("2027-01-01T00:00:00Z") });
    await db.doc("advertisements/ended").set({ isActive: true, startAt: at("2025-01-01T00:00:00Z"), endAt: at("2025-06-01T00:00:00Z") });
    await db.doc("advertisements/off").set({ isActive: false, startAt: at("2026-01-01T00:00:00Z"), endAt: at("2027-01-01T00:00:00Z") });
  });

  it("counts impressions and clicks with per-day totals", async () => {
    const now = new Date("2026-10-17T20:00:00Z"); // 18 Oct in India
    await recordAdEvent("live", "impression", now);
    await recordAdEvent("live", "impression", now);
    await recordAdEvent("live", "click", now);
    expect((await db.doc("advertisements/live").get()).data()).toMatchObject({ impressions: 2, clicks: 1 });
    expect((await db.doc("advertisements/live/daily/2026-10-18").get()).data()).toEqual({ date: "2026-10-18", impressions: 2, clicks: 1 });
  });

  it("ignores ads that are not running and bad input", async () => {
    const now = new Date("2026-10-17T10:00:00Z");
    for (const [id, type] of [["ended", "click"], ["off", "impression"], ["missing", "click"], ["live", "hover"], ["../x", "click"], [42, "click"]] as const) {
      expect(await recordAdEvent(id, type, now)).toBe("ignored");
    }
    expect((await db.doc("advertisements/live").get()).get("clicks")).toBeUndefined();
  });

  it("uses India dates", () => {
    expect(indiaDate(new Date("2026-10-17T18:29:00Z"))).toBe("2026-10-17");
    expect(indiaDate(new Date("2026-10-17T18:31:00Z"))).toBe("2026-10-18");
  });
});

describe("getReport", () => {
  beforeEach(async () => {
    await db.doc("categories/local").set({ name: "स्थानिक" });
    await db.doc("locations/district-pune").set({ name: "पुणे", type: "DISTRICT" });
    const news = (id: string, extra: Record<string, unknown>) =>
      db.doc(`news/${id}`).set({ newsId: id, slug: id, headline: `H ${id}`, categoryId: "local", districtId: "district-pune", reporterUid: "r1", reporterName: "Ramesh", reporterId: "SN-R-0001", status: "PUBLISHED", viewCount: 0, ...extra });
    await news("a", { publishedAt: at("2026-10-15T04:00:00Z"), viewCount: 50, videoProvider: "YOUTUBE" });
    await news("b", { publishedAt: at("2026-10-16T04:00:00Z"), viewCount: 120 });
    await news("c", { publishedAt: at("2026-10-16T05:00:00Z"), viewCount: 5, status: "ARCHIVED", reporterUid: "r2", reporterName: "Suresh", reporterId: "SN-R-0002" });
    await news("old", { publishedAt: at("2026-09-01T04:00:00Z"), viewCount: 999 });
    await news("unpublished", { publishedAt: at("2026-10-16T06:00:00Z"), status: "APPROVED" });
    await news("pending", { status: "SUBMITTED", reporterUid: "r2", reporterName: "Suresh", reporterId: "SN-R-0002" });
    const log = (action: string, targetId: string, iso: string) =>
      db.collection("auditLogs").add({ action, targetId, targetType: "news", actorId: "x", timestamp: at(iso) });
    await log("NEWS_SUBMITTED", "a", "2026-10-14T05:00:00Z");
    await log("NEWS_SUBMITTED", "pending", "2026-10-16T05:00:00Z");
    await log("NEWS_CHANGES_REQUESTED", "pending", "2026-10-16T06:00:00Z");
    await log("NEWS_REJECTED", "c", "2026-10-16T07:00:00Z");
    await log("NEWS_APPROVED", "b", "2026-10-16T03:00:00Z");
    await log("NEWS_SUBMITTED", "old", "2026-08-30T05:00:00Z");
  });

  it("summarises a date range in India time", async () => {
    const r = await getReport(owner, { from: "2026-10-14", to: "2026-10-16" });
    expect(r.totals).toEqual({ published: 3, submitted: 2, approved: 1, rejected: 1, changesRequested: 1, views: 175, videos: 1 });
    expect(r.byDay).toEqual([
      { date: "2026-10-14", published: 0 },
      { date: "2026-10-15", published: 1 },
      { date: "2026-10-16", published: 2 },
    ]);
    expect(r.byCategory).toEqual([{ key: "local", label: "स्थानिक", published: 3, views: 175 }]);
    expect(r.byDistrict[0]).toMatchObject({ label: "पुणे", published: 3 });
    expect(r.articles.map((a) => a.newsId)).toEqual(["b", "a", "c"]);
    expect(r.truncated).toBe(false);
  });

  it("attributes work to reporters, including articles still in review", async () => {
    const r = await getReport(owner, { from: "2026-10-14", to: "2026-10-16" });
    const ramesh = r.byReporter.find((x) => x.reporterUid === "r1");
    const suresh = r.byReporter.find((x) => x.reporterUid === "r2");
    expect(ramesh).toMatchObject({ published: 2, submitted: 1, views: 170 });
    expect(suresh).toMatchObject({ published: 1, submitted: 1, changesRequested: 1, rejected: 1, views: 5 });
  });

  it("validates the range and permission", async () => {
    await expectCode(getReport(owner, { from: "2026-10-16", to: "2026-10-14" }), "invalid-argument");
    await expectCode(getReport(owner, { from: "2025-01-01", to: "2026-10-14" }), "invalid-argument");
    await expectCode(getReport(owner, { from: "17/10/2026", to: "2026-10-14" }), "invalid-argument");
    for (const role of ["REPORTER", "SOCIAL_MEDIA_MANAGER"] as const) {
      await expectCode(getReport({ uid: "x", role }, { from: "2026-10-14", to: "2026-10-16" }), "permission-denied");
    }
  });
});
