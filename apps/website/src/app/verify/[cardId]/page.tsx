import { COLLECTIONS, isValidCardId, type IdCardDoc } from "@swarajya/shared";
import type { Metadata } from "next";
import Image from "next/image";
import { doc, getDoc, type Timestamp } from "firebase/firestore/lite";
import { getDb } from "@/lib/firebase";
import { getSettings } from "@/lib/settings";

// Always read the card live: a suspended card must show as invalid at once.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ओळखपत्र पडताळणी",
  robots: { index: false, follow: false },
};

async function loadCard(cardId: string): Promise<IdCardDoc | null> {
  const db = getDb();
  if (!db || !isValidCardId(cardId)) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.idCards, cardId));
    return snap.exists() ? (snap.data() as IdCardDoc) : null;
  } catch {
    return null;
  }
}

const formatDate = (d: Date) =>
  d.toLocaleDateString("mr-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/** Opened from the QR code on a staff press card: shows whether the card is genuine and current. */
export default async function VerifyCardPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const [card, { channelName, contactDetails }] = await Promise.all([loadCard(cardId), getSettings()]);

  if (!card) {
    return (
      <article className="prose verify-card">
        <h1>ओळखपत्र पडताळणी</h1>
        <p className="verify-status" data-state="bad">✖ हे ओळखपत्र {channelName} च्या नोंदीत आढळले नाही.</p>
        <p>संशय असल्यास कार्यालयाशी संपर्क साधा{contactDetails.phone ? `: ${contactDetails.phone}` : "."}</p>
      </article>
    );
  }

  const validUntil = (card.validUntil as Timestamp).toDate();
  const expired = validUntil.getTime() < Date.now();
  const state = card.status !== "ACTIVE" ? "bad" : expired ? "warn" : "ok";
  const message =
    state === "ok"
      ? `✔ वैध ओळखपत्र — ${channelName}`
      : state === "warn"
        ? "⚠ या ओळखपत्राची मुदत संपली आहे."
        : "✖ हे ओळखपत्र रद्द करण्यात आले आहे. धारक सध्या प्रतिनिधी नाही.";

  return (
    <article className="prose verify-card">
      <h1>ओळखपत्र पडताळणी</h1>
      <p className="verify-status" data-state={state}>{message}</p>
      <div className="verify-body">
        {card.photoUrl && <Image src={card.photoUrl} alt={card.fullName} width={140} height={175} className="verify-photo" />}
        <dl>
          <dt>नाव</dt>
          <dd>{card.fullName}</dd>
          <dt>पद</dt>
          <dd>{card.designation}</dd>
          <dt>ओळखपत्र क्र.</dt>
          <dd>{card.cardNumber}</dd>
          <dt>वैध दिनांक</dt>
          <dd>{formatDate(validUntil)} पर्यंत</dd>
        </dl>
      </div>
      {contactDetails.phone && <p>अधिक माहितीसाठी कार्यालय: {contactDetails.phone}</p>}
    </article>
  );
}
