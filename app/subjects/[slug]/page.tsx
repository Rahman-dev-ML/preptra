import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SubjectIcon } from "@/components/subject-icon";
import { SubjectWorkspace } from "@/components/subject-workspace";
import { OPTIONAL_GROUPS } from "@/lib/groups";
import { getPastPapers, getSubject } from "@/lib/content";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const subject = getSubject(slug);
  return { title: subject ? `${subject.name} · PrepTra` : "PrepTra" };
}

export default async function SubjectPage({ params }: Props) {
  const { slug } = await params;
  const subject = getSubject(slug);
  if (!subject) notFound();

  const questions = subject.easy + subject.medium + subject.hard;
  const block = OPTIONAL_GROUPS.find((group) => group.id === subject.optionalGroup);

  return (
    <div className="app-shell">
      <div className="hero text-white">
        <AppHeader back />
        <div className="px-5 pb-8 pt-1">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
              <SubjectIcon slug={subject.slug} className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                {subject.group === "compulsory" ? "Compulsory" : block ? `Optional · Group ${["", "I", "II", "III", "IV", "V", "VI", "VII"][block.id]} · ${block.marks} marks` : "Optional"}
              </p>
              <h1 className="mt-0.5 truncate text-[1.65rem] font-extrabold leading-tight tracking-tight">{subject.name}</h1>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Chip value={subject.papers > 0 ? subject.paperRange : "—"} label="Past papers" />
            <Chip value={String(questions)} label="MCQs" />
            <Chip value={String(subject.notes)} label="Study notes" />
          </div>
        </div>
      </div>
      <main className="-mt-5 rounded-t-[28px] bg-[var(--bg)]">
        <SubjectWorkspace
          slug={subject.slug}
          name={subject.name}
          papers={getPastPapers(slug)}
          easy={subject.easy}
          medium={subject.medium}
          hard={subject.hard}
          initial="papers"
        />
      </main>
    </div>
  );
}

function Chip({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-2.5 ring-1 ring-white/15">
      <p className="text-sm font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-sky-100/80">{label}</p>
    </div>
  );
}
