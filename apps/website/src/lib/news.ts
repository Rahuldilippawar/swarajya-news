import "server-only";

import {
  COLLECTIONS,
  PUBLIC_STATUS,
  youTubeThumbnailUrl,
  type CategoryDoc,
  type LocationDoc,
  type NewsDoc,
} from "@swarajya/shared";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  type Firestore,
} from "firebase/firestore/lite";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getDb } from "./firebase";
import { toArticle, type Article, type Category, type Place } from "./types";

export type { Article, Category, Place } from "./types";

/** Seconds a Firestore result is reused across visitors — bounds database reads under heavy traffic. */
const LIST_TTL = 60;
const ARTICLE_TTL = 300;
const TAXONOMY_TTL = 300;

class NotConfiguredError extends Error {}

function requireDb(): Firestore {
  const db = getDb();
  if (!db) throw new NotConfiguredError("Firebase is not configured for the website.");
  return db;
}

/**
 * Runs a cached loader, falling back when it fails. Loaders throw instead of
 * returning a fallback, so only real results are cached: a Firestore outage
 * or a build without configuration never leaves empty pages in the cache.
 */
async function load<T>(label: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!(err instanceof NotConfiguredError)) console.error(`[news] ${label} failed`, err);
    return fallback;
  }
}

// ---------------------------------------------------------------- articles

type Filter = [field: "isBreaking" | "isFeatured" | "videoProvider" | "categoryId" | "districtId" | "talukaId" | "villageId", value: string | boolean];

/**
 * Published articles, newest first, optionally filtered on one field. Every
 * public query must filter on status (the Security Rules require it).
 */
const fetchPublished = unstable_cache(
  async (filter: Filter | null, count: number, before: string | null): Promise<Article[]> => {
    const q = query(
      collection(requireDb(), COLLECTIONS.news),
      where("status", "==", PUBLIC_STATUS),
      ...(filter ? [where(filter[0], "==", filter[1])] : []),
      orderBy("publishedAt", "desc"),
      ...(before ? [startAfter(Timestamp.fromDate(new Date(before)))] : []),
      limit(count),
    );
    return (await getDocs(q)).docs.map((d) => toArticle(d.data() as NewsDoc));
  },
  ["published-news"],
  { revalidate: LIST_TTL, tags: ["news"] },
);

const published = (filter: Filter | null, count: number, before?: string) =>
  load(`news ${filter?.join("=") ?? "latest"}`, [] as Article[], () => fetchPublished(filter, count, before ?? null));

export const getLatest = (count = 12, before?: string) => published(null, count, before);
export const getBreaking = (count = 6, before?: string) => published(["isBreaking", true], count, before);
export const getFeatured = (count = 3) => published(["isFeatured", true], count);
export const getVideos = (count = 12, before?: string) => published(["videoProvider", "YOUTUBE"], count, before);
export const getByCategory = (categoryId: string, count = 12, before?: string) =>
  published(["categoryId", categoryId], count, before);

function placeField(place: Place): "districtId" | "talukaId" | "villageId" {
  return place.type === "DISTRICT" ? "districtId" : place.type === "TALUKA" ? "talukaId" : "villageId";
}

/** News for a district, or for one of its talukas or villages. */
export function getByPlace(place: Place, count = 12, before?: string) {
  return published([placeField(place), place.id], count, before);
}

const fetchArticle = unstable_cache(
  async (slug: string): Promise<Article | null> => {
    const snap = await getDocs(
      query(collection(requireDb(), COLLECTIONS.news), where("status", "==", PUBLIC_STATUS), where("slug", "==", slug), limit(1)),
    );
    const first = snap.docs[0];
    return first ? toArticle(first.data() as NewsDoc) : null;
  },
  ["article-by-slug"],
  { revalidate: ARTICLE_TTL, tags: ["news"] },
);

/**
 * One published article. Unlike lists, failures propagate so the visitor sees
 * the error page (and can retry) rather than a misleading "not found".
 */
export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  if (!getDb()) return null;
  return fetchArticle(slug);
});

export async function getRelated(article: Article, count = 4): Promise<Article[]> {
  const items = await getByCategory(article.categoryId, count + 1);
  return items.filter((a) => a.id !== article.id).slice(0, count);
}

