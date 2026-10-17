import { getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { db } from "../src/admin";
import { compareCounts } from "../src/restoreCheck";

describe("compareCounts", () => {
  it("reports matching and differing collections, including subcollections", async () => {
    const restored = getFirestore(getApp(), "restore-check-test");
    for (const target of [db, restored]) {
      await target.doc("rc-news/a").set({ x: 1 });
      await target.doc("rc-news/a/rc-private/notes").set({ x: 1 });
    }
    await db.doc("rc-news/b").set({ x: 2 });

    const rows = await compareCounts(db, restored, ["rc-news", "rc-private"]);
    expect(rows).toEqual([
      { collection: "rc-news", source: 2, restored: 1, ok: false },
      { collection: "rc-private", source: 1, restored: 1, ok: true },
    ]);
  });
});
