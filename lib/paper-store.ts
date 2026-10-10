import fs from "fs";
import path from "path";
import type { PastPaper } from "@/lib/content";

const DIR = path.join(process.cwd(), "data", "paper-cache");
export const PAPER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const inflight = new Map<string, Promise<string | null>>();
const sourceCache = new Map<string, { url: string; referer?: string; exp: number }>();

export function cachedPaperPath(slug: string, id: string) {
  return path.join(DIR, slug, `${id}.pdf`);
}

/** A finished PDF on disk. Missing or half-written files are ignored so a reader is never blocked on a download. */
export function readyPaperPath(slug: string, id: string) {
  const dest = cachedPaperPath(slug, id);
  return isPdf(dest) ? dest : null;
}

/**
 * The URL to stream right now. Direct PDFs return immediately.
 * CSS Point signed links are resolved once and reused for a few minutes.
 */
export async function paperSource(paper: PastPaper): Promise<{ url: string; referer?: string } | null> {
  if (paper.pdf && !paper.pdf.startsWith("/")) return { url: paper.pdf };
  if (!paper.page || !paper.file) return null;

  const key = `${paper.page}|${paper.file}`;
  const hit = sourceCache.get(key);
  if (hit && hit.exp > Date.now()) return { url: hit.url, referer: hit.referer };

  const url = await resolveCssPoint(paper.page, paper.file);
  if (!url) return null;
  sourceCache.set(key, { url, referer: paper.page, exp: Date.now() + 8 * 60 * 1000 });
  return { url, referer: paper.page };
}

/** Returns a local PDF path, downloading and storing it the first time. Later requests never touch the source. */
export function ensurePaper(slug: string, paper: PastPaper): Promise<string | null> {
  const dest = cachedPaperPath(slug, paper.id);
  if (isPdf(dest)) return Promise.resolve(dest);
  const key = `${slug}/${paper.id}`;
  const pending = inflight.get(key);
  if (pending) return pending;
  const job = download(paper, dest).finally(() => inflight.delete(key));
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

async function download(paper: PastPaper, dest: string): Promise<string | null> {
  let url: string | null = null;
  let referer: string | undefined;
  if (paper.pdf && !paper.pdf.startsWith("/")) {
    url = paper.pdf;
  } else if (paper.page && paper.file) {
    url = await resolveCssPoint(paper.page, paper.file);
    referer = paper.page;
  }
  if (!url) return null;

  const res = await fetch(url, {
    headers: { "user-agent": PAPER_UA, ...(referer ? { referer } : {}) },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000 || buf.subarray(0, 4).toString() !== "%PDF") return null;

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.part`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, dest);
  return dest;
}

async function resolveCssPoint(page: string, file: string) {
  const html = await (
    await fetch(`${page}${page.includes("?") ? "&" : "?"}v=${Date.now()}`, {
      headers: { "user-agent": PAPER_UA, "cache-control": "no-cache", pragma: "no-cache" },
      cache: "no-store",
    })
  ).text();
  const wanted = file.toLowerCase();
  for (const match of html.matchAll(/href="([^"]*tcp_secure_download[^"]*)"/g)) {
    const link = match[1].replace(/&#038;|&amp;/g, "&");
    const fileMatch = link.match(/[?&]file=([^&]+)/);
    if (!fileMatch) continue;
    const decoded = safeDecode(fileMatch[1]).replace(/\+/g, " ").toLowerCase();
    if (decoded === wanted) return link;
  }
  return null;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
