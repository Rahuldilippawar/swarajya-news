import { EmptyState } from "./EmptyState";
import { NewsGrid } from "./NewsCard";
import { Pager } from "./Pager";
import type { Article } from "@/lib/news";

export const PAGE_SIZE = 18;

export function Listing({
  title,
  intro,
  articles,
  basePath,
  query,
  metaFor,
  empty = "अद्याप बातम्या प्रकाशित झालेल्या नाहीत.",
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  articles: Article[];
  basePath: string;
  query?: Record<string, string>;
  metaFor?: (a: Article) => string | null;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="section">
      <h1>{title}</h1>
      {intro}
      {children}
      {articles.length ? <NewsGrid articles={articles} metaFor={metaFor} /> : <EmptyState>{empty}</EmptyState>}
      <Pager basePath={basePath} articles={articles} pageSize={PAGE_SIZE} query={query} />
    </section>
  );
}

/** Reads the `before` cursor from search params, ignoring anything that is not a valid date. */
export function cursorFrom(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && !Number.isNaN(Date.parse(v)) ? v : undefined;
}
