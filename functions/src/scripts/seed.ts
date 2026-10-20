/**
 * Seeds starter data: Maharashtra, its 36 districts and default news
 * categories. Safe to run repeatedly — existing documents are left untouched,
 * so names edited in the Admin Panel are never overwritten. Talukas and
 * villages are added from the Admin Panel as reporters need them. Settings
 * fields that are still empty are filled in, and every staff member without a
 * press card gets one.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed -w functions
 *
 * Against the emulators, set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 and GCLOUD_PROJECT instead.
 */
import { FieldValue } from "firebase-admin/firestore";
import { APP_SETTINGS_DOC_ID, COLLECTIONS, taxonomySlug, type AppSettingsDoc } from "@swarajya/shared";
import { db } from "../admin";
import { syncIdCard } from "../idCards";

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

// The channel's own details, used until the Super Admin edits them in Admin → Settings.
const SETTINGS: AppSettingsDoc = {
  channelName: "स्वराज्य न्यूज",
  tagline: "सत्य हेच तुमच्या समोर !",
  tvChannel: "GTPL केबल नेटवर्क – चॅनल क्र. ९९३",
  contactDetails: {
    editorName: "श्री. योगेश भदाणे",
    editorPhone: "8625970948",
    phone: "+91 9096970948 / +91 8625970948",
    email: "swarajnews513@gmail.com",
    address: "प्लॉट नं. १२६, आई बंगला, कीर्ती क्लासेस जवळ, दत्तमंदिर, देवपूर, धुळे - ४२४००२ (महाराष्ट्र)",
  },
  socialLinks: {
    youtube: "https://www.youtube.com/@swarajyanews2025",
    whatsapp: "https://whatsapp.com/channel/0029VbBSRfO3mFXxjIBshv3Q",
    telegram: "https://t.me/S_Nd24",
    facebook: "https://www.facebook.com/profile.php?id=61577638187332",
    instagram: "https://www.instagram.com/swarajyanews2025",
  },
};

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

  // Settings keep exactly the fields the Security Rules allow (no createdAt).
  try {
    await db.collection(COLLECTIONS.appSettings).doc(APP_SETTINGS_DOC_ID).create({
      ...SETTINGS,
      updatedBy: "seed",
      updatedAt: FieldValue.serverTimestamp(),
    });
    created++;
  } catch (err) {
    if ((err as { code?: number }).code !== 6) throw err;
    // ALREADY_EXISTS: keep what the Super Admin saved, only fill in fields that are still empty.
    const ref = db.collection(COLLECTIONS.appSettings).doc(APP_SETTINGS_DOC_ID);
    const current = (await ref.get()).data() as Partial<AppSettingsDoc>;
    const missing: Record<string, unknown> = {};
    if (!current.tagline) missing.tagline = SETTINGS.tagline;
    if (!current.tvChannel) missing.tvChannel = SETTINGS.tvChannel;
    for (const [key, value] of Object.entries(SETTINGS.contactDetails)) {
      if (!current.contactDetails?.[key as keyof AppSettingsDoc["contactDetails"]]) missing[`contactDetails.${key}`] = value;
    }
    if (Object.keys(missing).length > 0) {
      await ref.update({ ...missing, updatedBy: "seed", updatedAt: FieldValue.serverTimestamp() });
      console.log(`Settings: filled in ${Object.keys(missing).join(", ")}.`);
    }
  }

  // Press cards for staff added before ID cards existed (no-op for everyone else).
  let cards = 0;
  for (const user of (await db.collection(COLLECTIONS.users).get()).docs) {
    if (user.get("cardId")) continue;
    if (await syncIdCard(user.id)) cards++;
  }
  if (cards > 0) console.log(`ID cards: generated ${cards}.`);

  console.log(`Seed complete: ${created} documents created (existing documents were left unchanged).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
