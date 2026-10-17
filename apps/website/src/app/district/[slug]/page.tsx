import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cursorFrom, Listing, PAGE_SIZE } from "@/components/Listing";
import { getByPlace, getChildPlaces, getDistrictBySlug, getPlace } from "@/lib/news";
import { getNames } from "@/lib/names";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const district = await getDistrictBySlug(decodeURIComponent((await params).slug));
  if (!district) return {};
  return {
    title: `${district.name} जिल्हा बातम्या`,
    description: `${district.name} जिल्ह्यातील तालुका आणि गावपातळीवरील ताज्या बातम्या — Swarajya News.`,
    alternates: { canonical: `/district/${district.slug}` },
  };
}

/** District news, narrowed by taluka (?taluka=<id>) and village (?village=<id>). */
export default async function DistrictPage({ params, searchParams }: Props) {
  const district = await getDistrictBySlug(decodeURIComponent((await params).slug));
  if (!district) notFound();
  const sp = await searchParams;
  const before = cursorFrom(sp.before);

  const talukas = await getChildPlaces(district.id);
  const taluka = talukas.find((t) => t.id === one(sp.taluka)) ?? null;
  const villages = taluka ? await getChildPlaces(taluka.id) : [];
  const village = taluka ? (villages.find((v) => v.id === one(sp.village)) ?? null) : null;
  const place = village ?? taluka ?? district;

  const [articles, names] = await Promise.all([getByPlace(place, PAGE_SIZE, before), getNames()]);
  // Most specific place for each card (village, else taluka); getPlace is cached per request.
  const localNames = new Map(
    await Promise.all(
      articles.map(async (a) => {
        const id = a.villageId ?? a.talukaId;
        return [a.id, id ? ((await getPlace(id))?.name ?? null) : null] as const;
      }),
    ),
  );
  const base = `/district/${district.slug}`;
  const query: Record<string, string> = {};
  if (taluka) query.taluka = taluka.id;
  if (village) query.village = village.id;

  return (
    <Listing
      title={place === district ? `${district.name} जिल्हा` : `${place.name}, ${district.name}`}
      articles={articles}
      basePath={base}
      query={query}
      metaFor={(a) => [localNames.get(a.id), names.category.get(a.categoryId)?.name].filter(Boolean).join(" · ") || null}
      empty="या भागातील बातम्या अद्याप प्रकाशित झालेल्या नाहीत."
    >
      {talukas.length > 0 && (
        <nav aria-label="तालुका" className="filters">
          <ul className="chips">
            <li><Link href={base} aria-current={!taluka ? "page" : undefined}>सर्व तालुके</Link></li>
            {talukas.map((t) => (
              <li key={t.id}>
                <Link href={`${base}?taluka=${t.id}`} aria-current={taluka?.id === t.id && !village ? "page" : undefined}>{t.name}</Link>
              </li>
            ))}
          </ul>
          {villages.length > 0 && (
            <ul className="chips chips-sub">
              {villages.map((v) => (
                <li key={v.id}>
                  <Link href={`${base}?taluka=${taluka!.id}&village=${v.id}`} aria-current={village?.id === v.id ? "page" : undefined}>
                    {v.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
      )}
    </Listing>
  );
}
