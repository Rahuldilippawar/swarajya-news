"use client";

import { useEffect } from "react";

/**
 * Records one view per article per browser session. Counting goes through a
 * Cloud Function because visitors cannot write to articles.
 */
export function ViewCounter({ newsId, endpoint }: { newsId: string; endpoint: string | null }) {
  useEffect(() => {
    if (!endpoint) return;
    const key = `viewed:${newsId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode or storage disabled: still count, at worst twice.
    }
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newsId }),
      keepalive: true,
    }).catch(() => undefined);
  }, [newsId, endpoint]);
  return null;
}
