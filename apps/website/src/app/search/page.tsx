import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { NewsGrid } from "@/components/NewsCard";
import { getCategories, getDistricts, searchArticles } from "@/lib/news";
import { formatCount } from "@/lib/format";
import { getNames } from "@/lib/names";

export const metadata: Metadata = {
  title: "शोधा",
  robots: { index: false, follow: true },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const categoryId = one(sp.category);
  const districtId = one(sp.district);
  const [categories, districts, names] = await Promise.all([getCategories(), getDistricts(), getNames()]);
  const place = districts.find((d) => d.id === districtId);
  const hasQuery = q.length > 0 || !!categoryId || !!place;
  const results = hasQuery
    ? await searchArticles(q, { categoryId: categories.some((c) => c.id === categoryId) ? categoryId : undefined, place })
    : [];

  return (
    <section className="section">
      <h1>बातम्या शोधा</h1>
      <form className="search-form" action="/search" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="शब्द किंवा मथळा" aria-label="शोध" />
        <select name="category" defaultValue={categoryId} aria-label="विभाग">
          <option value="">सर्व विभाग</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="district" defaultValue={districtId} aria-label="जिल्हा">
          <option value="">सर्व जिल्हे</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button type="submit">शोधा</button>
      </form>
      {hasQuery &&
        (results.length ? (
          <>
            <p className="muted">{formatCount(results.length)} बातम्या सापडल्या</p>
            <NewsGrid articles={results} metaFor={names.metaFor} />
          </>
        ) : (
          <EmptyState>काहीही सापडले नाही. वेगळे शब्द वापरून पाहा.</EmptyState>
        ))}
    </section>
  );
}
