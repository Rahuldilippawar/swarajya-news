const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/** Path prefixes that carry the video ID as the next path segment. */
const ID_PATH_PREFIXES = ["embed", "shorts", "live", "v"];

export type YouTubeParseResult =
  | { ok: true; videoId: string; isShort: boolean; canonicalUrl: string }
  | { ok: false; reason: string };

export function isValidYouTubeVideoId(id: string): boolean {
  return VIDEO_ID.test(id);
}

/**
 * Extracts the video ID from a YouTube URL. Accepts watch, youtu.be, embed,
 * shorts and live links; rejects every other host (including look-alikes such
 * as `youtube.com.example.org`). This only checks the URL shape — whether the
 * video exists, is public and is embeddable must be verified server-side.
 */
export function parseYouTubeUrl(input: string): YouTubeParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "YouTube URL is empty." };

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, reason: "Not a valid URL." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "URL must use http or https." };
  }

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return { ok: false, reason: "URL is not a YouTube link." };

  const segments = url.pathname.split("/").filter(Boolean);
  let videoId: string | undefined;
  let isShort = false;

  if (host === "youtu.be") {
    videoId = segments[0];
  } else if (segments[0] === "watch") {
    videoId = url.searchParams.get("v") ?? undefined;
  } else if (segments[0] && ID_PATH_PREFIXES.includes(segments[0])) {
    videoId = segments[1];
    isShort = segments[0] === "shorts";
  }

  if (!videoId) return { ok: false, reason: "Could not find a video ID in the URL." };
  if (!isValidYouTubeVideoId(videoId)) return { ok: false, reason: "The video ID is not valid." };

  return { ok: true, videoId, isShort, canonicalUrl: youTubeWatchUrl(videoId) };
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function youTubeThumbnailUrl(videoId: string, quality: "hq" | "maxres" = "hq"): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality === "maxres" ? "maxresdefault" : "hqdefault"}.jpg`;
}
