// Runs against the Firestore emulator: `npm test -w functions`.
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import type { NewsStatus } from "@swarajya/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/admin";
import { assertActiveCaller } from "../src/callable";
import { transitionNews, type NewsDeps } from "../src/news";
import type { Caller } from "../src/users";
import type { VideoCheck } from "../src/youtube";

const project = process.env.GCLOUD_PROJECT;

const reporter: Caller = { uid: "rep1", role: "REPORTER" };
const otherReporter: Caller = { uid: "rep2", role: "REPORTER" };
const editor: Caller = { uid: "ed", role: "EDITOR" };

const VIDEO = "dQw4w9WgXcQ";

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, {
    method: "DELETE",
  });
});

function deps(check: VideoCheck = { status: "AVAILABLE", title: "Video title" }) {
  const verifyVideo = vi.fn(async () => check);
  return { verifyVideo } satisfies NewsDeps;
}

async function seedNews(status: NewsStatus, extra: Record<string, unknown> = {}) {
  await db.collection("news").doc("n1").set({
    newsId: "n1",
    headline: "जिल्ह्यात नवीन पूल वाहतुकीसाठी खुला",
    slug: "new-bridge-abcde",
    summary: "बहुप्रतिक्षित पूल आज नागरिकांसाठी खुला करण्यात आला.",
    content: "पूल ".repeat(30),
    categoryId: "local",
    districtId: "pune",
    reporterUid: "rep1",
    reporterId: "SN-R-0001",
    reporterName: "Ramesh",
    youtubeUrl: `https://youtu.be/${VIDEO}`,
    tags: [],
    status,
    isBreaking: false,
    isFeatured: false,
    viewCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...extra,
  });
}

const read = async () => (await db.collection("news").doc("n1").get()).data()!;

async function expectCode(promise: Promise<unknown>, code: HttpsError["code"]) {
  await expect(promise).rejects.toSatisfy((err) => err instanceof HttpsError && err.code === code);
}

