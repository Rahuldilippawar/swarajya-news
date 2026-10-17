import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsCard } from "@/components/NewsCard";
import { ShareButtons } from "@/components/ShareButtons";
import { Thumb } from "@/components/Thumb";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ViewCounter } from "@/components/ViewCounter";
import { functionsOrigin } from "@/lib/firebase";
import { formatCount, formatDateTime } from "@/lib/format";
import { getArticleBySlug, getCategories, getDistricts, getPlace, getRelated, thumbnailFor } from "@/lib/news";
import { jsonLdScript, newsArticleJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { paragraphs } from "@/lib/types";

// Articles are rendered on first visit, cached, and refreshed every five minutes.
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

async function load(params: Props["params"]) {
  return getArticleBySlug(decodeURIComponent((await params).slug));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await load(params);
  if (!article) return { title: "बातमी सापडली नाही" };
  const image = thumbnailFor(article);
  const title = article.seoTitle ?? article.headline;
  const description = article.seoDescription ?? article.summary;
  return {
    title,
    description,
    keywords: article.tags,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/news/${article.slug}`,
      locale: "mr_IN",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.reporterName],
      tags: article.tags,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await load(params);
  if (!article) notFound();

  const [categories, districts, taluka, village, related] = await Promise.all([
    getCategories(),
    getDistricts(),
    article.talukaId ? getPlace(article.talukaId) : null,
    article.villageId ? getPlace(article.villageId) : null,
    getRelated(article),
  ]);
  const category = categories.find((c) => c.id === article.categoryId) ?? null;
  const district = districts.find((d) => d.id === article.districtId) ?? null;
  const url = absoluteUrl(`/news/${article.slug}`);
  const image = thumbnailFor(article);
  const origin = functionsOrigin();
  const place = [village?.name, taluka?.name, district?.name].filter(Boolean).join(", ");

  return (
    <article className="article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(newsArticleJsonLd(article, { url, image, category, logoUrl: absoluteUrl("/logo.svg") })),
        }}
      />
      <ViewCounter newsId={article.id} endpoint={origin ? `${origin}/recordView` : null} />

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">मुख्यपृष्ठ</Link>
        {category && <> › <Link href={`/category/${category.slug}`}>{category.name}</Link></>}
        {district && <> › <Link href={`/district/${district.slug}`}>{district.name}</Link></>}
      </nav>

      {article.isBreaking && <span className="tag tag-breaking">ब्रेकिंग</span>}
      <h1>{article.headline}</h1>
      {article.summary && <p className="lead">{article.summary}</p>}

      <p className="article-meta">
        <span>{article.reporterName}</span>
        {place && <span>{place}</span>}
        <time dateTime={article.publishedAt}>{formatDateTime(article.publishedAt)}</time>
        {article.updatedAt > article.publishedAt && (
          <span>
            अद्यतनित: <time dateTime={article.updatedAt}>{formatDateTime(article.updatedAt)}</time>
          </span>
        )}
        {article.viewCount > 0 && <span>{formatCount(article.viewCount)} वाचने</span>}
      </p>

      <ShareButtons headline={article.headline} summary={article.summary} url={url} />

      {article.youtubeVideoId ? (
        <VideoPlayer videoId={article.youtubeVideoId} title={article.videoTitle ?? article.headline} isShort={article.isShort} />
      ) : (
        image && <div className="article-image"><Thumb src={image} alt={article.headline} sizes="(max-width: 900px) 100vw, 800px" priority /></div>
      )}

      <div className="article-body">
        {paragraphs(article.content).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {article.eventAt && (
        <p className="muted">घटनेची वेळ: <time dateTime={article.eventAt}>{formatDateTime(article.eventAt)}</time></p>
      )}

      {article.tags.length > 0 && (
        <ul className="chips" aria-label="टॅग">
          {article.tags.map((t) => (
            <li key={t}><Link href={`/search?q=${encodeURIComponent(t)}`}>#{t}</Link></li>
          ))}
        </ul>
      )}

      <ShareButtons headline={article.headline} summary={article.summary} url={url} />

      {related.length > 0 && (
        <section className="section related" aria-labelledby="h-related">
          <h2 id="h-related">संबंधित बातम्या</h2>
          <div className="grid">
            {related.map((a) => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
