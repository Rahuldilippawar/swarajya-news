import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, setLogLevel, Timestamp, updateDoc, where } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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

  it("does not let a published article's video be swapped without re-verification", async () => {
    await seed("news/p", { ...draft("p", "rep1"), status: "PUBLISHED", youtubeVideoId: "dQw4w9WgXcQ" });
    await assertFails(updateDoc(doc(as("ed", "EDITOR"), "news/p"), { youtubeVideoId: "aaaaaaaaaaa", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as("ed", "EDITOR"), "news/p"), { headline: "Corrected headline", updatedAt: serverTimestamp() }));
  });

  it("only accepts https thumbnails (plus the local Storage emulator)", async () => {
    const db = as("rep1", "REPORTER");
    await assertFails(setDoc(doc(db, "news/a"), { ...draft("a", "rep1"), thumbnailUrl: "http://evil.example/a.jpg" }));
    await assertFails(setDoc(doc(db, "news/b"), { ...draft("b", "rep1"), thumbnailUrl: "http://127.0.0.1.evil.example/a.jpg" }));
    await assertSucceeds(setDoc(doc(db, "news/c"), { ...draft("c", "rep1"), thumbnailUrl: "https://firebasestorage.googleapis.com/a.jpg" }));
    await assertSucceeds(setDoc(doc(db, "news/d"), { ...draft("d", "rep1"), thumbnailUrl: "http://127.0.0.1:9199/v0/b/x/o/a.jpg" }));
  });

  it("only accepts URL-safe slugs", async () => {
    const db = as("rep1", "REPORTER");
    for (const slug of ["a/b", "x?y", "x#y", "../x", "a b", "<x>", "-a", "a--b"]) {
      await assertFails(setDoc(doc(db, `news/s${slug.length}`), { ...draft(`s${slug.length}`, "rep1"), slug }));
    }
    await assertSucceeds(setDoc(doc(db, "news/ok"), { ...draft("ok", "rep1"), slug: "पुण्यात-पाऊस-k3x9a" }));
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

describe("public website queries (anonymous)", () => {
  it("can list published news but nothing else", async () => {
    await seed("news/p", { ...draft("p", "rep1"), status: "PUBLISHED" });
    await seed("news/d", draft("d", "rep1"));
    const db = anon();
    const published = await assertSucceeds(getDocs(query(collection(db, "news"), where("status", "==", "PUBLISHED"))));
    if (published.size !== 1) throw new Error(`expected 1 published article, got ${published.size}`);
    await assertSucceeds(getDocs(query(collection(db, "news"), where("status", "==", "PUBLISHED"), where("slug", "==", "x"))));
    await assertFails(getDocs(collection(db, "news")));
    await assertFails(getDocs(query(collection(db, "news"), where("status", "==", "DRAFT"))));
  });

  it("can list active categories and locations only when the query says so", async () => {
    await seed("categories/a", { categoryId: "a", slug: "a", name: "A", isActive: true, displayOrder: 1 });
    await seed("locations/pune", { locationId: "pune", type: "DISTRICT", isActive: true, name: "पुणे", parentLocationId: "mh" });
    const db = anon();
    await assertSucceeds(getDocs(query(collection(db, "categories"), where("isActive", "==", true), orderBy("displayOrder"))));
    await assertSucceeds(
      getDocs(query(collection(db, "locations"), where("type", "==", "DISTRICT"), where("isActive", "==", true), orderBy("name"))),
    );
    await assertFails(getDocs(collection(db, "categories")));
    await assertFails(getDocs(query(collection(db, "locations"), where("type", "==", "DISTRICT"))));
  });
});

describe("reporter workflow", () => {
  it("lets a reporter list only their own news", async () => {
    await seed("news/mine", draft("mine", "rep1"));
    const db = as("rep1", "REPORTER");
    await assertSucceeds(getDocs(query(collection(db, "news"), where("reporterUid", "==", "rep1"))));
    await assertFails(getDocs(query(collection(db, "news"), where("reporterUid", "==", "rep2"))));
    await assertFails(getDocs(collection(db, "news")));
  });

  it("lets a reporter read the review history of their own article only", async () => {
    await seed("news/n", draft("n", "rep1"));
    await seed("editorialReviews/r", { newsId: "n", action: "REQUEST_CHANGES", remarks: "x" });
    await assertSucceeds(getDocs(query(collection(as("rep1", "REPORTER"), "editorialReviews"), where("newsId", "==", "n"))));
    await assertFails(getDocs(query(collection(as("rep2", "REPORTER"), "editorialReviews"), where("newsId", "==", "n"))));
  });

  it("accepts an event time but not lastReview from clients", async () => {
    const db = as("rep1", "REPORTER");
    await assertSucceeds(setDoc(doc(db, "news/a"), { ...draft("a", "rep1"), eventAt: Timestamp.now() }));
    await assertFails(setDoc(doc(db, "news/b"), { ...draft("b", "rep1"), eventAt: "yesterday" }));
    await assertFails(updateDoc(doc(db, "news/a"), { lastReview: { action: "APPROVE" }, updatedAt: serverTimestamp() }));
  });
});

const notes = (text: string) => ({ notes: text, updatedAt: serverTimestamp() });

describe("private source notes", () => {
  it("are readable by the author and editors, never the public — even after publication", async () => {
    await seed("news/p", { ...draft("p", "rep1"), status: "PUBLISHED" });
    await seed("news/p/private/sourceNotes", { notes: "Informant: …" });
    await assertSucceeds(getDoc(doc(as("rep1", "REPORTER"), "news/p/private/sourceNotes")));
    await assertSucceeds(getDoc(doc(as("ed", "EDITOR"), "news/p/private/sourceNotes")));
    await assertFails(getDoc(doc(as("rep2", "REPORTER"), "news/p/private/sourceNotes")));
    await assertFails(getDoc(doc(anon(), "news/p/private/sourceNotes")));
  });

  it("can be written by the author only while the article is editable by them", async () => {
    await seed("news/d", draft("d", "rep1"));
    await seed("news/s", { ...draft("s", "rep1"), status: "SUBMITTED" });
    const db = as("rep1", "REPORTER");
    await assertSucceeds(setDoc(doc(db, "news/d/private/sourceNotes"), notes("Spoke to the sarpanch")));
    await assertFails(setDoc(doc(db, "news/s/private/sourceNotes"), notes("late edit")));
    await assertFails(setDoc(doc(as("rep2", "REPORTER"), "news/d/private/sourceNotes"), notes("not mine")));
    await assertFails(setDoc(doc(db, "news/d/private/other"), notes("wrong doc")));
    await assertSucceeds(setDoc(doc(as("ed", "EDITOR"), "news/s/private/sourceNotes"), notes("editor note")));
  });
});

describe("whatsapp data", () => {
  it("keeps subscriber phone numbers away from reporters, owners and the public", async () => {
    await seed("users/smm", { uid: "smm", role: "SOCIAL_MEDIA_MANAGER", status: "ACTIVE" });
    await seed("whatsappSubscribers/919876543210", { phone: "+919876543210", status: "SUBSCRIBED" });
    await assertSucceeds(getDoc(doc(as("smm", "SOCIAL_MEDIA_MANAGER"), "whatsappSubscribers/919876543210")));
    await assertSucceeds(getDoc(doc(as("ed", "EDITOR"), "whatsappSubscribers/919876543210")));
    await assertFails(getDoc(doc(as("rep1", "REPORTER"), "whatsappSubscribers/919876543210")));
    await assertFails(getDoc(doc(anon(), "whatsappSubscribers/919876543210")));
    await assertFails(setDoc(doc(as("smm", "SOCIAL_MEDIA_MANAGER"), "whatsappSubscribers/1"), { phone: "+1", status: "SUBSCRIBED" }));
  });

  it("lets distribution staff read bulletin recipients but nobody read the delivery pointers", async () => {
    await seed("whatsappMessages/p__ALL/recipients/91", { status: "FAILED" });
    await seed("whatsappDeliveries/wamid.1", { jobId: "p__ALL" });
    await assertSucceeds(getDoc(doc(as("ed", "EDITOR"), "whatsappMessages/p__ALL/recipients/91")));
    await assertFails(getDoc(doc(as("rep1", "REPORTER"), "whatsappMessages/p__ALL/recipients/91")));
    await assertFails(getDoc(doc(as("sa", "SUPER_ADMIN"), "whatsappDeliveries/wamid.1")));
  });
});

const ad = (extra: Record<string, unknown> = {}) => ({
  advertisementId: "ad1",
  title: "दिवाळी ऑफर",
  imageUrl: "https://firebasestorage.googleapis.com/ads/a.jpg",
  targetUrl: "https://shop.example/diwali",
  placement: "HOME_TOP",
  startAt: Timestamp.fromDate(new Date("2026-10-01")),
  endAt: Timestamp.fromDate(new Date("2026-11-01")),
  isActive: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

describe("advertisements", () => {
  beforeEach(() => seed("users/owner", { uid: "owner", role: "OWNER", status: "ACTIVE" }));

  it("lets the owner create valid ads and the public read active ones", async () => {
    await assertSucceeds(setDoc(doc(as("owner", "OWNER"), "advertisements/ad1"), ad()));
    await assertSucceeds(getDoc(doc(anon(), "advertisements/ad1")));
    await assertFails(setDoc(doc(as("ed", "EDITOR"), "advertisements/ad2"), ad({ advertisementId: "ad2" })));
  });

  it("rejects unsafe links, bad dates and forged counters", async () => {
    const db = as("owner", "OWNER");
    await assertFails(setDoc(doc(db, "advertisements/ad1"), ad({ targetUrl: "javascript:alert(1)" })));
    await assertFails(setDoc(doc(db, "advertisements/ad1"), ad({ targetUrl: "http://plain.example" })));
    await assertFails(setDoc(doc(db, "advertisements/ad1"), ad({ endAt: Timestamp.fromDate(new Date("2026-09-01")) })));
    await assertFails(setDoc(doc(db, "advertisements/ad1"), ad({ placement: "POPUP" })));
    await assertFails(setDoc(doc(db, "advertisements/ad1"), ad({ clicks: 1000 })));
    await seed("advertisements/ad9", { ...ad({ advertisementId: "ad9" }), impressions: 5 });
    await assertFails(updateDoc(doc(db, "advertisements/ad9"), { impressions: 9999, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, "advertisements/ad9"), { isActive: false, updatedAt: serverTimestamp() }));
  });

  it("hides inactive ads and daily stats from the public", async () => {
    await seed("advertisements/off", { ...ad({ advertisementId: "off" }), isActive: false });
    await seed("advertisements/off/daily/2026-10-17", { clicks: 3 });
    await assertFails(getDoc(doc(anon(), "advertisements/off")));
    await assertFails(getDoc(doc(anon(), "advertisements/off/daily/2026-10-17")));
    await assertSucceeds(getDoc(doc(as("owner", "OWNER"), "advertisements/off/daily/2026-10-17")));
  });
});

describe("app settings", () => {
  const settings = (extra: Record<string, unknown> = {}) => ({
    channelName: "स्वराज्य न्यूज",
    contactDetails: { phone: "+91 98765 43210", email: "news@example.com" },
    socialLinks: { youtube: "https://www.youtube.com/@swarajyanews2025" },
    updatedBy: "sa",
    updatedAt: serverTimestamp(),
    ...extra,
  });

  it("lets only the super admin write valid settings, and anyone read them", async () => {
    await assertSucceeds(setDoc(doc(as("sa", "SUPER_ADMIN"), "appSettings/public"), settings()));
    await assertSucceeds(getDoc(doc(anon(), "appSettings/public")));
    await assertFails(setDoc(doc(as("ed", "EDITOR"), "appSettings/public"), settings({ updatedBy: "ed" })));
    await assertFails(setDoc(doc(as("sa", "SUPER_ADMIN"), "appSettings/public"), settings({ socialLinks: { youtube: "javascript:alert(1)" } })));
    await assertFails(setDoc(doc(as("sa", "SUPER_ADMIN"), "appSettings/other"), settings()));
    await assertFails(setDoc(doc(as("sa", "SUPER_ADMIN"), "appSettings/public"), settings({ hacked: true })));
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
    await assertFails(setDoc(doc(as("sa", "SUPER_ADMIN"), "categories/c"), category("c")));
  });

  it("cannot read unpublished news, staff records or audit logs either", async () => {
    await seed("news/d", draft("d", "rep1"));
    await seed("auditLogs/a", { action: "x" });
    await seed("users/ed", { uid: "ed", role: "EDITOR", status: "SUSPENDED" });
    await seed("users/sa", { uid: "sa", role: "SUPER_ADMIN", status: "SUSPENDED" });
    await assertFails(getDoc(doc(as("ed", "EDITOR"), "news/d")));
    await assertFails(getDoc(doc(as("ed", "EDITOR"), "users/rep1")));
    await assertSucceeds(getDoc(doc(as("ed", "EDITOR"), "users/ed")));
    await assertFails(getDoc(doc(as("sa", "SUPER_ADMIN"), "auditLogs/a")));
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

});

const category = (id: string, extra: Record<string, unknown> = {}) => ({
  categoryId: id,
  slug: id,
  name: "राजकारण",
  isActive: true,
  displayOrder: 1,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});

describe("categories", () => {
  it("only lets super admins create them, and anyone read active ones", async () => {
    await assertFails(setDoc(doc(as("ed", "EDITOR"), "categories/politics"), category("politics")));
    await assertSucceeds(setDoc(doc(as("sa", "SUPER_ADMIN"), "categories/politics"), category("politics")));
    await assertSucceeds(getDoc(doc(anon(), "categories/politics")));
  });

  it("requires the slug to equal the document ID and never changes it", async () => {
    const db = as("sa", "SUPER_ADMIN");
    await assertFails(setDoc(doc(db, "categories/politics"), category("politics", { slug: "other" })));
    await assertFails(setDoc(doc(db, "categories/a b"), category("a b")));
    await seed("categories/crime", { categoryId: "crime", slug: "crime", name: "गुन्हे", isActive: true, displayOrder: 2 });
    await assertSucceeds(updateDoc(doc(db, "categories/crime"), { name: "गुन्हेगारी", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "categories/crime"), { slug: "crimes", updatedAt: serverTimestamp() }));
  });

  it("rejects unknown fields and wrong types", async () => {
    const db = as("sa", "SUPER_ADMIN");
    await assertFails(setDoc(doc(db, "categories/x"), category("x", { hacked: true })));
    await assertFails(setDoc(doc(db, "categories/x"), category("x", { displayOrder: "1" })));
  });

  it("hides inactive categories from the public", async () => {
    await seed("categories/old", { categoryId: "old", slug: "old", name: "Old", isActive: false, displayOrder: 9 });
    await assertFails(getDoc(doc(anon(), "categories/old")));
  });
});

const location = (id: string, type: string, parentLocationId: string | null) => ({
  locationId: id,
  name: id,
  slug: id,
  type,
  parentLocationId,
  isActive: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

describe("locations", () => {
  it("enforces the state → district → taluka → village hierarchy", async () => {
    const db = as("sa", "SUPER_ADMIN");
    await assertSucceeds(setDoc(doc(db, "locations/mh"), location("mh", "STATE", null)));
    await assertSucceeds(setDoc(doc(db, "locations/pune"), location("pune", "DISTRICT", "mh")));
    await assertSucceeds(setDoc(doc(db, "locations/haveli"), location("haveli", "TALUKA", "pune")));
    await assertSucceeds(setDoc(doc(db, "locations/wagholi"), location("wagholi", "VILLAGE", "haveli")));

    await assertFails(setDoc(doc(db, "locations/bad1"), location("bad1", "VILLAGE", "pune")));
    await assertFails(setDoc(doc(db, "locations/bad2"), location("bad2", "DISTRICT", null)));
    await assertFails(setDoc(doc(db, "locations/bad3"), location("bad3", "STATE", "mh")));
    await assertFails(setDoc(doc(db, "locations/bad4"), location("bad4", "TALUKA", "missing")));
  });

  it("does not let a location be moved or retyped", async () => {
    await seed("locations/mh", { locationId: "mh", type: "STATE", parentLocationId: null, name: "MH", slug: "mh", isActive: true });
    await seed("locations/pune", { locationId: "pune", type: "DISTRICT", parentLocationId: "mh", name: "Pune", slug: "pune", isActive: true });
    const db = as("sa", "SUPER_ADMIN");
    await assertSucceeds(updateDoc(doc(db, "locations/pune"), { isActive: false, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "locations/pune"), { type: "TALUKA", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "locations/pune"), { parentLocationId: "x", updatedAt: serverTimestamp() }));
  });

  it("only lets super admins write locations", async () => {
    await assertFails(setDoc(doc(as("ed", "EDITOR"), "locations/mh"), location("mh", "STATE", null)));
  });
});

// One row per role: what each may read or write directly from a client. Status
// changes, user management and sending go through Cloud Functions and are
// covered by the functions tests; docs/SECURITY.md lists the full matrix.
describe("role matrix", () => {
  const ROLES = ["SUPER_ADMIN", "OWNER", "EDITOR", "REPORTER", "SOCIAL_MEDIA_MANAGER", "NONE"] as const;
  type Role = (typeof ROLES)[number];
  const allowed: Record<string, Role[]> = {
    "read another reporter's draft": ["SUPER_ADMIN", "EDITOR"],
    "create news": ["SUPER_ADMIN", "EDITOR", "REPORTER"],
    "edit any news": ["SUPER_ADMIN", "EDITOR"],
    "read staff profiles": ["SUPER_ADMIN", "OWNER", "EDITOR"],
    "create a category": ["SUPER_ADMIN"],
    "write settings": ["SUPER_ADMIN"],
    "create an ad": ["SUPER_ADMIN", "OWNER"],
    "read ad stats": ["SUPER_ADMIN", "OWNER"],
    "read WhatsApp subscribers": ["SUPER_ADMIN", "EDITOR", "SOCIAL_MEDIA_MANAGER"],
    "read notification jobs": ["SUPER_ADMIN", "EDITOR", "SOCIAL_MEDIA_MANAGER"],
    "read audit logs": ["SUPER_ADMIN"],
  };
  const ops = (db: ReturnType<typeof as>, uid: string): Record<string, () => Promise<unknown>> => ({
    "read another reporter's draft": () => getDoc(doc(db, "news/other")),
    "create news": () => setDoc(doc(db, `news/new-${uid}`), draft(`new-${uid}`, uid)),
    "edit any news": () => updateDoc(doc(db, "news/other"), { summary: "edited", updatedAt: serverTimestamp() }),
    "read staff profiles": () => getDoc(doc(db, "users/target")),
    "create a category": () => setDoc(doc(db, "categories/matrix"), category("matrix")),
    "write settings": () =>
      setDoc(doc(db, "appSettings/public"), { channelName: "स्वराज्य न्यूज", contactDetails: {}, socialLinks: {}, updatedBy: uid, updatedAt: serverTimestamp() }),
    "create an ad": () => setDoc(doc(db, "advertisements/matrix"), ad({ advertisementId: "matrix" })),
    "read ad stats": () => getDoc(doc(db, "advertisements/off/daily/2026-10-17")),
    "read WhatsApp subscribers": () => getDoc(doc(db, "whatsappSubscribers/919876543210")),
    "read notification jobs": () => getDoc(doc(db, "notifications/job")),
    "read audit logs": () => getDoc(doc(db, "auditLogs/a")),
  });

  for (const role of ROLES) {
    it(role, async () => {
      const uid = `m-${role.toLowerCase()}`;
      if (role !== "NONE") await seed(`users/${uid}`, { uid, role, status: "ACTIVE" });
      await seed("users/target", { uid: "target", role: "REPORTER", status: "ACTIVE" });
      await seed("news/other", { ...draft("other", "rep2"), status: "DRAFT" });
      await seed("advertisements/off", { ...ad({ advertisementId: "off" }), isActive: false });
      await seed("advertisements/off/daily/2026-10-17", { impressions: 1 });
      await seed("whatsappSubscribers/919876543210", { phone: "919876543210" });
      await seed("notifications/job", { status: "SENT" });
      await seed("auditLogs/a", { action: "x" });

      const db = role === "NONE" ? as(uid) : as(uid, role);
      const mismatches: string[] = [];
      for (const [name, run] of Object.entries(ops(db, uid))) {
        const expectAllowed = allowed[name]!.includes(role);
        try {
          await (expectAllowed ? assertSucceeds(run()) : assertFails(run()));
        } catch {
          mismatches.push(`${name}: expected ${expectAllowed ? "allowed" : "denied"}`);
        }
      }
      expect(mismatches).toEqual([]);
    });
  }
});
