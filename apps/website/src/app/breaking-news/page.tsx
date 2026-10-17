import type { Metadata } from "next";
import { cursorFrom, Listing, PAGE_SIZE } from "@/components/Listing";
import { getBreaking } from "@/lib/news";
import { getNames } from "@/lib/names";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ब्रेकिंग न्यूज",
  description: "Breaking news from Swarajya News.",
  alternates: { canonical: "/breaking-news" },
};

export default async function BreakingNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const before = cursorFrom((await searchParams).before);
  const [articles, names] = await Promise.all([getBreaking(PAGE_SIZE, before), getNames()]);
  return (
    <Listing title="ब्रेकिंग न्यूज" articles={articles} basePath="/breaking-news" metaFor={names.metaFor} empty="सध्या कोणतीही ब्रेकिंग न्यूज नाही." />
  );
}
