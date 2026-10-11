import { createReadStream, statSync } from "fs";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { getPastPaper } from "@/lib/content";
import { PAPER_UA, ensurePaper, paperSource, readyPaperPath } from "@/lib/paper-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ slug: string; id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { slug, id } = await params;
  const paper = getPastPaper(slug, id);
  if (!paper) return new NextResponse("Paper not found", { status: 404 });

  const download = new URL(request.url).searchParams.has("download");
  const fileName = `${paper.title.replace(/[^\w\- ]+/g, "")}.pdf`;

  try {
    // Years before ~2016 use CSS Point signed links. Pull the whole PDF once,
    // verify it, cache it, then serve — streaming those hops was what failed for users.
    if (paper.page && paper.file && !paper.pdf) {
      const file = await ensurePaper(slug, paper);
      if (!file) return new NextResponse("The paper could not be fetched right now.", { status: 502 });
      return serveFile(file, request, fileName, download);
    }

    const local = readyPaperPath(slug, paper.id);
    if (local) return serveFile(local, request, fileName, download);

    if (paper.pdf?.startsWith("/")) {
      return new NextResponse("The paper could not be fetched right now.", { status: 502 });
    }

    return await proxyDirect(paper, request, fileName, download);
  } catch (error) {
    console.error("[paper]", slug, id, error);
    return new NextResponse("The paper could not be fetched right now.", { status: 502 });
  }
}

async function proxyDirect(
  paper: NonNullable<ReturnType<typeof getPastPaper>>,
  request: Request,
  fileName: string,
  download: boolean,
) {
  let source: { url: string; referer?: string } | null = null;
  try {
    source = await paperSource(paper);
  } catch (error) {
    console.error("[paper] source", paper.id, error);
    return new NextResponse("The paper could not be fetched right now.", { status: 502 });
  }
  if (!source) return new NextResponse("The paper could not be fetched right now.", { status: 502 });

  const headers = new Headers({
    "user-agent": PAPER_UA,
    accept: "application/pdf,*/*",
  });
  if (source.referer) headers.set("referer", source.referer);
  const range = download ? null : request.headers.get("range");
  if (range) headers.set("range", range);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  const onAbort = () => ctrl.abort();
  request.signal.addEventListener("abort", onAbort);

  let upstream: Response;
  try {
    upstream = await fetch(source.url, {
      headers,
      redirect: "follow",
      cache: "no-store",
      signal: ctrl.signal,
    });
  } catch {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", onAbort);
    return new NextResponse("The paper could not be fetched right now.", { status: 502 });
  }

  if (upstream.status !== 200 && upstream.status !== 206) {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", onAbort);
    return new NextResponse("The paper could not be fetched right now.", { status: 502 });
  }

  const out = new Headers();
  out.set("content-type", "application/pdf");
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) out.set("accept-ranges", acceptRanges);
  out.set("cache-control", "public, max-age=86400");
  out.set("content-disposition", `${download ? "attachment" : "inline"}; filename="${fileName}"`);
  const length = upstream.headers.get("content-length");
  if (length) out.set("content-length", length);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) out.set("content-range", contentRange);

  clearTimeout(timer);
  request.signal.removeEventListener("abort", onAbort);
  return new NextResponse(upstream.body, { status: upstream.status, headers: out });
}

function serveFile(file: string, request: Request, fileName: string, download: boolean) {
  const size = statSync(file).size;
  const shared = {
    "content-type": "application/pdf",
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
    "content-disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
  };

  const range = download ? null : request.headers.get("range");
  const match = range?.match(/bytes=(\d+)-(\d*)/);
  if (match) {
    const start = Number(match[1]);
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : Math.min(start + 262143, size - 1);
    if (start >= size || end < start) {
      return new NextResponse(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(file, { start, end, signal: request.signal })) as ReadableStream;
    return new NextResponse(stream, {
      status: 206,
      headers: {
        ...shared,
        "content-range": `bytes ${start}-${end}/${size}`,
        "content-length": String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(file, { signal: request.signal })) as ReadableStream;
  return new NextResponse(stream, {
    headers: { ...shared, "content-length": String(size) },
  });
}
