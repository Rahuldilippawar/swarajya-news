// Runs against the Firestore emulator: `npm test -w functions`.
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/admin";
import { recordView } from "../src/views";

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents`, {
    method: "DELETE",
  });
});

describe("recordView", () => {
  it("counts views of published articles", async () => {
    await db.doc("news/p").set({ status: "PUBLISHED", viewCount: 4 });
    expect(await recordView("p")).toBe("counted");
    expect(await recordView("p")).toBe("counted");
    expect((await db.doc("news/p").get()).get("viewCount")).toBe(6);
  });

  it("ignores drafts, unknown IDs and malformed input", async () => {
    await db.doc("news/d").set({ status: "DRAFT", viewCount: 0 });
    expect(await recordView("d")).toBe("ignored");
    expect((await db.doc("news/d").get()).get("viewCount")).toBe(0);
    expect(await recordView("missing")).toBe("ignored");
    expect(await recordView("../users/x")).toBe("ignored");
    expect(await recordView({ $gt: "" })).toBe("ignored");
    expect(await recordView(undefined)).toBe("ignored");
  });
});
