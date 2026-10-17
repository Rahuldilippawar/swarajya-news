import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "संपर्क",
  description: "Contact Swarajya News.",
  alternates: { canonical: "/contact" },
};

/** Contact details come from Admin → Settings. */
export default async function ContactPage() {
  const { contactDetails: c, channelName } = await getSettings();
  const hasAny = c.phone || c.whatsapp || c.email || c.address;
  const digits = (v: string) => v.replace(/[^\d+]/g, "");
  return (
    <article className="prose">
      <h1>संपर्क</h1>
      {!hasAny && <p>संपर्काचे तपशील लवकरच येथे उपलब्ध होतील.</p>}
      {hasAny && (
        <ul className="contact-list">
          <li><strong>{channelName}</strong></li>
          {c.phone && <li>फोन: <a href={`tel:${digits(c.phone)}`}>{c.phone}</a></li>}
          {c.whatsapp && <li>WhatsApp: <a href={`https://wa.me/${digits(c.whatsapp).replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer">{c.whatsapp}</a></li>}
          {c.email && <li>ईमेल: <a href={`mailto:${c.email}`}>{c.email}</a></li>}
          {c.address && <li style={{ whiteSpace: "pre-line" }}>पत्ता: {c.address}</li>}
        </ul>
      )}
    </article>
  );
}
