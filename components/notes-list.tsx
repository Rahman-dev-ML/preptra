"use client";

import { useMemo, useState } from "react";
import type { StudyNote, StudyResource } from "@/lib/content";

const PRIORITY: Record<StudyNote["importance"], { label: string; dot: string; text: string; bg: string; ring: string; order: number }> = {
  high: { label: "High Priority", dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-200", order: 0 },
  medium: { label: "Medium Priority", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200", order: 1 },
  low: { label: "Low Priority", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", order: 2 },
};

export function NotesList({ notes, categories }: { notes: StudyNote[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState<"all" | StudyNote["importance"]>("all");
  const [openId, setOpenId] = useState<string | null>(notes[0]?.id ?? null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notes
      .filter((note) => {
        if (category !== "all" && note.category !== category) return false;
        if (priority !== "all" && note.importance !== priority) return false;
        if (!needle) return true;
        return (
          note.title.toLowerCase().includes(needle) ||
          note.content.toLowerCase().includes(needle) ||
          note.category.toLowerCase().includes(needle) ||
          note.topics.some((topic) => topic.toLowerCase().includes(needle))
        );
      })
      .sort((a, b) => PRIORITY[a.importance].order - PRIORITY[b.importance].order);
  }, [category, notes, priority, query]);

  const counts = {
    high: notes.filter((n) => n.importance === "high").length,
    medium: notes.filter((n) => n.importance === "medium").length,
    low: notes.filter((n) => n.importance === "low").length,
  };

  return (
    <div>
      <div className="card flex items-center gap-3 px-4 py-3">
        <SearchIcon />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--muted)]"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(["high", "medium", "low"] as const).map((level) => {
          const p = PRIORITY[level];
          const active = priority === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => setPriority(active ? "all" : level)}
              className={`rounded-2xl px-2 py-2.5 text-left ring-1 transition ${active ? `${p.bg} ${p.ring}` : "bg-white ring-[var(--line)]"}`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                <span className={`text-[11px] font-bold uppercase tracking-wide ${p.text}`}>{level}</span>
              </span>
              <span className="mt-0.5 block text-lg font-extrabold text-[var(--navy)]">{counts[level]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {["all", ...categories].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              category === item ? "bg-[var(--navy)] text-white" : "bg-white text-[var(--navy)] ring-1 ring-[var(--line)]"
            }`}
          >
            {item === "all" ? "All" : item}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs font-semibold text-[var(--muted)]">
        Showing {visible.length} of {notes.length} notes
      </p>

      {visible.length === 0 ? (
        <p className="mt-6 text-center text-[var(--muted)]">Nothing matches that.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {visible.map((note) => {
            const open = openId === note.id;
            const p = PRIORITY[note.importance];
            return (
              <li key={note.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : note.id)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left"
                  aria-expanded={open}
                >
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${p.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-6 text-[var(--ink)]">{note.title}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                      <span className={`rounded-full px-2 py-0.5 ${p.bg} ${p.text} ring-1 ${p.ring}`}>{p.label}</span>
                      <span className="rounded-full bg-[#eef1f7] px-2 py-0.5 text-[var(--muted)]">{note.category}</span>
                      {note.topics.length ? (
                        <span className="text-[var(--muted)]">
                          {note.topics.length} {note.topics.length === 1 ? "topic" : "topics"}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={`mt-1 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {open ? (
                  <div className="border-t border-[var(--line)] px-4 pb-4 pt-4">
                    <p className="text-[15px] leading-7">{note.content}</p>

                    {note.topics.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-[var(--navy)]">Related topics</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {note.topics.map((topic) => (
                            <span key={topic} className="rounded-full bg-[#eef1f7] px-2.5 py-1 text-xs font-medium text-[var(--ink)]">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {note.keyTakeaways.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-[#c7d7ff] bg-[var(--blue-soft)] px-4 py-3.5">
                        <p className="flex items-center gap-2 text-sm font-bold text-[var(--navy)]">
                          <StarIcon /> Key takeaways
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#1e3a8a]">
                          {note.keyTakeaways.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--blue)]" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {note.resources.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[#f6f8fc] px-3.5 py-3.5">
                        <p className="flex items-center gap-2 text-sm font-bold text-[var(--navy)]">
                          <LinkIcon /> Online resources ({note.resources.length})
                        </p>
                        <div className="mt-2.5 space-y-2">
                          {note.resources.map((resource) => (
                            <ResourceRow key={`${resource.title}-${resource.url}`} resource={resource} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ResourceRow({ resource }: { resource: StudyResource }) {
  const body = (
    <>
      <span className="mt-0.5 shrink-0">
        <TypeIcon type={resource.type} url={resource.url} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold ${resource.url ? "text-[var(--blue)]" : "text-[var(--ink)]"}`}>{resource.title}</span>
        {resource.description ? <span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{resource.description}</span> : null}
      </span>
    </>
  );
  const className = "flex items-start gap-3 rounded-xl border border-[var(--line)] bg-white px-3 py-3";
  return resource.url ? (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" className={`${className} active:bg-[var(--blue-soft)]`}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

function TypeIcon({ type, url }: { type: string; url?: string }) {
  const t = type.toLowerCase();
  const isPdf = t.includes("pdf") || /\.pdf(\?|$)/i.test(url || "");
  const isVideo = t.includes("video") || t.includes("youtube") || /youtube\.com|youtu\.be/.test(url || "");
  if (isPdf) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-rose-600">
        <path d="M7 3h7l5 5v13H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9.5 17v-5h1.6a1.7 1.7 0 010 3.4H9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (isVideo) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-rose-600">
        <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="text-rose-600">
      <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[var(--muted)]">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[var(--blue)]">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[var(--muted)]">
      <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
