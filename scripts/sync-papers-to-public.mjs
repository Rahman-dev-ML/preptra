/**
 * 1) Download any missing CSS Point papers that still resolve.
 * 2) Copy every CSS Point paper into public/papers/{slug}/{id}.pdf
 * 3) Rewrite data/past-papers.json to serve those as static /papers/... URLs
 *    so Vercel does not need to talk to thecsspoint.com / hostnezt.com.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data", "past-papers.json");
const CACHE = path.join(ROOT, "data", "paper-cache");
const PUBLIC = path.join(ROOT, "public", "papers");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
const pageCache = new Map();

function isPdfBuf(buf) {
  return buf.length >= 1000 && buf.subarray(0, 4).toString() === "%PDF";
}

function isPdfFile(file) {
  try {
    if (!fs.existsSync(file) || fs.statSync(file).size < 1000) return false;
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf.toString() === "%PDF";
  } catch {
    return false;
  }
}

function encodeFileParam(url) {
  return url.replace(/([?&]file=)([^&]*)/, (_, prefix, file) => {
    let decoded = file;
    try {
      decoded = decodeURIComponent(file.replace(/\+/g, " "));
    } catch {
      decoded = file.replace(/\+/g, " ");
    }
    return `${prefix}${encodeURIComponent(decoded)}`;
  });
}

async function linksFor(page) {
  if (pageCache.has(page)) return pageCache.get(page);
  const html = await (
    await fetch(`${page}${page.includes("?") ? "&" : "?"}v=${Date.now()}`, {
      headers: { "user-agent": UA, "cache-control": "no-cache", pragma: "no-cache" },
      cache: "no-store",
    })
  ).text();
  const map = new Map();
  for (const match of html.matchAll(/href="([^"]*tcp_secure_download[^"]*)"/g)) {
    const link = match[1].replace(/&#038;|&amp;/g, "&");
    const fileMatch = link.match(/[?&]file=([^&]+)/);
    if (!fileMatch) continue;
    const decoded = decodeURIComponent(fileMatch[1].replace(/\+/g, " "));
    map.set(decoded.toLowerCase(), link.startsWith("http") ? link : new URL(link, page).href);
  }
  pageCache.set(page, map);
  return map;
}

async function downloadCssPoint(page, file, dest) {
  const links = await linksFor(page);
  const signed = links.get(file.toLowerCase());
  if (!signed) return false;
  const res = await fetch(encodeFileParam(signed), {
    headers: { "user-agent": UA, referer: page, accept: "application/pdf,*/*" },
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (!isPdfBuf(buf)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${process.pid}.part`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, dest);
  return true;
}

let fetched = 0;
let fetchFail = 0;
let copied = 0;
let rewritten = 0;
const stillMissing = [];

for (const [slug, papers] of Object.entries(data)) {
  if (!Array.isArray(papers)) continue;
  for (const paper of papers) {
    if (!paper.page || !paper.file) continue;

    const cachePath = path.join(CACHE, slug, `${paper.id}.pdf`);
    const publicPath = path.join(PUBLIC, slug, `${paper.id}.pdf`);

    if (!isPdfFile(cachePath) && !isPdfFile(publicPath)) {
      process.stdout.write(`fetch ${slug}/${paper.id}… `);
      try {
        const ok = await downloadCssPoint(paper.page, paper.file, cachePath);
        if (ok) {
          fetched += 1;
          console.log("ok");
        } else {
          fetchFail += 1;
          stillMissing.push(`${slug}/${paper.id}`);
          console.log("fail");
          continue;
        }
      } catch (error) {
        fetchFail += 1;
        stillMissing.push(`${slug}/${paper.id}`);
        console.log("err", error.message);
        continue;
      }
    }

    const source = isPdfFile(publicPath) ? publicPath : cachePath;
    if (!isPdfFile(source)) {
      stillMissing.push(`${slug}/${paper.id}`);
      continue;
    }

    if (source !== publicPath) {
      fs.mkdirSync(path.dirname(publicPath), { recursive: true });
      fs.copyFileSync(source, publicPath);
      copied += 1;
    }

    const localUrl = `/papers/${slug}/${paper.id}.pdf`;
    if (paper.pdf !== localUrl) {
      paper.pdf = localUrl;
      rewritten += 1;
    }
  }
}

fs.writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`);
console.log(
  JSON.stringify(
    { fetched, fetchFail, copied, rewritten, stillMissing: stillMissing.length, missing: stillMissing },
    null,
    2,
  ),
);
