import fs from "fs";
import path from "path";
import { optionalGroupOf } from "@/lib/groups";

const ROOT = process.cwd();
const MCQ_DIR = path.join(ROOT, "public", "data", "mcqs");
const NOTES_DIR = path.join(ROOT, "public", "data", "revision-notes");
const ANALYSIS_DIR = path.join(ROOT, "public", "data", "markdown");

const CANONICAL: Record<string, string> = {
  accounting: "accountancy-and-auditing",
  "accountancy-auditing": "accountancy-and-auditing",
  baloch: "balochi",
  econ: "economics",
  english: "english-precis-and-composition",
  "english-(precis-and-composition)": "english-precis-and-composition",
  "css-english-precis-and-composition": "english-precis-and-composition",
  "general-science-ability": "general-science-and-ability",
  "general-science-and-abiliy": "general-science-and-ability",
  "governance-public-policies": "governance-and-public-policies",
  "governence-and-public-policy": "governance-and-public-policies",
  journalism: "journalism-and-mass-communication",
  "journalism-mass-communication": "journalism-and-mass-communication",
  ir: "international-relations",
  "pakistan-affairs-2": "pakistan-affairs",
  philosphy: "philosophy",
  "political-science-2": "political-science",
  pushto: "pashto",
  "town-and-urban-planning": "town-planning-and-urban-management",
  "town-planning": "town-planning-and-urban-management",
  "town-planning-urban-management": "town-planning-and-urban-management",
};

const COMPULSORY = new Set([
  "essay",
  "english-precis-and-composition",
  "general-science-and-ability",
  "current-affairs",
  "pakistan-affairs",
  "islamic-studies",
  "comparative-studies-of-major-religions",
]);

export type SubjectGroup = "compulsory" | "optional";

export type SubjectSummary = {
  slug: string;
  name: string;
  group: SubjectGroup;
  papers: number;
  paperRange: string;
  easy: number;
  medium: number;
  hard: number;
  notes: number;
  links: number;
  hasAnalysis: boolean;
  optionalGroup: number | null;
  sheets: { id: string; year: number; paper?: "I" | "II"; title: string }[];
};

export type PastPaper = {
  id: string;
  year: number;
  paper?: "I" | "II";
  title: string;
  pdf?: string;
  page?: string;
  file?: string;
};

export type StudyResource = {
  title: string;
  url?: string;
  type: string;
  description?: string;
};

export type StudyNote = {
  id: string;
  title: string;
  content: string;
  keyTakeaways: string[];
  category: string;
  importance: "high" | "medium" | "low";
  topics: string[];
  resources: StudyResource[];
};

export type SubjectDetail = SubjectSummary & {
  easy: number;
  medium: number;
  hard: number;
  papers: number;
  years: number;
  notes: number;
  hasAnalysis: boolean;
};

export type PaperYear = {
  year: number;
  questions: string[];
};

type RawResource = {
  title?: string;
  url?: string;
  type?: string;
  description?: string;
};

type RawNote = {
  id?: string;
  title?: string;
  content?: string;
  keyTakeaways?: string[];
  resources?: RawResource[];
  importance?: string;
  category?: string;
  topics?: string[];
  relatedTopics?: string[];
};

type RawNotesFile = {
  subject?: string;
  categories?: string[];
  notes?: RawNote[];
};

let catalogCache: SubjectSummary[] | null = null;
const detailCache = new Map<string, SubjectDetail>();
const paperCache = new Map<string, PaperYear[]>();
type RawNotesBundle = { name: string; categories: string[]; notes: RawNote[] };
const notesCache = new Map<string, RawNotesBundle>();
const analysisCache = new Map<string, string | null>();

function canonicalSlug(slug: string) {
  return CANONICAL[slug] || slug;
}

function sourceSlugs(slug: string) {
  const aliases = Object.entries(CANONICAL)
    .filter(([, target]) => target === slug)
    .map(([alias]) => alias);
  return [slug, ...aliases];
}

