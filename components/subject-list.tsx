"use client";

import { BookMarked, FileText, LineChart, ListChecks } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SubjectIcon } from "@/components/subject-icon";
import { SubjectWorkspace } from "@/components/subject-workspace";
import { OPTIONAL_GROUPS } from "@/lib/groups";
import type { SubjectSummary } from "@/lib/content";

type Group = "compulsory" | "optional";

export function SubjectList({ subjects }: { subjects: SubjectSummary[] }) {
  const [group, setGroup] = useState<Group>("compulsory");
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<SubjectSummary | null>(null);

  useEffect(() => {
    const onPop = () => setOpened(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function openSubject(subject: SubjectSummary) {
    setOpened(subject);
    window.history.pushState({ preptra: subject.slug }, "", `/subjects/${subject.slug}`);
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return subjects.filter((subject) => {
      if (needle) return subject.name.toLowerCase().includes(needle);
      return subject.group === group;
    });
  }, [group, query, subjects]);

  const optionalBlocks = useMemo(() => {
    return OPTIONAL_GROUPS.map((block) => ({
      ...block,
      subjects: block.slugs
        .map((slug) => visible.find((subject) => subject.slug === slug))
        .filter((subject): subject is SubjectSummary => Boolean(subject)),
    })).filter((block) => block.subjects.length > 0);
  }, [visible]);

  return (
    <div>
      <div className="card flex items-center gap-3 px-4 py-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[var(--muted)]">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a subject"
          aria-label="Search a subject"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--muted)]"
        />
      </div>

      {!query ? (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-[#e4e9f5] p-1" role="tablist">
          {(["compulsory", "optional"] as const).map((item) => {
            const active = item === group;
            const count = subjects.filter((subject) => subject.group === item).length;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setGroup(item)}
                className={`rounded-xl py-2.5 text-sm font-bold capitalize ${
                  active ? "bg-white text-[var(--navy)] shadow-sm" : "text-[var(--muted)]"
                }`}
              >
                {item} <span className="ml-1 text-xs font-semibold opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="mt-8 text-center text-[var(--muted)]">No subject matches that.</p>
      ) : query || group === "compulsory" ? (
        <ul className="mt-4 space-y-2.5">
          {visible.map((subject) => (
            <SubjectCard key={subject.slug} subject={subject} onOpen={openSubject} />
          ))}
        </ul>
      ) : (
        <div className="mt-2">
          {optionalBlocks.map((block) => (
            <section key={block.id} className="mt-5">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--navy)]">
                  Group {toRoman(block.id)}
                </h2>
                <p className="text-[11px] font-semibold text-[var(--muted)]">{block.marks} marks · choose 1</p>
              </div>
              <ul className="space-y-2.5">
                {block.subjects.map((subject) => (
                  <SubjectCard key={subject.slug} subject={subject} onOpen={openSubject} />
                ))}
              </ul>
            </section>
          ))}
          {visible.some((subject) => !optionalBlocks.some((block) => block.subjects.includes(subject))) ? (
            <section className="mt-5">
              <h2 className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--navy)]">Other</h2>
              <ul className="space-y-2.5">
                {visible
                  .filter((subject) => !optionalBlocks.some((block) => block.subjects.includes(subject)))
                  .map((subject) => (
                    <SubjectCard key={subject.slug} subject={subject} onOpen={openSubject} />
                  ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
      {opened ? <SubjectScreen subject={opened} /> : null}
    </div>
  );
}

function SubjectCard({ subject, onOpen }: { subject: SubjectSummary; onOpen: (subject: SubjectSummary) => void }) {
  const mcqs = subject.easy + subject.medium + subject.hard;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(subject)}
        className="card flex w-full items-center gap-3.5 px-4 py-3.5 text-left active:scale-[0.99]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--blue-soft)] text-[var(--blue)]">
          <SubjectIcon slug={subject.slug} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-[var(--ink)]">{subject.name}</span>
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-[var(--muted)]">
            <span className="inline-flex items-center gap-1">
              <FileText className="h-3 w-3" aria-hidden />
              {subject.papers > 0 ? `${subject.papers} papers` : "No papers"}
            </span>
            {subject.hasAnalysis ? (
              <span className="inline-flex items-center gap-1">
                <LineChart className="h-3 w-3" aria-hidden />
                Analysis
              </span>
            ) : null}
            {mcqs > 0 ? (
              <span className="inline-flex items-center gap-1">
                <ListChecks className="h-3 w-3" aria-hidden />
                {mcqs} MCQs
              </span>
            ) : null}
            {subject.notes > 0 ? (
              <span className="inline-flex items-center gap-1">
                <BookMarked className="h-3 w-3" aria-hidden />
                {subject.notes} notes
              </span>
            ) : null}
          </span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[var(--muted)]">
          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  );
}

function toRoman(value: number) {
  return ["", "I", "II", "III", "IV", "V", "VI", "VII"][value] || String(value);
}

function SubjectScreen({ subject }: { subject: SubjectSummary }) {
  const mcqs = subject.easy + subject.medium + subject.hard;
  const block = OPTIONAL_GROUPS.find((group) => group.id === subject.optionalGroup);
  const label =
    subject.group === "compulsory"
      ? "Compulsory"
      : block
        ? `Optional · Group ${toRoman(block.id)} · ${block.marks} marks`
        : "Optional";

  return (
    <div className="fixed inset-0 z-40 mx-auto max-w-[640px] overflow-y-auto bg-[var(--bg)]">
      <div className="hero text-white">
        <header className="flex h-16 items-center gap-3 px-4">
          <button
            type="button"
            aria-label="Back"
            onClick={() => window.history.back()}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-lg font-extrabold tracking-tight">PrepTra</span>
        </header>
        <div className="px-5 pb-8 pt-1">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <SubjectIcon slug={subject.slug} className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-sky-300">{label}</p>
              <h1 className="mt-0.5 truncate text-[1.65rem] font-extrabold leading-tight tracking-tight">{subject.name}</h1>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Mini value={subject.papers > 0 ? subject.paperRange : "—"} label="Past papers" />
            <Mini value={String(mcqs)} label="MCQs" />
            <Mini value={String(subject.notes)} label="Study notes" />
          </div>
        </div>
      </div>
      <main className="-mt-5 rounded-t-[28px] bg-[var(--bg)]">
        <SubjectWorkspace
          slug={subject.slug}
          name={subject.name}
          papers={subject.sheets || []}
          easy={subject.easy}
          medium={subject.medium}
          hard={subject.hard}
          initial="papers"
        />
      </main>
    </div>
  );
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-2.5 ring-1 ring-white/15">
      <p className="text-sm font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-sky-100/80">{label}</p>
    </div>
  );
}
