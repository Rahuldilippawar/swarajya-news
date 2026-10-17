import Link from "next/link";

export function Section({ id, title, href, children }: { id: string; title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="section" aria-labelledby={`h-${id}`}>
      <div className="section-head">
        <h2 id={`h-${id}`}>{title}</h2>
        {href && <Link href={href}>सर्व पाहा →</Link>}
      </div>
      {children}
    </section>
  );
}
