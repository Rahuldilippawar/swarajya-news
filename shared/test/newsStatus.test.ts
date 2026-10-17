import { describe, expect, it } from "vitest";
import { canTransition, nextStatuses } from "../src/newsStatus";

describe("editorial workflow", () => {
  it("lets a reporter submit their own draft", () => {
    expect(canTransition("DRAFT", "SUBMITTED", { role: "REPORTER", isAuthor: true }).ok).toBe(true);
  });

  it("does not let a reporter submit someone else's draft", () => {
    expect(canTransition("DRAFT", "SUBMITTED", { role: "REPORTER", isAuthor: false }).ok).toBe(false);
  });

  it("lets a reporter resubmit after changes were requested", () => {
    expect(canTransition("CHANGES_REQUESTED", "SUBMITTED", { role: "REPORTER", isAuthor: true }).ok).toBe(true);
  });

  it.each([
    ["SUBMITTED", "UNDER_REVIEW"],
    ["UNDER_REVIEW", "APPROVED"],
    ["APPROVED", "PUBLISHED"],
    ["PUBLISHED", "ARCHIVED"],
  ] as const)("never lets a reporter move their own news %s → %s", (from, to) => {
    expect(canTransition(from, to, { role: "REPORTER", isAuthor: true }).ok).toBe(false);
  });

  it("lets an editor approve and publish", () => {
    expect(canTransition("UNDER_REVIEW", "APPROVED", { role: "EDITOR", isAuthor: false }).ok).toBe(true);
    expect(canTransition("APPROVED", "PUBLISHED", { role: "EDITOR", isAuthor: false }).ok).toBe(true);
  });

  it("requires remarks to reject or request changes", () => {
    expect(canTransition("UNDER_REVIEW", "REJECTED", { role: "EDITOR", isAuthor: false }).ok).toBe(false);
    expect(
      canTransition("UNDER_REVIEW", "CHANGES_REQUESTED", { role: "EDITOR", isAuthor: false, remarks: "Add the taluka" }).ok,
    ).toBe(true);
  });

  it("blocks transitions that skip review", () => {
    expect(canTransition("DRAFT", "PUBLISHED", { role: "SUPER_ADMIN", isAuthor: false }).ok).toBe(false);
    expect(canTransition("REJECTED", "PUBLISHED", { role: "SUPER_ADMIN", isAuthor: false }).ok).toBe(false);
  });

  it("does not give OWNER or SOCIAL_MEDIA_MANAGER editorial powers", () => {
    for (const role of ["OWNER", "SOCIAL_MEDIA_MANAGER"] as const) {
      expect(canTransition("APPROVED", "PUBLISHED", { role, isAuthor: false }).ok).toBe(false);
    }
  });

  it("lists next statuses", () => {
    expect(nextStatuses("UNDER_REVIEW").sort()).toEqual(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]);
    expect(nextStatuses("REJECTED")).toEqual([]);
  });
});
