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
