import { youTubeWatchUrl, type VideoStatus } from "@swarajya/shared";

export interface VideoCheck {
  status: VideoStatus;
  title?: string;
}

export type VideoVerifier = (videoId: string) => Promise<VideoCheck>;

/**
 * Checks a video through YouTube's public oEmbed endpoint (no API key needed).
 * 200 → public and embeddable; 401/403 → embedding disabled; 400/404 → private,
 * deleted or never existed. Anything else (timeouts, 5xx) leaves the video
 * UNVERIFIED rather than claiming it is available or not.
 */
export const verifyYouTubeVideo: VideoVerifier = async (videoId) => {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youTubeWatchUrl(videoId))}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const body = (await res.json()) as { title?: unknown };
      return { status: "AVAILABLE", title: typeof body.title === "string" ? body.title.slice(0, 200) : undefined };
    }
    if ([400, 401, 403, 404].includes(res.status)) return { status: "UNAVAILABLE" };
    return { status: "UNVERIFIED" };
  } catch {
    return { status: "UNVERIFIED" };
  }
};
