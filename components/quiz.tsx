"use client";

import { useEffect, useRef, useState } from "react";
import { sectionName } from "@/lib/mcq-sections";

type Level = "EASY" | "MEDIUM" | "HARD";

type Question = {
  id: string;
  sectionIndex: number;
  question: string;
  options: string[];
  correct: string;
};

type Answer = { question: Question; picked: string };

const ROUND_SIZE = 10;
const SECTIONS_PER_ROUND = 4;

const LEVELS: { id: Level; label: string; hint: string; bars: number; fill: string }[] = [
  { id: "EASY", label: "Easy", hint: "Facts and definitions", bars: 1, fill: "#38bdf8" },
  { id: "MEDIUM", label: "Medium", hint: "How the ideas connect", bars: 2, fill: "#1f4fd8" },
  { id: "HARD", label: "Hard", hint: "Judgement and comparison", bars: 3, fill: "#0b1e5b" },
];

function letterOf(value: string) {
  const match = value.trim().match(/^([A-D])/i);
  return match ? match[1].toUpperCase() : value.trim();
}

function isCorrect(option: string, correct: string) {
  return letterOf(option) === letterOf(correct);
}

/** Repairs mangled quotes/dashes left over from the original text export. */
function fixText(value: string) {
  return value
    .replace(/\?Ts/g, "’s")
    .replace(/\?T/g, "’")
    .replace(/\?o/g, "“")
    .replace(/\?\?/g, "”?")
    .replace(/\?"/g, "–")
    .replace(/\?\s/g, "” ");
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function storageKey(slug: string, level: Level) {
  return `preptra:practiced:${slug}:${level}`;
}

function loadPracticed(slug: string, level: Level): number[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(slug, level)) || "[]");
  } catch {
    return [];
  }
}

function savePracticed(slug: string, level: Level, sections: number[]) {
  try {
    localStorage.setItem(storageKey(slug, level), JSON.stringify(sections));
  } catch {
    // ignore
  }
}

/** A round stays on a few topics, so the rest are still waiting and worth another round. */
function pickRound(items: Question[], practiced: number[]) {
  const bySection = new Map<number, Question[]>();
  for (const item of items) {
    const list = bySection.get(item.sectionIndex) || [];
    list.push(item);
    bySection.set(item.sectionIndex, list);
  }
  const sections = [...bySection.keys()];
  const fresh = shuffle(sections.filter((s) => !practiced.includes(s)));
  const seen = shuffle(sections.filter((s) => practiced.includes(s)));
  const chosen = [...fresh, ...seen].slice(0, SECTIONS_PER_ROUND);
  const perSection = Math.max(2, Math.ceil(ROUND_SIZE / Math.max(chosen.length, 1)));
  const round: Question[] = [];
  for (const section of chosen) {
    round.push(...shuffle(bySection.get(section) || []).slice(0, perSection));
  }
  return shuffle(round).slice(0, ROUND_SIZE);
}

export function Quiz({ slug, counts }: { slug: string; counts: Record<Level, number> }) {
  const [level, setLevel] = useState<Level | null>(null);
  const [pool, setPool] = useState<Question[]>([]);
  const [totalSections, setTotalSections] = useState(10);
  const [round, setRound] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const topRef = useRef<HTMLDivElement>(null);

  async function start(nextLevel: Level) {
    setLevel(nextLevel);
    setStatus("loading");
    setFinished(false);
    setPicked(null);
    setAnswers([]);
    setIndex(0);
    try {
      let items = pool;
      if (nextLevel !== level || items.length === 0) {
        const response = await fetch(`/data/mcqs/${slug}/${nextLevel}.json`);
        if (!response.ok) {
          setPool([]);
          setStatus("empty");
          return;
        }
        const data = (await response.json()) as { items?: Question[]; totalSections?: number };
        items = (data.items || []).filter((item) => item.question && item.options?.length);
        setPool(items);
        setTotalSections(data.totalSections || 10);
      }
      if (items.length === 0) {
        setStatus("empty");
        return;
      }
      setRound(pickRound(items, loadPracticed(slug, nextLevel)));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function finishRound(all: Answer[]) {
    if (!level) return;
    const practiced = new Set(loadPracticed(slug, level));
    for (const answer of all) practiced.add(answer.question.sectionIndex);
    savePracticed(slug, level, [...practiced]);
    setFinished(true);
  }

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [index, finished]);

  if (!level) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-[var(--muted)]">
          Ten questions a round, drawn from a few topics. Come back for the ones still left.
        </p>
        {LEVELS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => start(item.id)}
            className="card w-full px-4 py-4 text-left active:scale-[0.99]"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[16px] font-extrabold text-[var(--navy)]">{item.label}</span>
              <span className="text-xs font-bold text-[var(--muted)]">{counts[item.id].toLocaleString("en-US")} questions</span>
            </span>
            <span className="mt-1 block text-sm text-[var(--muted)]">{item.hint}</span>
            <span className="mt-3 flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((bar) => (
                <span
                  key={bar}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: bar < item.bars ? item.fill : "#e4e9f5" }}
                />
              ))}
            </span>
          </button>
        ))}
      </div>
    );
  }

  if (status === "loading") return <p className="card px-5 py-6 text-[var(--muted)]">Loading questions…</p>;
  if (status === "error") return <p className="card px-5 py-6 text-[var(--muted)]">The questions could not be loaded.</p>;

  if (status === "empty" || round.length === 0) {
    return (
      <div className="card px-5 py-6">
        <p className="text-[var(--muted)]">No questions were saved for this level.</p>
        <button type="button" onClick={() => setLevel(null)} className="mt-4 text-sm font-bold text-[var(--blue)]">
          Choose another level
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div ref={topRef}>
        <Result
          slug={slug}
          level={level}
          answers={answers}
          totalSections={totalSections}
          onRetry={() => start(level)}
          onLevels={() => setLevel(null)}
        />
      </div>
    );
  }

  const question = round[index];
  const answered = picked !== null;

  function choose(option: string) {
    if (answered) return;
    setPicked(option);
    setAnswers((list) => [...list, { question, picked: option }]);
  }

  function next() {
    if (index + 1 >= round.length) {
      finishRound(answers);
      return;
    }
    setIndex((value) => value + 1);
    setPicked(null);
  }

  return (
    <div ref={topRef} className="scroll-mt-20">
      <div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
        <button type="button" onClick={() => setLevel(null)} className="text-[var(--blue)]">
          ← Levels
        </button>
        <span>
          {LEVELS.find((item) => item.id === level)?.label} · {index + 1} / {round.length}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4e9f5]">
        <div className="h-full rounded-full bg-[var(--blue)] transition-all" style={{ width: `${((index + (answered ? 1 : 0)) / round.length) * 100}%` }} />
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--blue)]">
        {sectionName(slug, question.sectionIndex)}
      </p>
      <div className="card mt-2 px-5 py-5">
        <h3 className="text-[17px] font-bold leading-7 text-[var(--navy)]">{fixText(question.question)}</h3>
      </div>
      <div className="mt-3 grid gap-2">
        {question.options.map((option) => {
          const correct = isCorrect(option, question.correct);
          const selected = picked === option;
          let tone = "card";
          if (answered && correct) tone = "rounded-[20px] border-2 border-emerald-500 bg-emerald-50";
          else if (answered && selected) tone = "rounded-[20px] border-2 border-rose-400 bg-rose-50";
          return (
            <button key={option} type="button" onClick={() => choose(option)} className={`${tone} px-4 py-3.5 text-left text-[15px] font-medium`}>
              {fixText(option)}
            </button>
          );
        })}
      </div>

      {answered ? (
        <button type="button" onClick={next} className="sticky bottom-3 mt-3 w-full rounded-2xl bg-[var(--blue)] py-3.5 text-[15px] font-bold text-white">
          {index + 1 === round.length ? "See result" : "Next question"}
        </button>
      ) : null}
    </div>
  );
}

