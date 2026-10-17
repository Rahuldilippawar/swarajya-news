import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cursorFrom, Listing, PAGE_SIZE } from "@/components/Listing";
import { getByCategory, getCategory } from "@/lib/news";
import { getNames } from "@/lib/names";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory(decodeURIComponent((await params).slug));
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? `${category.name} — Swarajya News.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategory(decodeURIComponent((await params).slug));
  if (!category) notFound();
  const before = cursorFrom((await searchParams).before);
  const [articles, names] = await Promise.all([getByCategory(category.id, PAGE_SIZE, before), getNames()]);
  return (
    <Listing
      title={category.name}
      intro={category.description ? <p className="lead">{category.description}</p> : null}
      articles={articles}
      basePath={`/category/${category.slug}`}
      metaFor={(a) => names.district.get(a.districtId)?.name ?? null}
    />
  );
}
