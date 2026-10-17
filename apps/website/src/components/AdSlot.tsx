"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicAd } from "@/lib/ads";

/** Ads already counted on this page view; survives React re-mounts (e.g. Strict Mode in development). */
const countedThisView = new Set<string>();

function beacon(endpoint: string | null, adId: string, type: "impression" | "click") {
  if (!endpoint) return;
  // text/plain avoids a CORS preflight; the function parses the JSON body.
  const body = JSON.stringify({ adId, type });
  if (!navigator.sendBeacon?.(endpoint, new Blob([body], { type: "text/plain" }))) {
    void fetch(endpoint, { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => undefined);
  }
}

/**
 * One banner, clearly labelled as an advertisement. With several ads in the
 * same placement a random one is shown per page view. Counts one impression
 * when at least half the banner is on screen, and each click.
 */
export function AdSlot({ ads, endpoint, variant }: { ads: PublicAd[]; endpoint: string | null; variant: "wide" | "inline" }) {
  const [index, setIndex] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const ad = ads[index];

  useEffect(() => {
    if (ads.length > 1) setIndex(Math.floor(Math.random() * ads.length));
  }, [ads.length]);

  useEffect(() => {
    const el = box.current;
    if (!ad || !el) return;
    const key = `${ad.id}@${window.location.pathname}`;
    if (countedThisView.has(key)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!countedThisView.has(key) && entries.some((e) => e.isIntersecting)) {
          countedThisView.add(key);
          beacon(endpoint, ad.id, "impression");
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ad, endpoint]);

  if (!ad) return null;
  return (
    <div ref={box} className={`ad ad-${variant}`}>
      <span className="ad-label">जाहिरात</span>
      <a href={ad.targetUrl} target="_blank" rel="sponsored noopener noreferrer" onClick={() => beacon(endpoint, ad.id, "click")}>
        {/* Plain img: banners come from Storage at their own size; no layout shift because of the fixed aspect box. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ad.imageUrl} alt={ad.title} loading="lazy" />
      </a>
    </div>
  );
}
