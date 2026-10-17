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

const SUFFIX_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** A short random suffix such as `k3x9`, from an alphabet without look-alike characters. */
export function randomSuffix(length = 5): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => SUFFIX_ALPHABET[b % SUFFIX_ALPHABET.length]).join("");
}

/** Slug for a new article: readable headline plus a random suffix so two similar headlines never collide. */
export function newsSlug(headline: string): string {
  return slugWithSuffix(headline, randomSuffix());
}

/** Slug for a category or location: prefers the English name, so URLs stay short and typeable. */
export function taxonomySlug(name: string, nameEn?: string): string {
  return slugify(nameEn?.trim() || name, 60);
}
