import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "ब्रेकिंग न्यूज",
  description: "Breaking news from Swarajya News.",
  alternates: { canonical: "/breaking-news" },
};

export default function Page() {
  return (
    <section className="section">
      <h1>ब्रेकिंग न्यूज</h1>
      <EmptyState>अद्याप बातम्या प्रकाशित झालेल्या नाहीत.</EmptyState>
    </section>
  );
}