/**
 * Firestore has no full-text search, so this scans the most recent published
 * articles (optionally narrowed by category or place) and matches headline,
 * summary and tags. Good enough for a regional site; swap for a search
 * service if the archive grows large.
 */
export async function searchArticles(
  term: string,
  filters: { categoryId?: string; place?: Place },
  scan = 300,
): Promise<Article[]> {
  // Narrow on the server by place (more selective) or category; when both are
  // given, the category is applied in memory so no extra index is needed.
  const serverFilter: Filter | null = filters.place
    ? [placeField(filters.place), filters.place.id]
    : filters.categoryId
      ? ["categoryId", filters.categoryId]
      : null;
  const items = await published(serverFilter, scan);
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((a) => {
    if (filters.categoryId && a.categoryId !== filters.categoryId) return false;
    const haystack = [a.headline, a.summary, ...a.tags].join(" ").toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

export function thumbnailFor(article: Article): string | null {
  return article.thumbnailUrl ?? (article.youtubeVideoId ? youTubeThumbnailUrl(article.youtubeVideoId) : null);
}

// ---------------------------------------------------------------- taxonomy
// Public queries must ask for active entries only; the Security Rules hide inactive ones.

const fetchCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const snap = await getDocs(
      query(collection(requireDb(), COLLECTIONS.categories), where("isActive", "==", true), orderBy("displayOrder")),
    );
    return snap.docs.map((d) => {
      const c = d.data() as CategoryDoc;
      return { id: c.categoryId, slug: c.slug, name: c.name, nameEn: c.nameEn ?? null, description: c.description ?? null };
    });
  },
  ["categories"],
  { revalidate: TAXONOMY_TTL, tags: ["taxonomy"] },
);

export const getCategories = cache(() => load("categories", [] as Category[], fetchCategories));

export async function getCategory(slug: string): Promise<Category | null> {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

function toPlace(l: LocationDoc): Place {
  return { id: l.locationId, slug: l.slug, name: l.name, nameEn: l.nameEn ?? null, type: l.type, parentId: l.parentLocationId };
}

const fetchDistricts = unstable_cache(
  async (): Promise<Place[]> => {
    const snap = await getDocs(
      query(
        collection(requireDb(), COLLECTIONS.locations),
        where("type", "==", "DISTRICT"),
        where("isActive", "==", true),
        orderBy("name"),
      ),
    );
    return snap.docs.map((d) => toPlace(d.data() as LocationDoc));
  },
  ["districts"],
  { revalidate: TAXONOMY_TTL, tags: ["taxonomy"] },
);

export const getDistricts = cache(() => load("districts", [] as Place[], fetchDistricts));

export async function getDistrictBySlug(slug: string): Promise<Place | null> {
  return (await getDistricts()).find((d) => d.slug === slug) ?? null;
}

const fetchChildPlaces = unstable_cache(
  async (parentId: string): Promise<Place[]> => {
    const snap = await getDocs(
      query(
        collection(requireDb(), COLLECTIONS.locations),
        where("parentLocationId", "==", parentId),
        where("isActive", "==", true),
        orderBy("name"),
      ),
    );
    return snap.docs.map((d) => toPlace(d.data() as LocationDoc));
  },
  ["child-places"],
  { revalidate: TAXONOMY_TTL, tags: ["taxonomy"] },
);

export const getChildPlaces = (parentId: string) => load(`children of ${parentId}`, [] as Place[], () => fetchChildPlaces(parentId));

const fetchPlace = unstable_cache(
  async (id: string): Promise<Place | null> => {
    try {
      const snap = await getDoc(doc(requireDb(), COLLECTIONS.locations, id));
      return snap.exists() ? toPlace(snap.data() as LocationDoc) : null;
    } catch (err) {
      // Deactivated locations are hidden from the public by the Security Rules.
      if ((err as { code?: string }).code === "permission-denied") return null;
      throw err;
    }
  },
  ["place"],
  { revalidate: TAXONOMY_TTL, tags: ["taxonomy"] },
);

/** A single active location; null if it does not exist, is inactive (unreadable to the public) or fails to load. */
export const getPlace = cache((id: string) => (id ? load(`place ${id}`, null, () => fetchPlace(id)) : Promise.resolve(null)));
