import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { thumbnailFor, type Article } from "@/lib/news";
import { Thumb } from "./Thumb";

export function NewsCard({
  article,
  variant = "default",
  meta,
  priority,
}: {
  article: Article;
  variant?: "default" | "hero" | "compact";
  /** Extra context such as the district name. */
  meta?: string | null;
  priority?: boolean;
}) {
  const sizes = variant === "hero" ? "(max-width: 900px) 100vw, 66vw" : variant === "compact" ? "120px" : "(max-width: 600px) 100vw, 33vw";
  return (
    <article className={`card card-${variant}`}>
      <Link href={`/news/${article.slug}`} className="card-link">
        <div className="card-media">
          <Thumb src={thumbnailFor(article)} alt="" sizes={sizes} priority={priority} />
          {article.youtubeVideoId && <span className="play-badge" aria-label="व्हिडिओ">▶</span>}
        </div>
        <div className="card-body">
          {article.isBreaking && <span className="tag tag-breaking">ब्रेकिंग</span>}
          <h3>{article.headline}</h3>
          {variant !== "compact" && article.summary && <p className="card-summary">{article.summary}</p>}
          <p className="card-meta">
            {[meta, timeAgo(article.publishedAt)].filter(Boolean).join(" · ")}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function NewsGrid({ articles, metaFor }: { articles: Article[]; metaFor?: (a: Article) => string | null }) {
  return (
    <div className="grid">
      {articles.map((a) => (
        <NewsCard key={a.id} article={a} meta={metaFor?.(a)} />
      ))}
    </div>
  );
}
