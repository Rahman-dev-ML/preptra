// Downloads every past paper into data/paper-cache by calling the running app.
// First view of a paper is then a local file read. Safe to re-run; cached files are skipped by the server.
import data from "../data/past-papers.json" with { type: "json" };
const base = process.env.PREPTRA_URL || "http://localhost:3000";
const jobs = [];
for (const [slug, papers] of Object.entries(data)) {
  if (!Array.isArray(papers)) continue;
  for (const paper of papers) jobs.push(`${slug}/${paper.id}`);
}

let cursor = 0;
let ok = 0;
let failed = 0;
const concurrency = 3;

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    try {
      const res = await fetch(`${base}/api/paper/${job}`);
      if (!res.ok) throw new Error(String(res.status));
      await res.arrayBuffer();
      ok += 1;
    } catch (error) {
      failed += 1;
      console.error("FAIL", job, error.message);
    }
    if ((ok + failed) % 25 === 0) console.log(`${ok + failed}/${jobs.length}  ok ${ok}  failed ${failed}`);
  }
}

console.log(`warming ${jobs.length} papers from ${base}`);
await Promise.all(Array.from({ length: concurrency }, worker));
console.log(`done  ok ${ok}  failed ${failed}`);
