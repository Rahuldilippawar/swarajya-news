/**
 * User roles. The role is stored as a Firebase Auth custom claim (`role`) and
 * mirrored in `users/{uid}.role` for display. Security Rules and Cloud
 * Functions always read the custom claim, never the client-writable document.
 */
export const ROLES = [
  "SUPER_ADMIN",
  "OWNER",
  "EDITOR",
  "REPORTER",
  "SOCIAL_MEDIA_MANAGER",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "users.manage",
  "settings.manage",
  "taxonomy.manage",
  "ads.manage",
  "reports.view",
  "auditLogs.view",
  "news.create",
  "news.editAny",
  "news.review",
  "news.publish",
  "notifications.send",
  "whatsapp.send",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  OWNER: ["users.manage", "ads.manage", "reports.view"],
  EDITOR: [
    "news.create",
    "news.editAny",
    "news.review",
    "news.publish",
    "notifications.send",
    "whatsapp.send",
    "reports.view",
  ],
  REPORTER: ["news.create"],
  SOCIAL_MEDIA_MANAGER: ["notifications.send", "whatsapp.send"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return role != null && ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

/** Roles allowed to sign in to the Admin Panel (the Reporter Panel is for REPORTER). */
export const ADMIN_PANEL_ROLES: readonly Role[] = ["SUPER_ADMIN", "OWNER", "EDITOR", "SOCIAL_MEDIA_MANAGER"];

export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Roles an OWNER may create and manage. Only SUPER_ADMIN can manage OWNER and SUPER_ADMIN accounts. */
const OWNER_MANAGEABLE_ROLES: readonly Role[] = ["EDITOR", "REPORTER", "SOCIAL_MEDIA_MANAGER"];

/**
 * Whether `actor` may create, change or suspend an account holding `target`.
 * Callers must check this for both the account's current role and any new
 * role, so an OWNER can neither promote someone to SUPER_ADMIN nor demote one.
 */
export function canManageRole(actor: Role | null | undefined, target: Role): boolean {
  if (actor === "SUPER_ADMIN") return true;
  if (actor === "OWNER") return OWNER_MANAGEABLE_ROLES.includes(target);
  return false;
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Owner / Management",
  EDITOR: "Editor",
  REPORTER: "Reporter",
  SOCIAL_MEDIA_MANAGER: "Social Media Manager",
};

/** Reporter IDs look like SN-R-0001. */
export function formatReporterId(sequence: number): string {
  return `SN-R-${String(sequence).padStart(4, "0")}`;
}
