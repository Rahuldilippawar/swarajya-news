import "server-only";

import { COLLECTIONS, type AdPlacement, type AdvertisementDoc } from "@swarajya/shared";
import { collection, getDocs, query, where } from "firebase/firestore/lite";
import { unstable_cache } from "next/cache";
import { getDb } from "./firebase";

export interface PublicAd {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  startAt: string;
  endAt: string;
}

const fetchAds = unstable_cache(
  async (placement: AdPlacement): Promise<PublicAd[]> => {
    const db = getDb();
    if (!db) throw new Error("not configured");
    // The public may only read active ads, so the query must ask for exactly that.
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.advertisements), where("isActive", "==", true), where("placement", "==", placement)),
    );
    return snap.docs.map((d) => {
      const a = d.data() as AdvertisementDoc;
      return {
        id: a.advertisementId,
        title: a.title,
        imageUrl: a.imageUrl,
        targetUrl: a.targetUrl,
        startAt: a.startAt.toDate().toISOString(),
        endAt: a.endAt.toDate().toISOString(),
      };
    });
  },
  ["ads"],
  { revalidate: 60, tags: ["ads"] },
);

/** Ads running now in a placement. Schedules are checked on every request, so cached lists never show an expired ad. */
export async function getRunningAds(placement: AdPlacement): Promise<PublicAd[]> {
  try {
    const now = new Date();
    return (await fetchAds(placement)).filter((a) => new Date(a.startAt) <= now && now < new Date(a.endAt));
  } catch {
    return [];
  }
}
