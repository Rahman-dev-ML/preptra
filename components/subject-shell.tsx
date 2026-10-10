import { PageFrame } from "@/components/page-frame";
import { SectionNav } from "@/components/section-nav";

export function SubjectShell({
  slug,
  name,
  section,
  children,
}: {
  slug: string;
  name: string;
  section: "papers" | "practice" | "analysis" | "notes";
  children: React.ReactNode;
}) {
  return (
    <PageFrame back>
      <p className="text-sm text-[#5c6b7a]">CSS subject</p>
      <h1 className="mt-1 text-2xl font-semibold text-[#163e6e]">{name}</h1>
      <SectionNav slug={slug} current={section} />
      <div className="mt-6">{children}</div>
    </PageFrame>
  );
}
