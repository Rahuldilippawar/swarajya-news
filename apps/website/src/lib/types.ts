import { parseYouTubeUrl, type LocationType, type NewsDoc, type TimestampLike } from "@swarajya/shared";

/** A published article in plain, serialisable form (dates as ISO strings) for server and client components. */
export interface Article {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  content: string;
  categoryId: string;
  districtId: string;
  talukaId: string | null;
  villageId: string | null;
  reporterName: string;
  thumbnailUrl: string | null;
  youtubeVideoId: string | null;
  /** YouTube Short (vertical) rather than a regular video. */
  isShort: boolean;
  videoTitle: string | null;
  isBreaking: boolean;
  isFeatured: boolean;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  viewCount: number;
  publishedAt: string;
  updatedAt: string;
  eventAt: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  description: string | null;
}

export interface Place {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  type: LocationType;
  parentId: string | null;
}

const iso = (t: TimestampLike | undefined | null): string | null => (t ? t.toDate().toISOString() : null);

export function toArticle(d: NewsDoc): Article {
  const video = d.youtubeVideoId && d.youtubeUrl ? parseYouTubeUrl(d.youtubeUrl) : null;
  const publishedAt = iso(d.publishedAt) ?? iso(d.updatedAt) ?? new Date(0).toISOString();
  return {
    id: d.newsId,
    slug: d.slug,
    headline: d.headline,
    summary: d.summary ?? "",
    content: d.content ?? "",
    categoryId: d.categoryId,
    districtId: d.districtId,
    talukaId: d.talukaId || null,
    villageId: d.villageId || null,
    reporterName: d.reporterName,
    thumbnailUrl: d.thumbnailUrl || null,
    youtubeVideoId: d.youtubeVideoId || null,
    isShort: video?.ok ? video.isShort : false,
    videoTitle: d.videoTitle ?? null,
    isBreaking: !!d.isBreaking,
    isFeatured: !!d.isFeatured,
    tags: d.tags ?? [],
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    viewCount: d.viewCount ?? 0,
    publishedAt,
    updatedAt: iso(d.updatedAt) ?? publishedAt,
    eventAt: iso(d.eventAt),
  };
}

/** Splits article text into paragraphs (blank lines or single line breaks). */
export function paragraphs(content: string): string[] {
  return content
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