function titleCase(slug: string) {
  const small = new Set(["of", "and", "the"]);
  return slug
    .split("-")
    .map((word, index) => {
      if (word === "usa") return "USA";
      if (word === "css") return "CSS";
      if (index > 0 && small.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function cleanName(name: string) {
  return name
    .replace(/\s*\((?:CSS|FPSC|PMS)[^)]*\)\s*/gi, " ")
    .replace(/^CSS\s+/i, "")
    .replace(/\s+[—–-]\s+.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readText(filePath: string) {
  const buf = fs.readFileSync(filePath);
  let nulls = 0;
  const sample = Math.min(buf.length, 240);
  for (let i = 0; i < sample; i += 1) {
    if (buf[i] === 0) nulls += 1;
  }
  const utf16 =
    (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) || nulls > sample / 4;
  if (utf16) {
    const start = buf[0] === 0xff && buf[1] === 0xfe ? 2 : 0;
    return buf.subarray(start).toString("utf16le").replace(/^\uFEFF/, "");
  }
  return buf.toString("utf8").replace(/^\uFEFF/, "");
}

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = readText(filePath).trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function listDirs(dir: string) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function notePaths(slug: string) {
  return sourceSlugs(slug)
    .map((source) => path.join(NOTES_DIR, `${source}.json`))
    .filter((filePath) => {
      if (!fs.existsSync(filePath)) return false;
      return fs.statSync(filePath).size > 2;
    });
}

function analysisPath(slug: string) {
  const preferred = path.join(ANALYSIS_DIR, `${slug}-analysis.md`);
  if (fs.existsSync(preferred) && fs.statSync(preferred).size > 0) return preferred;
  const candidates = sourceSlugs(slug)
    .map((source) => path.join(ANALYSIS_DIR, `${source}-analysis.md`))
    .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).size > 0);
  candidates.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
  return candidates[0] || null;
}

function mcqPath(slug: string, level: "EASY" | "MEDIUM" | "HARD") {
  const filePath = path.join(MCQ_DIR, slug, `${level}.json`);
  return fs.existsSync(filePath) ? filePath : null;
}

function countQuestions(slug: string, level: "EASY" | "MEDIUM" | "HARD") {
  const filePath = mcqPath(slug, level);
  if (!filePath) return 0;
  const raw = readText(filePath);
  return raw.match(/"question"\s*:/g)?.length || 0;
}

export function extractPaperYears(raw: string): PaperYear[] {
  const text = raw
    .replace(/\\'/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "");
  const buckets = new Map<number, string[]>();

  const add = (year: number, prompt: string) => {
    if (year < 1990 || year > 2026) return;
    const clean = prompt
      .replace(/\s+/g, " ")
      .replace(/^[\s:;.\-–]+/, "")
      .replace(/[\s;]+$/, "")
      .trim();
    if (clean.length < 18 || clean.length > 420) return;
    if (/^\d{4}\s*[-–]\s*\d{4}$/.test(clean)) return;
    const list = buckets.get(year) || [];
    const key = clean.toLowerCase().replace(/^q\.?\s*\d+\s*[.)]\s*/i, "");
    if (list.some((item) => item.toLowerCase().replace(/^q\.?\s*\d+\s*[.)]\s*/i, "") === key)) {
      return;
    }
    list.push(clean);
    buckets.set(year, list);
  };

  const marker = /(?<![0-9])((?:19|20)\d{2})\s*:\s*/g;
  const marks: { year: number; from: number; at: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = marker.exec(text))) {
    marks.push({
      year: Number(match[1]),
      at: match.index,
      from: match.index + match[0].length,
    });
  }
  for (let index = 0; index < marks.length; index += 1) {
    const end = marks[index + 1]?.at ?? Math.min(text.length, marks[index].from + 900);
    const body = text.slice(marks[index].from, end).split(/\n\s*\n/)[0] || "";
    for (const bit of body.split(/;\s+/)) add(marks[index].year, bit);
  }

  const paren =
    /([^()\n]{18,220}?)\s*\(\s*((?:(?:19|20)\d{2}\s*,\s*)*(?:19|20)\d{2})\s*\)/g;
  while ((match = paren.exec(text))) {
    const prompt = match[1].replace(/^[\s\-•]+/, "").trim();
    for (const year of match[2].match(/(?:19|20)\d{2}/g) || []) add(Number(year), prompt);
  }

  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, questions]) => ({
      year,
      questions: questions.slice(0, 24),
    }));
}