describe("transitionNews", () => {
  it("treats null remarks (how callable clients encode undefined) as no remarks", async () => {
    await seedNews("SUBMITTED");
    await expect(transitionNews(editor, { newsId: "n1", to: "UNDER_REVIEW", remarks: null }, deps())).resolves.toMatchObject({
      status: "UNDER_REVIEW",
    });
  });

  it("lets a reporter submit their draft and verifies the video", async () => {
    await seedNews("DRAFT");
    const d = deps();
    const res = await transitionNews(reporter, { newsId: "n1", to: "SUBMITTED" }, d);

    expect(res).toMatchObject({ status: "SUBMITTED", videoStatus: "AVAILABLE" });
    expect(d.verifyVideo).toHaveBeenCalledWith(VIDEO);
    const doc = await read();
    expect(doc).toMatchObject({ status: "SUBMITTED", youtubeVideoId: VIDEO, videoStatus: "AVAILABLE", videoTitle: "Video title" });
    expect(doc.submittedAt).toBeDefined();
  });

  it("refuses to submit an incomplete article and says what is missing", async () => {
    await seedNews("DRAFT", { summary: "", categoryId: "" });
    await expect(transitionNews(reporter, { newsId: "n1", to: "SUBMITTED" }, deps())).rejects.toSatisfy(
      (err) => err instanceof HttpsError && err.code === "failed-precondition" && /Summary/.test(err.message) && /Category/.test(err.message),
    );
    expect((await read()).status).toBe("DRAFT");
  });

  it("does not let another reporter submit someone else's draft", async () => {
    await seedNews("DRAFT");
    await expectCode(transitionNews(otherReporter, { newsId: "n1", to: "SUBMITTED" }, deps()), "permission-denied");
  });

  it("never lets a reporter approve or publish", async () => {
    await seedNews("UNDER_REVIEW");
    await expectCode(transitionNews(reporter, { newsId: "n1", to: "APPROVED" }, deps()), "permission-denied");
    await seedNews("APPROVED");
    await expectCode(transitionNews(reporter, { newsId: "n1", to: "PUBLISHED" }, deps()), "permission-denied");
  });

  it("only lets editors and super admins approve and publish", async () => {
    for (const role of ["OWNER", "SOCIAL_MEDIA_MANAGER", "REPORTER"] as const) {
      await seedNews("UNDER_REVIEW");
      await expectCode(transitionNews({ uid: "x", role }, { newsId: "n1", to: "APPROVED" }, deps()), "permission-denied");
      await seedNews("APPROVED");
      await expectCode(transitionNews({ uid: "x", role }, { newsId: "n1", to: "PUBLISHED" }, deps()), "permission-denied");
    }
    await seedNews("APPROVED");
    await expect(transitionNews({ uid: "sa", role: "SUPER_ADMIN" }, { newsId: "n1", to: "PUBLISHED" }, deps())).resolves.toMatchObject({
      status: "PUBLISHED",
    });
  });

  it("rejects transitions that skip steps", async () => {
    await seedNews("DRAFT");
    await expectCode(transitionNews(editor, { newsId: "n1", to: "PUBLISHED" }, deps()), "failed-precondition");
  });

  it("takes an article through review to publication, recording each decision", async () => {
    await seedNews("SUBMITTED");
    await transitionNews(editor, { newsId: "n1", to: "UNDER_REVIEW" }, deps());
    await transitionNews(editor, { newsId: "n1", to: "APPROVED" }, deps());
    const res = await transitionNews(editor, { newsId: "n1", to: "PUBLISHED" }, deps());

    expect(res.slug).toBe("new-bridge-abcde");
    const doc = await read();
    expect(doc).toMatchObject({ status: "PUBLISHED", approvedBy: "ed", thumbnailUrl: `https://i.ytimg.com/vi/${VIDEO}/hqdefault.jpg` });
    expect(doc.publishedAt).toBeDefined();

    const reviews = await db.collection("editorialReviews").where("newsId", "==", "n1").get();
    expect(reviews.docs.map((d) => d.get("action")).sort()).toEqual(["APPROVE", "PUBLISH", "START_REVIEW"]);
    const logs = await db.collection("auditLogs").where("targetId", "==", "n1").get();
    expect(logs.size).toBe(3);
  });

  it("requires remarks to request changes and stores them for the reporter", async () => {
    await seedNews("UNDER_REVIEW");
    await expectCode(transitionNews(editor, { newsId: "n1", to: "CHANGES_REQUESTED" }, deps()), "invalid-argument");
    await transitionNews(editor, { newsId: "n1", to: "CHANGES_REQUESTED", remarks: "Add the taluka name." }, deps());
    const review = (await db.collection("editorialReviews").where("newsId", "==", "n1").get()).docs[0]!;
    expect(review.data()).toMatchObject({ action: "REQUEST_CHANGES", remarks: "Add the taluka name.", reviewerId: "ed" });
    expect((await read()).lastReview).toMatchObject({ action: "REQUEST_CHANGES", remarks: "Add the taluka name.", reviewerId: "ed" });
  });

  it("blocks publishing when the video is unavailable", async () => {
    await seedNews("APPROVED");
    await expectCode(transitionNews(editor, { newsId: "n1", to: "PUBLISHED" }, deps({ status: "UNAVAILABLE" })), "failed-precondition");
    expect((await read()).status).toBe("APPROVED");
  });

  it("publishes when YouTube cannot be reached, marking the video unverified", async () => {
    await seedNews("APPROVED");
    const res = await transitionNews(editor, { newsId: "n1", to: "PUBLISHED" }, deps({ status: "UNVERIFIED" }));
    expect(res.videoStatus).toBe("UNVERIFIED");
  });

  it("clears stale video fields when the link was removed", async () => {
    await seedNews("APPROVED", { youtubeUrl: "", youtubeVideoId: VIDEO, videoStatus: "AVAILABLE" });
    const d = deps();
    await transitionNews(editor, { newsId: "n1", to: "PUBLISHED" }, d);
    expect(d.verifyVideo).not.toHaveBeenCalled();
    const doc = await read();
    expect(doc.youtubeVideoId).toBeUndefined();
    expect(doc.videoStatus).toBeUndefined();
  });

  it("gives a published article a new slug if another article already uses it", async () => {
    await db.collection("news").doc("other").set({ slug: "new-bridge-abcde", status: "PUBLISHED" });
    await seedNews("APPROVED");
    const res = await transitionNews(editor, { newsId: "n1", to: "PUBLISHED" }, deps());
    expect(res.slug).not.toBe("new-bridge-abcde");
    expect((await read()).slug).toBe(res.slug);
  });

  it("rejects bad input", async () => {
    await expectCode(transitionNews(editor, { newsId: "n1", to: "LIVE" }, deps()), "invalid-argument");
    await expectCode(transitionNews(editor, { newsId: "missing", to: "UNDER_REVIEW" }, deps()), "not-found");
  });
});

describe("assertActiveCaller", () => {
  it("rejects suspended or unknown users", async () => {
    await db.collection("users").doc("a").set({ status: "ACTIVE" });
    await db.collection("users").doc("s").set({ status: "SUSPENDED" });
    await expect(assertActiveCaller("a")).resolves.toBeUndefined();
    await expectCode(assertActiveCaller("s"), "permission-denied");
    await expectCode(assertActiveCaller("nobody"), "permission-denied");
  });
});
