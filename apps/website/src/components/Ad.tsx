import type { AdPlacement } from "@swarajya/shared";
import { getRunningAds } from "@/lib/ads";
import { functionsOrigin } from "@/lib/firebase";
import { AdSlot } from "./AdSlot";

/** Server wrapper: renders nothing when no ad is running in this placement. */
export async function Ad({ placement, variant = "wide" }: { placement: AdPlacement; variant?: "wide" | "inline" }) {
  const ads = await getRunningAds(placement);
  if (ads.length === 0) return null;
  const origin = functionsOrigin();
  return <AdSlot ads={ads} endpoint={origin ? `${origin}/recordAdEvent` : null} variant={variant} />;
}
