import Link from "next/link";

const SECTIONS = [
  { id: "papers", label: "Past papers" },
  { id: "practice", label: "Practice" },
  { id: "analysis", label: "Analysis" },
  { id: "notes", label: "Notes" },
] as const;

export function SectionNav({
  slug,
  current,
}: {
  slug: string;
  current: (typeof SECTIONS)[number]["id"];
}) {
  return (
    <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Subject sections">
      {SECTIONS.map((section) => {
        const active = section.id === current;
        return (
          <Link
            key={section.id}
            href={`/subjects/${slug}/${section.id}`}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium ${
              active
                ? "bg-[#1e4f8a] text-white"
                : "bg-[#e6ebf1] text-[#1c2834]"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