function loadRawNotes(slug: string): RawNotesBundle {
  const cached = notesCache.get(slug);
  if (cached) return cached;
  const notes: RawNote[] = [];
  let name = "";
  const categories = new Set<string>();
  for (const filePath of notePaths(slug)) {
    const data = readJson<RawNotesFile>(filePath);
    if (!data) continue;
    if (!name && data.subject) name = cleanName(data.subject);
    for (const category of data.categories || []) categories.add(category);
    for (const note of data.notes || []) notes.push(note);
  }
  const loaded = { name, categories: [...categories], notes: dedupeNotes(notes) };
  notesCache.set(slug, loaded);
  return loaded;
}

function dedupeNotes(notes: RawNote[]) {
  const seen = new Set<string>();
  const unique: RawNote[] = [];
  for (const note of notes) {
    const key = (note.title || note.id || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(note);
  }
  return unique;
}

let pastPaperFile: Record<string, RawPaper[] | string> | null = null;

function loadPastPaperFile() {
  if (pastPaperFile) return pastPaperFile;
  pastPaperFile = readJson<Record<string, RawPaper[] | string>>(path.join(ROOT, "data", "past-papers.json")) || {};
  return pastPaperFile;
}

function toPastPapers(slug: string): PastPaper[] {
  const cached = pastPaperCache.get(slug);
  if (cached) return cached;
  const all = loadPastPaperFile();
  const entries = all[slug];
  const papers: PastPaper[] = [];
  const seen = new Set<string>();
  if (Array.isArray(entries)) {
    for (const entry of entries) {
      const year = Number(entry.year);
      const hasSource = Boolean((entry.pdf || "").trim() || ((entry.page || "").trim() && (entry.file || "").trim()));
      if (!year || !hasSource) continue;
      const paper = entry.paper === "I" || entry.paper === "II" ? entry.paper : undefined;
      const id = (entry.id || `${year}${paper ? `-${paper.toLowerCase()}` : ""}`).trim();
      if (seen.has(id)) continue;
      seen.add(id);
      papers.push({
        id,
        year,
        paper,
        title: (entry.title || `${year}${paper ? ` Paper-${paper}` : ""}`).trim(),
        pdf: entry.pdf?.trim() || undefined,
        page: entry.page?.trim() || undefined,
        file: entry.file?.trim() || undefined,
      });
    }
  }
  papers.sort((a, b) => b.year - a.year || (a.paper || "").localeCompare(b.paper || ""));
  pastPaperCache.set(slug, papers);
  return papers;
}

type RawPaper = {
  id?: string;
  year?: number | string;
  paper?: string;
  title?: string;
  pdf?: string;
  page?: string;
  file?: string;
};

const pastPaperCache = new Map<string, PastPaper[]>();

export function getPastPaper(slug: string, id: string) {
  return toPastPapers(slug).find((paper) => paper.id === id) || null;
}

function toStudyNotes(notes: RawNote[]): StudyNote[] {
  return notes.map((note, index) => ({
    id: note.id || `note-${index + 1}`,
    title: note.title || "Note",
    content: note.content || "",
    keyTakeaways: note.keyTakeaways || [],
    category: note.category || "General",
    importance: toImportance(note.importance),
    topics: note.topics || note.relatedTopics || [],
    resources: (note.resources || [])
      .filter((resource) => resource.title)
      .filter((resource) => !resource.url || !/vercel\.app/i.test(resource.url))
      .map((resource) => ({
        title: resource.title || "Resource",
        url: resource.url,
        type: resource.type || "link",
        description: resource.description,
      })),
  }));
}

function toImportance(value?: string): StudyNote["importance"] {
  const v = (value || "").toLowerCase();
  if (v.startsWith("high") || v === "critical") return "high";
  if (v.startsWith("low")) return "low";
  return "medium";
}

function buildCatalog() {
  const slugs = new Set<string>();
  for (const slug of listDirs(MCQ_DIR)) slugs.add(canonicalSlug(slug));
  if (fs.existsSync(NOTES_DIR)) {
    for (const fileName of fs.readdirSync(NOTES_DIR)) {
      if (!fileName.endsWith(".json")) continue;
      const filePath = path.join(NOTES_DIR, fileName);
      if (fs.statSync(filePath).size <= 2) continue;
      slugs.add(canonicalSlug(fileName.replace(/\.json$/, "")));
    }
  }
  if (fs.existsSync(ANALYSIS_DIR)) {
    for (const fileName of fs.readdirSync(ANALYSIS_DIR)) {
      if (!fileName.endsWith("-analysis.md")) continue;
      slugs.add(canonicalSlug(fileName.replace(/-analysis\.md$/, "")));
    }
  }

  const subjects: SubjectSummary[] = [...slugs].map((slug) => {
    const notes = loadRawNotes(slug);
    const papers = toPastPapers(slug);
    const links = notes.notes.reduce((total, note) => total + (note.resources?.length || 0), 0);
    return {
      slug,
      name: notes.name || titleCase(slug),
      group: COMPULSORY.has(slug) ? "compulsory" : "optional",
      papers: papers.length,
      paperRange: papers.length
        ? papers.length > 1 && papers[papers.length - 1].year !== papers[0].year
          ? `${papers[papers.length - 1].year}–${papers[0].year}`
          : String(papers[0].year)
        : "",
      easy: countQuestions(slug, "EASY"),
      medium: countQuestions(slug, "MEDIUM"),
      hard: countQuestions(slug, "HARD"),
      notes: notes.notes.length,
      links,
      hasAnalysis: Boolean(analysisPath(slug)),
      optionalGroup: COMPULSORY.has(slug) ? null : optionalGroupOf(slug),
      sheets: papers.map(({ id, year, paper, title }) => ({ id, year, paper, title })),
    };
  });

  subjects.sort((a, b) => a.name.localeCompare(b.name));
  return subjects;
}

export function getSubjects() {
  if (!catalogCache) catalogCache = buildCatalog();
  return catalogCache;
}

export function getLibraryStats() {
  const subjects = getSubjects();
  return {
    subjects: subjects.length,
    papers: subjects.reduce((total, subject) => total + subject.papers, 0),
    studies: subjects.filter((subject) => subject.hasAnalysis).length,
    mcqs: subjects.reduce((total, subject) => total + subject.easy + subject.medium + subject.hard, 0),
    notes: subjects.reduce((total, subject) => total + subject.notes, 0),
    links: subjects.reduce((total, subject) => total + subject.links, 0),
  };
}

export function getSubject(slug: string): SubjectDetail | null {
  const cached = detailCache.get(slug);
  if (cached) return cached;
  const summary = getSubjects().find((subject) => subject.slug === slug);
  if (!summary) return null;
  const detail: SubjectDetail = { ...summary, years: summary.papers };
  detailCache.set(slug, detail);
  return detail;
}

export function getPaperYears(slug: string) {
  const cached = paperCache.get(slug);
  if (cached) return cached;
  const markdown = getAnalysis(slug);
  const years = markdown ? extractPaperYears(markdown) : [];
  paperCache.set(slug, years);
  return years;
}

export function getPastPapers(slug: string) {
  return toPastPapers(slug);
}

export function getStudyNotes(slug: string) {
  const loaded = loadRawNotes(slug);
  return {
    categories: loaded.categories.length
      ? loaded.categories
      : [...new Set(toStudyNotes(loaded.notes).map((note) => note.category))],
    notes: toStudyNotes(loaded.notes),
  };
}

export function cleanAnalysisMarkdown(raw: string) {
  const text = raw
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\([\\`*_{}[\]()#+\-.!~])/g, "$1")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n");

  const out: string[] = [];
  for (const original of text.split("\n")) {
    let line = original.trim();
    if (!line || line === "<!-- -->") {
      out.push("");
      continue;
    }
    const isBullet = /^(?:[-*]\s+|\s*|•\s*)/.test(line);
    if (isBullet) {
      line = line.replace(/^[-*•]+\s*/, "");
      out.push(`- ${line}`);
      continue;
    }
    const heading =
      /^\*\*/.test(line) && line.length < 170 && (line.match(/\*\*/g) || []).length >= 1;
    if (heading) {
      const inner = line.replace(/\*/g, "").trim();
      if (inner) {
        out.push(`${/^\d/.test(inner) ? "##" : "###"} ${inner}`);
        continue;
      }
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function getAnalysis(slug: string) {
  if (analysisCache.has(slug)) return analysisCache.get(slug) ?? null;
  const filePath = analysisPath(slug);
  const markdown = filePath ? cleanAnalysisMarkdown(readText(filePath)) : null;
  analysisCache.set(slug, markdown);
  return markdown;
}
