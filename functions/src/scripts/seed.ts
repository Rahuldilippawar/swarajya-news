/**
 * Seeds starter data: Maharashtra, its 36 districts and default news
 * categories. Safe to run repeatedly — existing documents are left untouched,
 * so names edited in the Admin Panel are never overwritten. Talukas and
 * villages are added from the Admin Panel as reporters need them.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed -w functions
 *
 * Against the emulators, set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 and GCLOUD_PROJECT instead.
 */
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, taxonomySlug } from "@swarajya/shared";
import { db } from "../admin";

const STATE = { id: "mh", name: "महाराष्ट्र", nameEn: "Maharashtra" };

// [Marathi name, English name] — please review spellings with the editorial team.
const DISTRICTS: [string, string][] = [
  ["अहिल्यानगर", "Ahilyanagar"],
  ["अकोला", "Akola"],
  ["अमरावती", "Amravati"],
  ["बीड", "Beed"],
  ["भंडारा", "Bhandara"],
  ["बुलढाणा", "Buldhana"],
  ["चंद्रपूर", "Chandrapur"],
  ["छत्रपती संभाजीनगर", "Chhatrapati Sambhajinagar"],
  ["धाराशिव", "Dharashiv"],
  ["धुळे", "Dhule"],
  ["गडचिरोली", "Gadchiroli"],
  ["गोंदिया", "Gondia"],
  ["हिंगोली", "Hingoli"],
  ["जळगाव", "Jalgaon"],
  ["जालना", "Jalna"],
  ["कोल्हापूर", "Kolhapur"],
  ["लातूर", "Latur"],
  ["मुंबई शहर", "Mumbai City"],
  ["मुंबई उपनगर", "Mumbai Suburban"],
  ["नागपूर", "Nagpur"],
  ["नांदेड", "Nanded"],
  ["नंदुरबार", "Nandurbar"],
  ["नाशिक", "Nashik"],
  ["पालघर", "Palghar"],
  ["परभणी", "Parbhani"],
  ["पुणे", "Pune"],
  ["रायगड", "Raigad"],
  ["रत्नागिरी", "Ratnagiri"],
  ["सांगली", "Sangli"],
  ["सातारा", "Satara"],
  ["सिंधुदुर्ग", "Sindhudurg"],
  ["सोलापूर", "Solapur"],
  ["ठाणे", "Thane"],
  ["वर्धा", "Wardha"],
  ["वाशिम", "Washim"],
  ["यवतमाळ", "Yavatmal"],
];

const CATEGORIES: [string, string][] = [
  ["स्थानिक", "Local"],
  ["राजकारण", "Politics"],
  ["गुन्हे", "Crime"],
  ["शेती", "Agriculture"],
  ["शिक्षण", "Education"],
  ["आरोग्य", "Health"],
  ["व्यापार", "Business"],
  ["क्रीडा", "Sports"],
  ["मनोरंजन", "Entertainment"],
];

async function createIfMissing(collection: string, id: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    await db.collection(collection).doc(id).create({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 6) return false; // ALREADY_EXISTS
    throw err;
  }
}

async function main() {
  let created = 0;
  const location = async (id: string, name: string, nameEn: string, type: string, parentLocationId: string | null) => {
    const slug = taxonomySlug(name, nameEn);
    if (await createIfMissing(COLLECTIONS.locations, id, { locationId: id, name, nameEn, slug, type, parentLocationId, isActive: true })) {
      created++;
    }
  };

  await location(STATE.id, STATE.name, STATE.nameEn, "STATE", null);
  for (const [name, nameEn] of DISTRICTS) {
    await location(`district-${taxonomySlug(name, nameEn)}`, name, nameEn, "DISTRICT", STATE.id);
  }

  for (const [i, [name, nameEn]] of CATEGORIES.entries()) {
    const slug = taxonomySlug(name, nameEn);
    const data = { categoryId: slug, slug, name, nameEn, isActive: true, displayOrder: (i + 1) * 10 };
    if (await createIfMissing(COLLECTIONS.categories, slug, data)) created++;
  }

  console.log(`Seed complete: ${created} documents created (existing documents were left unchanged).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
