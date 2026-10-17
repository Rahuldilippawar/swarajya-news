import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "व्हिडिओ बातम्या",
  description: "Video news reports from Swarajya News.",
  alternates: { canonical: "/video-news" },
};

export default function Page() {
  return (
    <section className="section">
      <h1>व्हिडिओ बातम्या</h1>
      <EmptyState>अद्याप बातम्या प्रकाशित झालेल्या नाहीत.</EmptyState>
    </section>
  );
}
