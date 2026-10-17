// Runs against the Firestore emulator: `npm test -w functions`.
import { HttpsError } from "firebase-functions/v2/https";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/admin";
import { sendNotification, type PushMessage } from "../src/notifications";
import type { Caller } from "../src/users";

const editor: Caller = { uid: "ed", role: "EDITOR" };
const social: Caller = { uid: "smm", role: "SOCIAL_MEDIA_MANAGER" };

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents`, {
    method: "DELETE",
  });
  await db.doc("news/p").set({ newsId: "p", slug: "story-p", status: "PUBLISHED", headline: "H", thumbnailUrl: "https://img/x.jpg" });
  await db.doc("news/d").set({ newsId: "d", slug: "story-d", status: "DRAFT", headline: "H" });
  await db.doc("locations/district-pune").set({ type: "DISTRICT", name: "पुणे" });
  await db.doc("users/ed").set({ fullName: "Vaishali Kulkarni", status: "ACTIVE" });
});

const okSender = () => vi.fn(async (_m: PushMessage) => "projects/x/messages/123");
const request = (extra: Record<string, unknown> = {}) => ({
  newsId: "p",
  title: "ब्रेकिंग न्यूज",
  body: "पुण्यात मुसळधार पाऊस",
  target: { type: "ALL" },
  ...extra,
});

async function expectCode(promise: Promise<unknown>, code: HttpsError["code"]) {
  await expect(promise).rejects.toSatisfy((err) => err instanceof HttpsError && err.code === code);
}

describe("sendNotification", () => {
  it("sends to all readers with the article link data, and records the job", async () => {
    const send = okSender();
    const res = await sendNotification(editor, request(), send);

    expect(res).toEqual({ notificationId: "p__all", status: "SENT", providerMessageId: "projects/x/messages/123" });
    expect(send).toHaveBeenCalledWith({
      topic: "news_all",
      title: "ब्रेकिंग न्यूज",
      body: "पुण्यात मुसळधार पाऊस",
      imageUrl: "https://img/x.jpg",
      data: { newsId: "p", slug: "story-p" },
    });
    const job = (await db.doc("notifications/p__all").get()).data();
    expect(job).toMatchObject({ status: "SENT", createdBy: "ed", createdByName: "Vaishali Kulkarni", topic: "news_all", attempts: 1, newsId: "p" });
    expect(job?.sentAt).toBeDefined();
    const logs = await db.collection("auditLogs").where("action", "==", "NOTIFICATION_SENT").get();
    expect(logs.size).toBe(1);
  });

  it("never notifies the same audience twice for one article", async () => {
    const send = okSender();
    await sendNotification(editor, request(), send);
    await expectCode(sendNotification(social, request(), send), "already-exists");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("lets two simultaneous sends through only once", async () => {
    const send = okSender();
    const results = await Promise.allSettled([sendNotification(editor, request(), send), sendNotification(social, request(), send)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("treats each district as a separate audience", async () => {
    const send = okSender();
    await sendNotification(editor, request(), send);
    await sendNotification(editor, request({ target: { type: "DISTRICT", districtId: "district-pune" } }), send);
    expect(send.mock.calls.map(([m]) => m.topic)).toEqual(["news_all", "district_district-pune"]);
  });

  it("records a failure and allows a retry", async () => {
    const failing = vi.fn(async () => {
      throw new Error("FCM quota exceeded");
    });
    await expectCode(sendNotification(editor, request(), failing), "aborted");
    expect((await db.doc("notifications/p__all").get()).data()).toMatchObject({ status: "FAILED", error: "FCM quota exceeded" });

    const res = await sendNotification(editor, request(), okSender());
    expect(res.status).toBe("SENT");
    const job = (await db.doc("notifications/p__all").get()).data();
    expect(job).toMatchObject({ status: "SENT", attempts: 2 });
    expect(job?.error).toBeUndefined();
  });

  it("only sends for published news", async () => {
    await expectCode(sendNotification(editor, request({ newsId: "d" }), okSender()), "failed-precondition");
    await expectCode(sendNotification(editor, request({ newsId: "missing" }), okSender()), "not-found");
  });

  it("is limited to editors, super admins and social media managers", async () => {
    for (const role of ["REPORTER", "OWNER"] as const) {
      await expectCode(sendNotification({ uid: "x", role }, request(), okSender()), "permission-denied");
    }
  });

  it("validates the message and audience", async () => {
    await expectCode(sendNotification(editor, request({ title: "" }), okSender()), "invalid-argument");
    await expectCode(sendNotification(editor, request({ body: "x".repeat(251) }), okSender()), "invalid-argument");
    await expectCode(sendNotification(editor, request({ target: { type: "EVERYONE" } }), okSender()), "invalid-argument");
    await expectCode(sendNotification(editor, request({ target: { type: "DISTRICT", districtId: "nowhere" } }), okSender()), "invalid-argument");
  });
});
