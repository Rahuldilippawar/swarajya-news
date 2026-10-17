import type { MetadataRoute } from "next";
import { getCategories, getDistricts, getLatest } from "@/lib/news";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

const STATIC_PATHS = ["/", "/news", "/breaking-news", "/video-news", "/about", "/contact", "/privacy-policy", "/editorial-policy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, districts, articles] = await Promise.all([getCategories(), getDistricts(), getLatest(1000)]);
  return [
    ...STATIC_PATHS.map((path) => ({ url: absoluteUrl(path), changeFrequency: path === "/" ? ("hourly" as const) : ("weekly" as const) })),
    ...categories.map((c) => ({ url: absoluteUrl(`/category/${c.slug}`), changeFrequency: "hourly" as const })),
    ...districts.map((d) => ({ url: absoluteUrl(`/district/${d.slug}`), changeFrequency: "daily" as const })),
    ...articles.map((a) => ({ url: absoluteUrl(`/news/${a.slug}`), lastModified: a.updatedAt, changeFrequency: "daily" as const })),
  ];
}
