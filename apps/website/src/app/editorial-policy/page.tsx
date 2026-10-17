import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "संपादकीय धोरण",
  description: "Editorial Policy of Swarajya News.",
  alternates: { canonical: "/editorial-policy" },
};

// Placeholder: the final text must be written and approved by Swarajya News management before launch.
export default function Page() {
  return (
    <article className="prose">
      <h1>संपादकीय धोरण</h1>
      <p>हे धोरण सध्या तयार केले जात आहे आणि लवकरच प्रकाशित केले जाईल.</p>
    </article>
  );
}
