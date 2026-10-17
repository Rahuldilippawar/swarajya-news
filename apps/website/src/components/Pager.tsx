import Link from "next/link";
import type { Article } from "@/lib/news";

/** "Older news" link using the last article's publish time as the cursor. */
export function Pager({ basePath, articles, pageSize, query = {} }: { basePath: string; articles: Article[]; pageSize: number; query?: Record<string, string> }) {
  const last = articles.at(-1);
  if (!last || articles.length < pageSize) return null;
  const params = new URLSearchParams({ ...query, before: last.publishedAt });
  return (
    <p className="pager">
      <Link href={`${basePath}?${params}`} rel="next">जुन्या बातम्या →</Link>
    </p>
  );
}
