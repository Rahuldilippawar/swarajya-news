import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, setLogLevel, updateDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

// Denied writes are expected in these tests; keep the SDK from logging each one.
setLogLevel("silent");

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-swarajya",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") },
  });
});

afterAll(() => env.cleanup());

// Staff used throughout; each has an ACTIVE profile unless a test changes it.
const STAFF = { rep1: "REPORTER", rep2: "REPORTER", ed: "EDITOR", sa: "SUPER_ADMIN" } as const;

beforeEach(async () => {
  await env.clearFirestore();
  for (const [uid, role] of Object.entries(STAFF)) await seed(`users/${uid}`, { uid, role, status: "ACTIVE" });
});

const as = (uid: string, role?: string) => env.authenticatedContext(uid, role ? { role } : {}).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const draft = (id: string, reporterUid: string) => ({
  newsId: id,
  headline: "जिल्ह्यात नवीन पूल वाहतुकीसाठी खुला",
  summary: "",
  content: "",
  categoryId: "",
  districtId: "",
  reporterUid,
  reporterId: "R-001",
  reporterName: "Reporter",
  tags: [],
  status: "DRAFT",
  isBreaking: false,
  isFeatured: false,
  viewCount: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));
}

describe("news", () => {
  it("lets a reporter create their own draft", async () => {
    await assertSucceeds(setDoc(doc(as("rep1", "REPORTER"), "news/n1"), draft("n1", "rep1")));
  });

  it("blocks creating a draft for another reporter, or with a non-draft status", async () => {
    await assertFails(setDoc(doc(as("rep1", "REPORTER"), "news/n1"), draft("n1", "rep2")));
    await assertFails(setDoc(doc(as("rep1", "REPORTER"), "news/n1"), { ...draft("n1", "rep1"), status: "PUBLISHED" }));
  });

  it("blocks reporters from marking their own news as breaking", async () => {
    await assertFails(setDoc(doc(as("rep1", "REPORTER"), "news/n1"), { ...draft("n1", "rep1"), isBreaking: true }));
  });

  it("blocks users without a role from creating news", async () => {
    await assertFails(setDoc(doc(as("u1"), "news/n1"), draft("n1", "u1")));
    await assertFails(setDoc(doc(anon(), "news/n1"), draft("n1", "x")));
  });

  it("keeps drafts private and published news public", async () => {
    await seed("news/d", { ...draft("d", "rep1"), status: "DRAFT" });
    await seed("news/p", { ...draft("p", "rep1"), status: "PUBLISHED" });

    await assertFails(getDoc(doc(anon(), "news/d")));
    await assertFails(getDoc(doc(as("rep2", "REPORTER"), "news/d")));
    await assertSucceeds(getDoc(doc(as("rep1", "REPORTER"), "news/d")));
    await assertSucceeds(getDoc(doc(as("ed", "EDITOR"), "news/d")));
    await assertSucceeds(getDoc(doc(anon(), "news/p")));
  });

  it("never lets a client change the status — not even an editor or super admin", async () => {
    await seed("news/n", { ...draft("n", "rep1"), status: "UNDER_REVIEW" });
    for (const db of [as("rep1", "REPORTER"), as("ed", "EDITOR"), as("sa", "SUPER_ADMIN")]) {
      await assertFails(updateDoc(doc(db, "news/n"), { status: "PUBLISHED", updatedAt: serverTimestamp() }));
    }
  });

  it("lets the author edit content only while DRAFT or CHANGES_REQUESTED", async () => {
    await seed("news/a", { ...draft("a", "rep1"), status: "CHANGES_REQUESTED" });
    await seed("news/b", { ...draft("b", "rep1"), status: "SUBMITTED" });
    const db = as("rep1", "REPORTER");

    await assertSucceeds(updateDoc(doc(db, "news/a"), { summary: "Corrected", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "news/b"), { summary: "Sneaky edit", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "news/a"), { isFeatured: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "news/a"), { viewCount: 999, updatedAt: serverTimestamp() }));
  });

  it("lets an editor feature an article but not touch approval fields", async () => {
    await seed("news/n", { ...draft("n", "rep1"), status: "PUBLISHED" });
    const db = as("ed", "EDITOR");
    await assertSucceeds(updateDoc(doc(db, "news/n"), { isFeatured: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "news/n"), { approvedBy: "ed", updatedAt: serverTimestamp() }));
  });

  it("rejects malformed YouTube IDs", async () => {
    await assertFails(
      setDoc(doc(as("rep1", "REPORTER"), "news/n1"), { ...draft("n1", "rep1"), youtubeVideoId: "../../evil" }),
    );
  });

  it("lets the author delete only their own drafts", async () => {
    await seed("news/d", draft("d", "rep1"));
    await seed("news/s", { ...draft("s", "rep1"), status: "SUBMITTED" });
    await assertFails(deleteDoc(doc(as("rep2", "REPORTER"), "news/d")));
    await assertFails(deleteDoc(doc(as("rep1", "REPORTER"), "news/s")));
    await assertSucceeds(deleteDoc(doc(as("rep1", "REPORTER"), "news/d")));
  });
});

