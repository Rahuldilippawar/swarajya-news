import type { Metadata } from "next";
import { cursorFrom, Listing, PAGE_SIZE } from "@/components/Listing";
import { getLatest } from "@/lib/news";
import { getNames } from "@/lib/names";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ताज्या बातम्या",
  description: "Latest Marathi news from Swarajya News.",
  alternates: { canonical: "/news" },
};

export default async function LatestNewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const before = cursorFrom((await searchParams).before);
  const [articles, names] = await Promise.all([getLatest(PAGE_SIZE, before), getNames()]);
  return <Listing title="ताज्या बातम्या" articles={articles} basePath="/news" metaFor={names.metaFor} />;
}