function Result({
  slug,
  level,
  answers,
  totalSections,
  onRetry,
  onLevels,
}: {
  slug: string;
  level: Level;
  answers: Answer[];
  totalSections: number;
  onRetry: () => void;
  onLevels: () => void;
}) {
  const score = answers.filter((a) => isCorrect(a.picked, a.question.correct)).length;
  const pct = Math.round((score / answers.length) * 100);
  const practiced = loadPracticed(slug, level);
  const remaining = Array.from({ length: totalSections }, (_, i) => i).filter((i) => !practiced.includes(i));
  const message =
    pct >= 80 ? "Excellent — you own this level." : pct >= 50 ? "Good. Keep closing the gaps." : "Review the topics and go again.";

  return (
    <div className="space-y-4">
      <div className="card px-5 py-7 text-center">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-full" style={{ background: `conic-gradient(var(--blue) ${pct}%, #e4e9f5 0)` }}>
          <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-white">
            <span className="text-2xl font-extrabold text-[var(--navy)]">{pct}%</span>
          </div>
        </div>
        <p className="mt-4 text-2xl font-extrabold text-[var(--navy)]">
          {score} / {answers.length}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
      </div>

      <div className="card overflow-hidden">
        <div className={`px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-white ${remaining.length ? "bg-rose-600" : "bg-emerald-600"}`}>
          {remaining.length ? `${remaining.length} topics still left — take another round` : "Every topic at this level is covered"}
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Your progress</span>
            <span className="text-[var(--blue)]">
              {practiced.length} / {totalSections}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4e9f5]">
            <div className="h-full rounded-full bg-[var(--blue)]" style={{ width: `${(practiced.length / totalSections) * 100}%` }} />
          </div>
          <p className="mt-4 text-xs font-bold text-emerald-700">Practiced ({practiced.length})</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {practiced.map((i) => (
              <span key={i} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                {sectionName(slug, i)}
              </span>
            ))}
          </div>
          {remaining.length ? (
            <>
              <p className="mt-4 text-xs font-bold text-rose-700">Remaining ({remaining.length})</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {remaining.map((i) => (
                  <span key={i} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
                    {sectionName(slug, i)}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-rose-900">
                These topics have not come up yet. The next round is drawn from them.
              </p>
            </>
          ) : null}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">Review your answers</h3>
        <ul className="space-y-2">
          {answers.map((answer, i) => {
            const ok = isCorrect(answer.picked, answer.question.correct);
            return (
              <li key={answer.question.id} className={`rounded-[20px] border px-4 py-3.5 ${ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white ${ok ? "bg-emerald-600" : "bg-rose-600"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-6">{fixText(answer.question.question)}</p>
                    <p className="mt-1 text-xs font-medium text-[var(--muted)]">
                      Your answer: <b className={ok ? "text-emerald-700" : "text-rose-700"}>{letterOf(answer.picked)}</b>
                      {!ok ? (
                        <>
                          {" · "}Correct: <b className="text-emerald-700">{letterOf(answer.question.correct)}</b>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onLevels} className="rounded-2xl bg-[var(--blue-soft)] py-3.5 font-bold text-[var(--blue)]">
          Levels
        </button>
        <button type="button" onClick={onRetry} className="rounded-2xl bg-[var(--blue)] py-3.5 font-bold text-white">
          {remaining.length ? "Take another round" : "New round"}
        </button>
      </div>
    </div>
  );
}

