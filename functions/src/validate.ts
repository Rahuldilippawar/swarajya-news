import { HttpsError } from "firebase-functions/v2/https";
import { isRole, USER_STATUSES, type Role, type UserStatus } from "@swarajya/shared";

// Hand-written validators for callable payloads. Every field is checked here
// because the client is never trusted.

type Payload = Record<string, unknown>;

export function asPayload(data: unknown): Payload {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new HttpsError("invalid-argument", "Request body must be an object.");
  }
  return data as Payload;
}

export function requireString(data: Payload, key: string, { min = 1, max = 200 } = {}): string {
  const value = data[key];
  if (typeof value !== "string") throw new HttpsError("invalid-argument", `${key} is required.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpsError("invalid-argument", `${key} must be ${min}–${max} characters.`);
  }
  return trimmed;
}

/** Absent, undefined and null (what callable clients send for `undefined`) all mean "not provided". */
export function optionalString(data: Payload, key: string, opts?: { min?: number; max?: number }): string | undefined {
  return data[key] == null ? undefined : requireString(data, key, opts);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(data: Payload, key = "email"): string {
  const email = requireString(data, key, { max: 254 }).toLowerCase();
  if (!EMAIL.test(email)) throw new HttpsError("invalid-argument", `${key} is not a valid email address.`);
  return email;
}

export function requireRole(data: Payload, key = "role"): Role {
  const value = data[key];
  if (!isRole(value)) throw new HttpsError("invalid-argument", `${key} is not a valid role.`);
  return value;
}

export function requireStatus(data: Payload, key = "status"): UserStatus {
  const value = data[key];
  if (typeof value !== "string" || !(USER_STATUSES as readonly string[]).includes(value)) {
    throw new HttpsError("invalid-argument", `${key} must be one of ${USER_STATUSES.join(", ")}.`);
  }
  return value as UserStatus;
}

export function optionalIdList(data: Payload, key: string, maxItems = 20): string[] | undefined {
  const value = data[key];
  if (value == null) return undefined;
  if (!Array.isArray(value) || value.length > maxItems || value.some((v) => typeof v !== "string" || !/^[\w-]{1,128}$/.test(v))) {
    throw new HttpsError("invalid-argument", `${key} must be a list of at most ${maxItems} IDs.`);
  }
  return [...new Set(value as string[])];
}