describe("suspended staff", () => {
  it("cannot write even while their old token still carries a role", async () => {
    await seed("news/d", draft("d", "rep1"));
    await seed("users/rep1", { uid: "rep1", role: "REPORTER", status: "SUSPENDED" });
    const db = as("rep1", "REPORTER");

    await assertFails(setDoc(doc(db, "news/n2"), draft("n2", "rep1")));
    await assertFails(updateDoc(doc(db, "news/d"), { summary: "x", updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, "news/d")));
  });

  it("blocks a suspended super admin from editing categories", async () => {
    await seed("users/sa", { uid: "sa", role: "SUPER_ADMIN", status: "SUSPENDED" });
    await assertFails(setDoc(doc(as("sa", "SUPER_ADMIN"), "categories/c"), { name: "Politics", isActive: true }));
  });

  it("blocks staff whose profile document is missing", async () => {
    await assertFails(setDoc(doc(as("ghost", "REPORTER"), "news/n"), draft("n", "ghost")));
  });
});

describe("users and roles", () => {
  it("never lets a client write a user document (no self-promotion)", async () => {
    await assertFails(updateDoc(doc(as("rep1", "REPORTER"), "users/rep1"), { role: "SUPER_ADMIN" }));
    await assertFails(setDoc(doc(as("x"), "users/x"), { uid: "x", role: "SUPER_ADMIN" }));
  });

  it("lets users read their own profile but not others'", async () => {
    await assertSucceeds(getDoc(doc(as("rep1", "REPORTER"), "users/rep1")));
    await assertFails(getDoc(doc(as("rep1", "REPORTER"), "users/rep2")));
  });

  it("never exposes the server-side counters", async () => {
    await seed("counters/reporterId", { next: 5 });
    await assertFails(getDoc(doc(as("sa", "SUPER_ADMIN"), "counters/reporterId")));
    await assertFails(setDoc(doc(as("sa", "SUPER_ADMIN"), "counters/reporterId"), { next: 1 }));
  });
});

describe("restricted collections", () => {
  it("hides editorial reviews from other reporters", async () => {
    await seed("news/n", draft("n", "rep1"));
    await seed("editorialReviews/r", { newsId: "n", action: "REQUEST_CHANGES", remarks: "Add the taluka" });
    await assertSucceeds(getDoc(doc(as("rep1", "REPORTER"), "editorialReviews/r")));
    await assertFails(getDoc(doc(as("rep2", "REPORTER"), "editorialReviews/r")));
  });

  it("restricts audit logs to super admins", async () => {
    await seed("auditLogs/l", { action: "X" });
    await assertFails(getDoc(doc(as("ed", "EDITOR"), "auditLogs/l")));
    await assertSucceeds(getDoc(doc(as("sa", "SUPER_ADMIN"), "auditLogs/l")));
    await assertFails(setDoc(doc(as("sa", "SUPER_ADMIN"), "auditLogs/m"), { action: "forged" }));
  });

  it("only lets super admins edit categories", async () => {
    await assertFails(setDoc(doc(as("ed", "EDITOR"), "categories/c"), { name: "Politics", isActive: true }));
    await assertSucceeds(setDoc(doc(as("sa", "SUPER_ADMIN"), "categories/c"), { name: "Politics", isActive: true }));
    await assertSucceeds(getDoc(doc(anon(), "categories/c")));
  });
});
