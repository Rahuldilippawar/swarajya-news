import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "संपर्क",
  description: "Contact Swarajya News.",
  alternates: { canonical: "/contact" },
};

// Contact details will come from the appSettings document managed in the Admin Panel.
export default function ContactPage() {
  return (
    <article className="prose">
      <h1>संपर्क</h1>
      <p>संपर्काचे तपशील लवकरच येथे उपलब्ध होतील.</p>
    </article>
  );
}
