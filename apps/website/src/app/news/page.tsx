import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "ताज्या बातम्या",
  description: "Latest news from Swarajya News.",
  alternates: { canonical: "/news" },
};

export default function Page() {
  return (
    <section className="section">
      <h1>ताज्या बातम्या</h1>
      <EmptyState>अद्याप बातम्या प्रकाशित झालेल्या नाहीत.</EmptyState>
    </section>
  );
}
