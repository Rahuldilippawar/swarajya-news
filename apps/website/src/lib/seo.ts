import type { Article, Category } from "./types";
import { SITE } from "./site";

/** Text shared on WhatsApp: headline, summary and link — the format the editorial team asked for. */
export function whatsAppShareUrl(article: Pick<Article, "headline" | "summary">, url: string): string {
  const text = `${article.headline}\n\n${article.summary}\n\nसविस्तर बातमी वाचा: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** schema.org NewsArticle for Google News and rich results. */
export function newsArticleJsonLd(
  article: Article,
  opts: { url: string; image: string | null; category?: Category | null; logoUrl: string },
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
    headline: article.headline.slice(0, 110),
    description: article.seoDescription ?? article.summary,
    ...(opts.image ? { image: [opts.image] } : {}),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: [{ "@type": "Person", name: article.reporterName }],
    publisher: { "@type": "NewsMediaOrganization", name: SITE.name, logo: { "@type": "ImageObject", url: opts.logoUrl } },
    ...(opts.category ? { articleSection: opts.category.name } : {}),
    ...(article.tags.length ? { keywords: article.tags.join(", ") } : {}),
    inLanguage: "mr-IN",
  };
}

/**
 * Serialises JSON-LD for a <script> tag. `<` is escaped so text such as
 * "</script>" inside a headline cannot break out of the tag.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
