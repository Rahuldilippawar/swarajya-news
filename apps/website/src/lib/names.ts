import "server-only";

import { getCategories, getDistricts, type Article } from "./news";

/** Lookup tables for showing category and district names on cards. */
export async function getNames() {
  const [categories, districts] = await Promise.all([getCategories(), getDistricts()]);
  const category = new Map(categories.map((c) => [c.id, c]));
  const district = new Map(districts.map((d) => [d.id, d]));
  return {
    categories,
    districts,
    category,
    district,
    /** "पुणे · स्थानिक" style line for a card. */
    metaFor: (a: Article) => [district.get(a.districtId)?.name, category.get(a.categoryId)?.name].filter(Boolean).join(" · ") || null,
  };
}
