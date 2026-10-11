import fs from "fs";
import path from "path";
import type { PastPaper } from "@/lib/content";

const DIR = path.join(process.cwd(), "data", "paper-cache");
const PUBLIC_PAPERS = path.join(process.cwd(), "public", "papers");
export const PAPER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const inflight = new Map<string, Promise<string | null>>();

export function cachedPaperPath(slug: string, id: string) {
  return path.join(DIR, slug, `${id}.pdf`);
}

/** A finished PDF on disk. Missing or half-written files are ignored so a reader is never blocked on a download. */
export function readyPaperPath(slug: string, id: string) {
  const cached = cachedPaperPath(slug, id);
  if (isPdf(cached)) return cached;
  const published = path.join(PUBLIC_PAPERS, slug, `${id}.pdf`);
  if (isPdf(published)) return published;
  return null;
}

/**
 * Direct PDFs return immediately. CSS Point papers get a fresh signed link every time —
 * reusing an old signature is what produced "link expired" / empty opens for years before 2016.
 */
export async function paperSource(paper: PastPaper): Promise<{ url: string; referer?: string } | null> {
  if (paper.pdf && !paper.pdf.startsWith("/")) return { url: paper.pdf };
  if (!paper.page || !paper.file) return null;
  const url = await resolveCssPoint(paper.page, paper.file);
  if (!url) return null;
  return { url, referer: paper.page };
}

/** Returns a local PDF path, downloading and storing it the first time. Later requests never touch the source. */
export function ensurePaper(slug: string, paper: PastPaper): Promise<string | null> {
  const ready = readyPaperPath(slug, paper.id);
  if (ready) return Promise.resolve(ready);
  const key = `${slug}/${paper.id}`;
  const pending = inflight.get(key);
  if (pending) return pending;
  const dest = cachedPaperPath(slug, paper.id);
  const job = downloadWithRetry(paper, dest).finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

function isPdf(file: string) {
  try {
    const stat = fs.statSync(file);
    if (stat.size < 1000) return false;
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf.toString() === "%PDF";
  } catch {
    return false;
  }
}

async function downloadWithRetry(paper: PastPaper, dest: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const saved = await download(paper, dest);
      if (saved) return saved;
    } catch (error) {
      console.error("[paper] download attempt", attempt + 1, paper.id, error);
    }
    await sleep(400 * (attempt + 1));
  }
  return null;
}

async function download(paper: PastPaper, dest: string): Promise<string | null> {
  const source = await paperSource(paper);
  if (!source) return null;

  const res = await fetch(source.url, {
    headers: {
      "user-agent": PAPER_UA,
      accept: "application/pdf,*/*",
      ...(source.referer ? { referer: source.referer } : {}),
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000 || buf.subarray(0, 4).toString() !== "%PDF") return null;

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.${Date.now()}.part`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, dest);
  return dest;
}

async function resolveCssPoint(page: string, file: string) {
  const html = await (
    await fetch(`${page}${page.includes("?") ? "&" : "?"}v=${Date.now()}`, {
      headers: {
        "user-agent": PAPER_UA,
        accept: "text/html,application/xhtml+xml",
        "cache-control": "no-cache",
        pragma: "no-cache",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    })
  ).text();

  const wanted = file.replace(/\+/g, " ").toLowerCase();
  const wantedBase = path.posix.basename(wanted);
  let fallback: string | null = null;

  for (const match of html.matchAll(/href="([^"]*tcp_secure_download[^"]*)"/g)) {
    const link = match[1].replace(/&#038;|&amp;/g, "&");
    const fileMatch = link.match(/[?&]file=([^&]+)/);
    if (!fileMatch) continue;
    const decoded = safeDecode(fileMatch[1]).replace(/\+/g, " ").toLowerCase();
    const absolute = link.startsWith("http") ? link : new URL(link, page).href;
    if (decoded === wanted) return absolute;
    if (!fallback && path.posix.basename(decoded) === wantedBase) fallback = absolute;
  }
  return fallback;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
