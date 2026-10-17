import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const STATIC_PATHS = ["/", "/news", "/breaking-news", "/video-news", "/about", "/contact", "/privacy-policy", "/editorial-policy"];

// Article, category and district URLs are added once news is read from Firestore (Milestone 6).
export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_PATHS.map((path) => ({ url: absoluteUrl(path), changeFrequency: path === "/" ? "hourly" : "weekly" }));
}
