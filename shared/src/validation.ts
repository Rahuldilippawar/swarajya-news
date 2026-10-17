import { parseYouTubeUrl } from "./youtube";

export const NEWS_LIMITS = {
  headline: { min: 10, max: 200 },
  summary: { min: 20, max: 500 },
  content: { min: 50, max: 50_000 },
  tags: { maxCount: 15, maxLength: 40 },
} as const;

/** Editable fields of a news form, as entered in the Admin or Reporter Panel. */
export interface NewsFormInput {
  headline: string;
  summary: string;
  content: string;
  categoryId: string;
  districtId: string;
  talukaId?: string;
  villageId?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
}

export type NewsFieldErrors = Partial<Record<keyof NewsFormInput, string>>;

function lengthError(label: string, value: string, { min, max }: { min: number; max: number }) {
  const len = value.trim().length;
  if (len === 0) return `${label} is required.`;
  if (len < min) return `${label} must be at least ${min} characters.`;
  if (len > max) return `${label} must be at most ${max} characters.`;
  return undefined;
}

/**
 * Validates a news form. Drafts only need a headline; submission requires every
 * field the editor needs to review the story. Used by the panels for instant
 * feedback and again by Cloud Functions, which are the source of truth.
 */
export function validateNews(input: NewsFormInput, mode: "draft" | "submit"): NewsFieldErrors {
  const errors: NewsFieldErrors = {};

  const headline = lengthError("Headline", input.headline ?? "", NEWS_LIMITS.headline);
  if (headline) errors.headline = headline;

  if (input.youtubeUrl?.trim()) {
    const yt = parseYouTubeUrl(input.youtubeUrl);
    if (!yt.ok) errors.youtubeUrl = yt.reason;
  }

  if (input.thumbnailUrl?.trim() && !/^https:\/\//i.test(input.thumbnailUrl.trim())) {
    errors.thumbnailUrl = "Thumbnail must be an https URL.";
  }

  const tags = input.tags ?? [];
  if (tags.length > NEWS_LIMITS.tags.maxCount) {
    errors.tags = `At most ${NEWS_LIMITS.tags.maxCount} tags are allowed.`;
  } else if (tags.some((t) => t.trim().length === 0 || t.length > NEWS_LIMITS.tags.maxLength)) {
    errors.tags = `Tags must be 1–${NEWS_LIMITS.tags.maxLength} characters.`;
  }

  if (mode === "submit") {
    const summary = lengthError("Summary", input.summary ?? "", NEWS_LIMITS.summary);
    if (summary) errors.summary = summary;
    const content = lengthError("Content", input.content ?? "", NEWS_LIMITS.content);
    if (content) errors.content = content;
    if (!input.categoryId?.trim()) errors.categoryId = "Category is required.";
    if (!input.districtId?.trim()) errors.districtId = "District is required.";
  }

  return errors;
}

export function hasErrors(errors: NewsFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
