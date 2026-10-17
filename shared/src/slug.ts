const MAX_SLUG_LENGTH = 80;

/**
 * Builds a URL slug from a headline. Devanagari (Marathi/Hindi) letters and
 * combining marks are kept so slugs stay readable; everything that is not a
 * letter, mark or digit becomes a hyphen.
 */
export function slugify(text: string, maxLength = MAX_SLUG_LENGTH): string {
  const slug = text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length <= maxLength) return slug;
  // Cut on a word boundary so a Devanagari conjunct is never split mid-cluster.
  const cut = slug.slice(0, maxLength);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/, "");
}

/** Appends a short suffix to keep slugs unique, e.g. `headline-k3x9`. */
export function slugWithSuffix(base: string, suffix: string): string {
  return `${slugify(base, MAX_SLUG_LENGTH - suffix.length - 1)}-${suffix}`;
}
