import { describe, expect, it } from "vitest";
import { formatDateTime, timeAgo } from "./format";
import { jsonLdScript, newsArticleJsonLd, whatsAppShareUrl } from "./seo";
import { paragraphs, toArticle, type Article } from "./types";

const ts = (iso: string) => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date(iso) });

const doc = {
  newsId: "n1",
  slug: "pune-rain-abcde",
  headline: "पुण्यात पाऊस",
  summary: "सारांश",
  content: "पहिला परिच्छेद.\n\nदुसरा परिच्छेद.\nतिसरा.",
  categoryId: "local",
  districtId: "district-pune",
  talukaId: "",
  villageId: "",
  reporterId: "SN-R-0001",
  reporterUid: "u1",
  reporterName: "Ramesh Patil",
  youtubeUrl: "https://youtube.com/shorts/dQw4w9WgXcQ",
  youtubeVideoId: "dQw4w9WgXcQ",
  status: "PUBLISHED" as const,
  isBreaking: true,
  isFeatured: false,
  tags: ["पाऊस"],
  viewCount: 3,
  publishedAt: ts("2026-10-17T05:30:00Z"),
  createdAt: ts("2026-10-17T05:00:00Z"),
  updatedAt: ts("2026-10-17T06:00:00Z"),
};

describe("toArticle", () => {
  it("produces plain serialisable data and detects Shorts", () => {
    const a = toArticle(doc);
    expect(a).toMatchObject({ id: "n1", isShort: true, talukaId: null, publishedAt: "2026-10-17T05:30:00.000Z" });
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it("splits paragraphs", () => {
    expect(paragraphs(doc.content)).toEqual(["पहिला परिच्छेद.", "दुसरा परिच्छेद.", "तिसरा."]);
  });
});

describe("formatting", () => {
  it("always shows Indian time", () => {
    // 05:30 UTC is 11:00 in India.
    expect(formatDateTime("2026-10-17T05:30:00Z")).toMatch(/११:००/);
  });

  it("gives Marathi relative times", () => {
    const now = new Date("2026-10-17T06:30:00Z").getTime();
    expect(timeAgo("2026-10-17T06:25:00Z", now)).toBe("५ मिनिटांपूर्वी");
    expect(timeAgo("2026-10-17T03:30:00Z", now)).toBe("३ तासांपूर्वी");
  });
});

describe("sharing and structured data", () => {
  const article = toArticle(doc) as Article;

  it("builds a WhatsApp link with headline, summary and URL", () => {
    const url = new URL(whatsAppShareUrl(article, "https://swarajyanews.in/news/x"));
    expect(url.hostname).toBe("wa.me");
    expect(url.searchParams.get("text")).toBe("पुण्यात पाऊस\n\nसारांश\n\nसविस्तर बातमी वाचा: https://swarajyanews.in/news/x");
  });

  it("emits NewsArticle JSON-LD", () => {
    const ld = newsArticleJsonLd(article, { url: "https://x/news/a", image: "https://img", logoUrl: "https://x/logo.svg" });
    expect(ld).toMatchObject({ "@type": "NewsArticle", headline: "पुण्यात पाऊस", datePublished: article.publishedAt, inLanguage: "mr-IN" });
  });

  it("cannot be broken out of its script tag", () => {
    expect(jsonLdScript({ headline: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
