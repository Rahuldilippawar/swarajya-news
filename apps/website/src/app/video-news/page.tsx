import type { Metadata } from "next";
import { cursorFrom, Listing, PAGE_SIZE } from "@/components/Listing";
import { NewsCard } from "@/components/NewsCard";
import { getVideos } from "@/lib/news";
import { getNames } from "@/lib/names";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "व्हिडिओ बातम्या",
  description: "Video news reports from Swarajya News.",
  alternates: { canonical: "/video-news" },
};

export default async function VideoNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const before = cursorFrom((await searchParams).before);
  const [videos, names] = await Promise.all([getVideos(PAGE_SIZE, before), getNames()]);
  const shorts = videos.filter((v) => v.isShort);
  return (
    <>
      {shorts.length > 0 && !before && (
        <section className="section" id="shorts" aria-labelledby="h-shorts">
          <h2 id="h-shorts">शॉर्ट व्हिडिओ</h2>
          <div className="shorts">
            {shorts.map((a) => (
              <NewsCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
        </section>
      )}
      <Listing title="व्हिडिओ बातम्या" articles={videos} basePath="/video-news" metaFor={names.metaFor} empty="अद्याप व्हिडिओ बातम्या नाहीत." />
    </>
  );
}
