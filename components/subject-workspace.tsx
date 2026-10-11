"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { PaperScreen } from "@/components/paper-screen";
import type { PaperYear, PastPaper, StudyNote } from "@/lib/content";
import { getPaperDownloadUrl, getPaperUrl } from "@/lib/load-paper";

const Quiz = dynamic(() => import("@/components/quiz").then((m) => m.Quiz), { loading: () => <PaneSkeleton /> });
const AnalysisView = dynamic(() => import("@/components/analysis-view").then((m) => m.AnalysisView), {
  loading: () => <PaneSkeleton />,
});
const NotesList = dynamic(() => import("@/components/notes-list").then((m) => m.NotesList), {
  loading: () => <PaneSkeleton />,
});

export type SectionId = "papers" | "research" | "mcqs" | "resources";

const SECTIONS: { id: SectionId; label: string; title: string }[] = [
  { id: "papers", label: "Past Papers", title: "Past Papers" },
  { id: "research", label: "Research", title: "Research & Analysis" },
  { id: "mcqs", label: "MCQs", title: "AI Powered MCQs" },
  { id: "resources", label: "Resources", title: "Curated Study Resources" },
];

export function SubjectWorkspace({
  slug,
  name,
  papers,
  easy,
  medium,
  hard,
  initial,
}: {
  slug: string;
  name: string;
  papers: PastPaper[];
  easy: number;
  medium: number;
  hard: number;
  initial: SectionId;
}) {
  const [section, setSection] = useState<SectionId>(initial);
  const current = SECTIONS.find((item) => item.id === section) || SECTIONS[0];

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "research" || tab === "mcqs" || tab === "resources") setSection(tab);
  }, []);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-[var(--line)] bg-white px-3 py-3 shadow-[0_8px_24px_-18px_rgba(11,30,91,0.8)]">
        <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Subject sections">
          {SECTIONS.map((item) => {
            const active = item.id === section;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSection(item.id)}
                className={`rounded-xl px-1 py-3 text-[13px] font-extrabold leading-tight ${
                  active ? "bg-[var(--navy)] text-white" : "bg-[#e7edf8] text-[var(--navy)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pb-16 pt-4">
        <h2 className="sr-only">{current.title}</h2>
        <div>
          {section === "papers" ? <Papers slug={slug} name={name} papers={papers} /> : null}
          {section === "research" ? <ResearchPane slug={slug} /> : null}
          {section === "mcqs" ? <Quiz slug={slug} counts={{ EASY: easy, MEDIUM: medium, HARD: hard }} /> : null}
          {section === "resources" ? <ResourcesPane slug={slug} /> : null}
        </div>
      </div>
    </>
  );
}

function Papers({ slug, name, papers }: { slug: string; name: string; papers: PastPaper[] }) {
  const [open, setOpen] = useState<{ paper: PastPaper; openedAt: number } | null>(null);
  const [pickYear, setPickYear] = useState<number | null>(null);

  useEffect(() => {
    void import("@/components/pdf-document")
      .then((mod) => mod.warmPdfWorker())
      .catch((error) => console.error("[paper] Worker warm-up failed", error));
  }, []);

  if (papers.length === 0) {
    return (
      <div className="card px-5 py-6">
        <p className="font-bold text-[var(--navy)]">No past papers added yet</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Add them in <Code>data/past-papers.json</Code> under <Code>&quot;{slug}&quot;</Code> (year + a PDF link, or a
          PDF you put in <Code>public/papers/</Code>).
        </p>
      </div>
    );
  }

  const years = [...new Set(papers.map((paper) => paper.year))].sort((a, b) => b - a);
  const forYear = (year: number) => papers.filter((paper) => paper.year === year);
  const picked = pickYear ? forYear(pickYear) : [];

  function openPaper(paper: PastPaper) {
    setOpen({ paper, openedAt: performance.now() });
  }

  function chooseYear(year: number) {
    const list = forYear(year);
    if (list.length === 1) {
      openPaper(list[0]);
      setPickYear(null);
    } else {
      setPickYear(year);
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        {years[years.length - 1]}–{years[0]} · tap a year to read the paper here.
      </p>
      <div className="grid grid-cols-4 gap-2">
        {years.map((year) => {
          const count = forYear(year).length;
          const active = pickYear === year;
          return (
            <button
              key={year}
              type="button"
              onClick={() => chooseYear(year)}
              className={`relative rounded-2xl py-3.5 text-[15px] font-extrabold transition active:scale-95 ${
                active ? "bg-[var(--blue)] text-white" : "card text-[var(--navy)]"
              }`}
            >
              {year}
              {count > 1 ? (
                <span
                  className={`absolute right-1.5 top-1.5 rounded-full px-1.5 text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-[var(--blue-soft)] text-[var(--blue)]"
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {picked.length > 1 ? (
        <ul className="card mt-4 divide-y divide-[var(--line)] overflow-hidden">
          {picked.map((paper) => (
            <li key={paper.id}>
              <button
                type="button"
                onClick={() => openPaper(paper)}
                className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:bg-[var(--blue-soft)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--navy)] text-xs font-extrabold text-white">
                  {paper.paper || "P"}
                </span>
                <span className="flex-1 text-[15px] font-bold">{paper.title}</span>
                <Chevron />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <PaperScreen
          key={open.paper.id}
          src={getPaperUrl(slug, open.paper.id, open.paper)}
          downloadHref={getPaperDownloadUrl(slug, open.paper.id)}
          title={`${name} · ${open.paper.year}${open.paper.paper ? ` · Paper ${open.paper.paper}` : ""}`}
          openedAt={open.openedAt}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

function ResearchPane({ slug }: { slug: string }) {
  const [data, setData] = useState<{ analysis: string | null; years: PaperYear[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/subject/${slug}/research`)
      .then((response) => {
        if (!response.ok) throw new Error("failed");
        return response.json();
      })
      .then((payload) => {
        if (live) setData(payload);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [slug]);

  if (failed) return <Empty>The analysis could not be loaded.</Empty>;
  if (!data) return <div className="card h-64 animate-pulse" />;
  return <Research years={data.years} analysis={data.analysis} />;
}

function ResourcesPane({ slug }: { slug: string }) {
  const [data, setData] = useState<{ notes: StudyNote[]; categories: string[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/subject/${slug}/resources`)
      .then((response) => {
        if (!response.ok) throw new Error("failed");
        return response.json();
      })
      .then((payload) => {
        if (live) setData(payload);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [slug]);

  if (failed) return <Empty>The notes could not be loaded.</Empty>;
  if (!data) return <div className="card h-64 animate-pulse" />;
  if (data.notes.length === 0) return <Empty>No study notes were saved for this subject.</Empty>;
  return (
    <div>
      <p className="mb-3 text-sm leading-6 text-[var(--muted)]">
        Notes saved for this subject, in the priority they were written, with the links attached to each one.
      </p>
      <NotesList notes={data.notes} categories={data.categories} />
    </div>
  );
}

function Research({ years, analysis }: { years: PaperYear[]; analysis: string | null }) {
  const [view, setView] = useState<"analysis" | "years">("analysis");
  const [year, setYear] = useState(years[0]?.year ?? 0);
  const selected = years.find((item) => item.year === year) || years[0];

  if (!analysis && years.length === 0) {
    return <Empty>No research was saved for this subject.</Empty>;
  }

  return (
    <div>
      {years.length > 0 && analysis ? (
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-[#e4e9f5] p-1">
          {(["analysis", "years"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`rounded-xl py-2.5 text-sm font-bold ${
                view === item ? "bg-white text-[var(--navy)] shadow-sm" : "text-[var(--muted)]"
              }`}
            >
              {item === "analysis" ? "Full analysis" : "Questions by year"}
            </button>
          ))}
        </div>
      ) : null}

      {view === "analysis" && analysis ? <AnalysisView markdown={analysis} /> : null}

      {(view === "years" || !analysis) && selected ? (
        <div>
          <p className="mb-3 text-sm text-[var(--muted)]">What the examiner actually asked, year by year.</p>
          <div className="flex flex-wrap gap-2">
            {years.map((item) => (
              <button
                key={item.year}
                type="button"
                onClick={() => setYear(item.year)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${
                  item.year === selected.year
                    ? "bg-[var(--blue)] text-white"
                    : "bg-white text-[var(--navy)] ring-1 ring-[var(--line)]"
                }`}
              >
                {item.year}
              </button>
            ))}
          </div>
          <ol className="card mt-3 divide-y divide-[var(--line)] overflow-hidden">
            {selected.questions.map((question, index) => (
              <li key={`${selected.year}-${question}`} className="flex gap-3 px-4 py-3.5">
                <span className="mt-0.5 w-7 shrink-0 text-sm font-extrabold text-[var(--blue)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-[15px] leading-6">{question}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function PaneSkeleton() {
  return <div className="card h-64 animate-pulse" />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card px-5 py-6 text-[var(--muted)]">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-[var(--blue-soft)] px-1.5 py-0.5 text-xs text-[var(--blue)]">{children}</code>;
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[var(--muted)]">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
