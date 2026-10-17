import { EmptyState } from "@/components/EmptyState";

const SECTIONS = [
  { id: "latest", title: "ताज्या बातम्या" },
  { id: "video", title: "व्हिडिओ बातम्या" },
  { id: "shorts", title: "शॉर्ट व्हिडिओ" },
  { id: "district", title: "जिल्हानिहाय बातम्या" },
] as const;

// News feeds are connected to Firestore in Milestone 6; until then the
// homepage renders its layout with empty states.
export default function HomePage() {
  return (
    <>
      <div className="breaking" role="status">
        <span className="label">ब्रेकिंग</span>
        <span>सध्या कोणतीही ब्रेकिंग न्यूज नाही.</span>
      </div>
      {SECTIONS.map((section) => (
        <section key={section.id} className="section" aria-labelledby={`h-${section.id}`}>
          <h2 id={`h-${section.id}`}>{section.title}</h2>
          <EmptyState>अद्याप बातम्या प्रकाशित झालेल्या नाहीत.</EmptyState>
        </section>
      ))}
    </>
  );
}
