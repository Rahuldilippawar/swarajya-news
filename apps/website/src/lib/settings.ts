import "server-only";

import { APP_SETTINGS_DOC_ID, COLLECTIONS, type AppSettingsDoc } from "@swarajya/shared";
import { doc, getDoc } from "firebase/firestore/lite";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDb } from "./firebase";
import { SITE } from "./site";

export type PublicSettings = Pick<AppSettingsDoc, "channelName" | "tagline" | "contactDetails" | "socialLinks">;

const DEFAULTS: PublicSettings = { channelName: SITE.nameMarathi, contactDetails: {}, socialLinks: { youtube: SITE.social.youtube } };

const fetchSettings = unstable_cache(
  async (): Promise<PublicSettings | null> => {
    const db = getDb();
    if (!db) throw new Error("not configured");
    const snap = await getDoc(doc(db, COLLECTIONS.appSettings, APP_SETTINGS_DOC_ID));
    if (!snap.exists()) return null;
    const s = snap.data() as AppSettingsDoc;
    return { channelName: s.channelName, tagline: s.tagline, contactDetails: s.contactDetails ?? {}, socialLinks: s.socialLinks ?? {} };
  },
  ["app-settings"],
  { revalidate: 300, tags: ["settings"] },
);

/** Channel settings edited in Admin → Settings, with built-in defaults if unset or unreachable. */
export const getSettings = cache(async (): Promise<PublicSettings> => {
  try {
    return (await fetchSettings()) ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
});
