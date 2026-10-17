import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { NewsCard, NewsGrid } from "@/components/NewsCard";
import { Section } from "@/components/Section";
import { getDb } from "@/lib/firebase";
import { getBreaking, getByCategory, getFeatured, getLatest, getVideos } from "@/lib/news";
import { getNames } from "@/lib/names";

// Rebuilt at most once a minute, so a newly published story appears within a minute.
export const revalidate = 60;

export default async function HomePage() {
  if (!getDb()) {
    return <EmptyState>बातम्या लवकरच येथे उपलब्ध होतील.</EmptyState>;
  }

  const [names, breaking, featured, latest, videos] = await Promise.all([
    getNames(),
    getBreaking(5),
    getFeatured(3),
    getLatest(13),
    getVideos(16),
  ]);
  const topCategories = names.categories.slice(0, 4);
  const byCategory = await Promise.all(topCategories.map((c) => getByCategory(c.id, 4)));

  const hero = featured[0] ?? latest[0];
  const side = [...featured.slice(1), ...latest].filter((a) => a.id !== hero?.id).slice(0, 4);
  const shown = new Set([hero?.id, ...side.map((a) => a.id)]);
  const moreLatest = latest.filter((a) => !shown.has(a.id)).slice(0, 9);
  const regularVideos = videos.filter((v) => !v.isShort).slice(0, 4);
  const shorts = videos.filter((v) => v.isShort).slice(0, 6);

  if (!hero) return <EmptyState>अद्याप बातम्या प्रकाशित झालेल्या नाहीत.</EmptyState>;

  return (
    <>
      {breaking.length > 0 && (
        <div className="breaking" role="region" aria-label="ब्रेकिंग न्यूज">
          <span className="label">ब्रेकिंग</span>
          <ul className="breaking-list">
            {breaking.map((a) => (
              <li key={a.id}><Link href={`/news/${a.slug}`}>{a.headline}</Link></li>
            ))}
          </ul>
        </div>
      )}

      <div className="hero">
        <NewsCard article={hero} variant="hero" meta={names.metaFor(hero)} priority />
        <div className="hero-side">
          {side.map((a) => (
            <NewsCard key={a.id} article={a} variant="compact" meta={names.metaFor(a)} />
          ))}
        </div>
      </div>

      {moreLatest.length > 0 && (
        <Section id="latest" title="ताज्या बातम्या" href="/news">
          <NewsGrid articles={moreLatest} metaFor={names.metaFor} />
        </Section>
      )}

      {regularVideos.length > 0 && (
        <Section id="video" title="व्हिडिओ बातम्या" href="/video-news">
          <NewsGrid articles={regularVideos} metaFor={names.metaFor} />
        </Section>
      )}

      {shorts.length > 0 && (
        <Section id="shorts" title="शॉर्ट व्हिडिओ" href="/video-news#shorts">
          <div className="shorts">
            {shorts.map((a) => (
              <NewsCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
        </Section>
      )}

      {topCategories.map((c, i) =>
        byCategory[i]!.length > 0 ? (
          <Section key={c.id} id={`cat-${c.id}`} title={c.name} href={`/category/${c.slug}`}>
            <NewsGrid articles={byCategory[i]!} metaFor={(a) => names.district.get(a.districtId)?.name ?? null} />
          </Section>
        ) : null,
      )}

      {names.districts.length > 0 && (
        <Section id="districts" title="जिल्हानिहाय बातम्या">
          <ul className="chips">
            {names.districts.map((d) => (
              <li key={d.id}><Link href={`/district/${d.slug}`}>{d.name}</Link></li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
