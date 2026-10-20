// Runs against the Auth and Firestore emulators: `npm test -w functions`.
import { HttpsError } from "firebase-functions/v2/https";
import { beforeEach, describe, expect, it } from "vitest";
import { auth, db } from "../src/admin";
import { createStaffUser, setStaffRole, setStaffStatus, updateStaffProfile, type Caller } from "../src/users";

const project = process.env.GCLOUD_PROJECT;
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !project) {
  throw new Error("These tests must run inside `firebase emulators:exec` (npm test -w functions).");
}

const superAdmin: Caller = { uid: "sa", role: "SUPER_ADMIN" };
const owner: Caller = { uid: "owner", role: "OWNER" };
const editor: Caller = { uid: "editor", role: "EDITOR" };

beforeEach(async () => {
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${project}/accounts`, { method: "DELETE" });
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, {
    method: "DELETE",
  });
});

async function expectCode(promise: Promise<unknown>, code: HttpsError["code"]) {
  await expect(promise).rejects.toSatisfy((err) => err instanceof HttpsError && err.code === code);
}

const newReporter = (email = "rep@example.com") =>
  createStaffUser(owner, { email, fullName: "Ramesh Patil", role: "REPORTER" });

describe("createStaffUser", () => {
  it("creates a reporter with a claim, profile, reporter ID, audit log and setup link", async () => {
    const res = await newReporter("Rep@Example.com");

    expect(res.reporterId).toBe("SN-R-0001");
    expect(res.passwordSetupLink).toMatch(/^https?:\/\//);

    const user = await auth.getUser(res.uid);
    expect(user.customClaims?.role).toBe("REPORTER");
    expect(user.email).toBe("rep@example.com");

    const doc = (await db.collection("users").doc(res.uid).get()).data();
    expect(doc).toMatchObject({ role: "REPORTER", status: "ACTIVE", reporterId: "SN-R-0001", fullName: "Ramesh Patil" });

    const logs = await db.collection("auditLogs").where("targetId", "==", res.uid).get();
    expect(logs.docs.map((d) => d.get("action")).sort()).toEqual(["USER_CREATED", "USER_ROLE_SET"]);
  });

  it("issues sequential reporter IDs and none to other roles", async () => {
    await newReporter("a@example.com");
    const second = await newReporter("b@example.com");
    const ed = await createStaffUser(owner, { email: "ed@example.com", fullName: "Editor", role: "EDITOR" });
    expect(second.reporterId).toBe("SN-R-0002");
    expect(ed.reporterId).toBeNull();
  });

  it("refuses callers without users.manage", async () => {
    await expectCode(createStaffUser(editor, { email: "x@example.com", fullName: "X", role: "REPORTER" }), "permission-denied");
    await expectCode(createStaffUser({ uid: "u", role: null }, { email: "x@example.com", fullName: "X", role: "REPORTER" }), "permission-denied");
  });

  it("does not let an owner create admins or other owners", async () => {
    for (const role of ["SUPER_ADMIN", "OWNER"]) {
      await expectCode(createStaffUser(owner, { email: `${role}@example.com`, fullName: "X", role }), "permission-denied");
    }
    await expect(createStaffUser(superAdmin, { email: "o@example.com", fullName: "O", role: "OWNER" })).resolves.toBeTruthy();
  });

  it("rejects bad input and duplicate emails", async () => {
    await expectCode(createStaffUser(owner, { email: "not-an-email", fullName: "X", role: "REPORTER" }), "invalid-argument");
    await expectCode(createStaffUser(owner, { email: "x@example.com", fullName: "X", role: "KING" }), "invalid-argument");
    await expectCode(createStaffUser(owner, null), "invalid-argument");
    await newReporter();
    await expectCode(newReporter(), "already-exists");
  });

  it("only accepts existing, active locations", async () => {
    await db.collection("locations").doc("pune").set({ name: "Pune", isActive: true });
    await db.collection("locations").doc("old").set({ name: "Old", isActive: false });
    await expectCode(
      createStaffUser(owner, { email: "x@example.com", fullName: "X", role: "REPORTER", assignedLocations: ["old"] }),
      "invalid-argument",
    );
    const res = await createStaffUser(owner, { email: "y@example.com", fullName: "Y", role: "REPORTER", assignedLocations: ["pune"] });
    expect((await db.collection("users").doc(res.uid).get()).get("assignedLocations")).toEqual(["pune"]);
  });
});

describe("setStaffRole", () => {
  it("promotes a reporter to editor and keeps their reporter ID", async () => {
    const { uid } = await newReporter();
    const res = await setStaffRole(superAdmin, { uid, role: "EDITOR" });
    expect(res).toEqual({ uid, role: "EDITOR", reporterId: "SN-R-0001" });
    expect((await auth.getUser(uid)).customClaims?.role).toBe("EDITOR");
  });

  it("does not let an owner promote to, or demote from, super admin", async () => {
    const { uid } = await newReporter();
    await expectCode(setStaffRole(owner, { uid, role: "SUPER_ADMIN" }), "permission-denied");

    const admin = await createStaffUser(superAdmin, { email: "admin@example.com", fullName: "A", role: "SUPER_ADMIN" });
    await expectCode(setStaffRole(owner, { uid: admin.uid, role: "REPORTER" }), "permission-denied");
  });

  it("does not let anyone change their own role", async () => {
    const admin = await createStaffUser(superAdmin, { email: "admin@example.com", fullName: "A", role: "SUPER_ADMIN" });
    await expectCode(setStaffRole({ uid: admin.uid, role: "SUPER_ADMIN" }, { uid: admin.uid, role: "OWNER" }), "failed-precondition");
  });

  it("reports unknown users", async () => {
    await expectCode(setStaffRole(superAdmin, { uid: "missing", role: "EDITOR" }), "not-found");
  });
});

describe("setStaffStatus", () => {
  it("suspends and reactivates an account", async () => {
    const { uid } = await newReporter();

    await setStaffStatus(owner, { uid, status: "SUSPENDED" });
    expect((await auth.getUser(uid)).disabled).toBe(true);
    expect((await db.collection("users").doc(uid).get()).get("status")).toBe("SUSPENDED");

    await setStaffStatus(owner, { uid, status: "ACTIVE" });
    expect((await auth.getUser(uid)).disabled).toBe(false);
    expect((await db.collection("users").doc(uid).get()).get("status")).toBe("ACTIVE");
  });

  it("does not let an owner suspend a super admin, or anyone suspend themselves", async () => {
    const admin = await createStaffUser(superAdmin, { email: "admin@example.com", fullName: "A", role: "SUPER_ADMIN" });
    await expectCode(setStaffStatus(owner, { uid: admin.uid, status: "SUSPENDED" }), "permission-denied");
    await expectCode(setStaffStatus({ uid: admin.uid, role: "SUPER_ADMIN" }, { uid: admin.uid, status: "SUSPENDED" }), "failed-precondition");
  });
});

describe("updateStaffProfile", () => {
  it("updates the name in Auth and Firestore", async () => {
    const { uid } = await newReporter();
    await updateStaffProfile(owner, { uid, fullName: "Ramesh B. Patil" });
    expect((await auth.getUser(uid)).displayName).toBe("Ramesh B. Patil");
    expect((await db.collection("users").doc(uid).get()).get("fullName")).toBe("Ramesh B. Patil");
  });
});

describe("ID cards", () => {
  const card = async (uid: string) => {
    const cardId = (await db.collection("users").doc(uid).get()).get("cardId") as string;
    return { cardId, data: (await db.collection("idCards").doc(cardId).get()).data()! };
  };

  it("issues a card on creation with the district designation, a year's validity and no private data", async () => {
    await db.collection("locations").doc("district-dhule").set({ locationId: "district-dhule", name: "धुळे", type: "DISTRICT", isActive: true, parentLocationId: "mh" });
    const res = await createStaffUser(owner, { email: "rep@example.com", fullName: "भिमराव सैंदाणे", role: "REPORTER", assignedLocations: ["district-dhule"] });
    const { cardId, data } = await card(res.uid);

    expect(cardId).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(data).toMatchObject({ fullName: "भिमराव सैंदाणे", designation: "प्रतिनिधी धुळे जिल्हा", cardNumber: "SN-R-0001", status: "ACTIVE", photoUrl: null });
    const days = (data.validUntil.toMillis() - data.issuedAt.toMillis()) / 86_400_000;
    expect(Math.round(days)).toBe(365);
    expect(Object.keys(data)).not.toContain("email");
    expect(Object.keys(data)).not.toContain("uid");
  });

  it("shows a suspension on the card, and keeps the same card ID", async () => {
    const res = await newReporter();
    const before = await card(res.uid);
    await setStaffStatus(owner, { uid: res.uid, status: "SUSPENDED" });
    const after = await card(res.uid);
    expect(after.cardId).toBe(before.cardId);
    expect(after.data.status).toBe("SUSPENDED");
  });

  it("lets staff set only their own photo, from our Storage path", async () => {
    const res = await newReporter();
    const me: Caller = { uid: res.uid, role: "REPORTER" };
    const url = `https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/staff-photos%2F${res.uid}%2Fphoto.jpg?alt=media`;
    await updateStaffProfile(me, { uid: res.uid, photoUrl: url });
    expect((await card(res.uid)).data.photoUrl).toBe(url);

    await expectCode(updateStaffProfile(me, { uid: res.uid, photoUrl: "https://evil.example/x.jpg" }), "invalid-argument");
    await expectCode(updateStaffProfile(me, { uid: res.uid, fullName: "New name" }), "permission-denied");
    await expectCode(updateStaffProfile(me, { uid: "someone-else", photoUrl: url }), "permission-denied");
    await expectCode(
      updateStaffProfile(me, { uid: res.uid, photoUrl: url.replace(res.uid, "other") }),
      "invalid-argument",
    );
  });

  it("uses a custom designation and renews validity on request", async () => {
    const res = await newReporter();
    const first = (await card(res.uid)).data;
    await updateStaffProfile(owner, { uid: res.uid, designation: "प्रतिनिधी, साक्री तालुका", renewCard: true });
    const renewed = (await card(res.uid)).data;
    expect(renewed.designation).toBe("प्रतिनिधी, साक्री तालुका");
    expect(renewed.validUntil.toMillis()).toBeGreaterThanOrEqual(first.validUntil.toMillis());
    await updateStaffProfile(owner, { uid: res.uid, designation: "" });
    expect((await card(res.uid)).data.designation).toBe("प्रतिनिधी");
  });
});
