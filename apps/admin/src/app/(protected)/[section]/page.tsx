import { notFound } from "next/navigation";
import { PLANNED_SECTIONS } from "@/lib/sections";

// Sections that appear in the navigation but are built in later milestones.
// Any other path is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PLANNED_SECTIONS).map((section) => ({ section }));
}

export default async function PlannedSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const planned = PLANNED_SECTIONS[section];
  if (!planned) notFound();

  return (
    <div className="panel-card">
      <h1>{planned.label}</h1>
      <p className="panel-muted">This section is planned for Milestone {planned.milestone}.</p>
    </div>
  );
}
