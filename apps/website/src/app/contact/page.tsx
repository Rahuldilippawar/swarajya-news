import type { Metadata } from "next";
import { SOCIAL_NAMES } from "@/components/SiteFooter";
import { getSettings } from "@/lib/settings";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "संपर्क",
  description: "Contact Swarajya News.",
  alternates: { canonical: "/contact" },
};

/** Contact details come from Admin → Settings. */
export default async function ContactPage() {
  const { contactDetails: c, channelName, socialLinks, tvChannel } = await getSettings();
  const hasAny = c.phone || c.whatsapp || c.email || c.address || c.editorName;
  const digits = (v: string) => v.replace(/[^\d+]/g, "");
  const social = (Object.keys(SOCIAL_NAMES) as (keyof typeof SOCIAL_NAMES)[]).filter((k) => socialLinks[k]);
  return (
    <article className="prose">
      <h1>संपर्क</h1>
      {!hasAny && <p>संपर्काचे तपशील लवकरच येथे उपलब्ध होतील.</p>}
      {hasAny && (
        <ul className="contact-list">
          <li><strong>{channelName}</strong></li>
          {c.editorName && (
            <li>
              संचालक / मुख्य संपादक: {c.editorName}
              {c.editorPhone && <> — <a href={`tel:${digits(c.editorPhone)}`}>{c.editorPhone}</a></>}
            </li>
          )}
          {c.phone && <li>फोन: <a href={`tel:${digits(c.phone)}`}>{c.phone}</a></li>}
          {c.whatsapp && <li>WhatsApp: <a href={`https://wa.me/${digits(c.whatsapp).replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer">{c.whatsapp}</a></li>}
          {c.email && <li>ईमेल: <a href={`mailto:${c.email}`}>{c.email}</a></li>}
          {c.address && <li style={{ whiteSpace: "pre-line" }}>पत्ता: {c.address}</li>}
        </ul>
      )}
      {tvChannel && <p>टीव्हीवर पाहा: {tvChannel}</p>}
      {social.length > 0 && (
        <>
          <h2>आम्हाला फॉलो करा</h2>
          <ul className="contact-list">
            {social.map((k) => (
              <li key={k}><a href={socialLinks[k]} target="_blank" rel="noopener noreferrer">{SOCIAL_NAMES[k]}</a></li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
