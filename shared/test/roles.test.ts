import { describe, expect, it } from "vitest";
import { canManageRole, formatReporterId, hasPermission, ROLES } from "../src/roles";

describe("canManageRole", () => {
  it("lets a super admin manage every role", () => {
    for (const role of ROLES) expect(canManageRole("SUPER_ADMIN", role)).toBe(true);
  });

  it("lets an owner manage staff but not admins or other owners", () => {
    expect(canManageRole("OWNER", "REPORTER")).toBe(true);
    expect(canManageRole("OWNER", "EDITOR")).toBe(true);
    expect(canManageRole("OWNER", "SOCIAL_MEDIA_MANAGER")).toBe(true);
    expect(canManageRole("OWNER", "OWNER")).toBe(false);
    expect(canManageRole("OWNER", "SUPER_ADMIN")).toBe(false);
  });

  it("gives no one else account management", () => {
    for (const actor of ["EDITOR", "REPORTER", "SOCIAL_MEDIA_MANAGER", null] as const) {
      for (const target of ROLES) expect(canManageRole(actor, target)).toBe(false);
    }
  });
});

describe("hasPermission", () => {
  it("matches canManageRole for users.manage", () => {
    for (const role of ROLES) {
      expect(hasPermission(role, "users.manage")).toBe(canManageRole(role, "REPORTER"));
    }
  });
});

it("formats reporter IDs", () => {
  expect(formatReporterId(7)).toBe("SN-R-0007");
  expect(formatReporterId(12345)).toBe("SN-R-12345");
});
