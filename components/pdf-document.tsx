"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

let sharedWorker: pdfjs.PDFWorker | undefined;

function getPdfWorker() {
  if (!sharedWorker || sharedWorker.destroyed) {
    sharedWorker = new pdfjs.PDFWorker();
  }
  return sharedWorker;
}

export async function warmPdfWorker() {
  await getPdfWorker().promise;
}

const PIXEL_RATIO = typeof window === "undefined" ? 1 : Math.min(2, window.devicePixelRatio || 1);

export function PdfDocument({
  url,
  openedAt,
  onStatus,
}: {
  url: string;
  openedAt: number;
  onStatus?: (status: { percent: number | null; pages: number; painted: boolean; failed: boolean }) => void;
}) {
  return <PaperSession key={url} url={url} openedAt={openedAt} onStatus={onStatus} />;
}

function PaperSession({
  url,
  openedAt,
  onStatus,
}: {
  url: string;
  openedAt: number;
  onStatus?: (status: { percent: number | null; pages: number; painted: boolean; failed: boolean }) => void;
}) {
  const startedAt = useRef(openedAt);
  const measured = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [pages, setPages] = useState(0);
  const [painted, setPainted] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [textLayer, setTextLayer] = useState(false);
  const [tick, setTick] = useState(0);

  const options = useMemo(
    () => ({
      worker: getPdfWorker(),
      disableRange: true,
      disableStream: false,
      disableAutoFetch: false,
    }),
    [],
  );

  useEffect(() => {
    onStatus?.({ percent, pages, painted, failed });
  }, [failed, onStatus, pages, painted, percent]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(280, Math.min(860, el.clientWidth - 24)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [failed, attempt]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(timer);
  }, [attempt]);

  useEffect(() => {
    if (painted || failed) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 2200);
    return () => window.clearInterval(timer);
  }, [attempt, failed, painted]);

  function onFirstPage() {
    setPainted(true);
    setTextLayer(true);
    if (!measured.current) {
      measured.current = true;
      const ms = Math.round(performance.now() - startedAt.current);
      console.info("[paper] page-1-canvas", { url, milliseconds: ms });
    }
  }

  const rendering = pages > 0 || percent === 100;
  const rotating = ["Getting your paper ready…", "Opening the first page…", "The questions are on their way…"][tick % 3];
  const message = failed
    ? "Couldn’t open this paper. Try again."
    : slow
      ? "Taking a little longer than usual…"
      : rendering
        ? "Almost ready…"
        : percent !== null && percent < 100
          ? `${rotating.replace("…", "")}… ${percent}%`
          : rotating;

  return (
    <div ref={bodyRef} className="h-full overflow-y-auto px-4 py-4">
      <div className="mx-auto" style={{ width: width || "100%" }}>
        {!painted ? (
          <>
            <div className="mb-2 h-[3px] overflow-hidden rounded-full bg-[#e2e8f0]">
              {percent !== null && !rendering ? (
                <div className="h-full bg-[var(--navy)] transition-[width] duration-150" style={{ width: `${percent}%` }} />
              ) : (
                <div className="paper-bar" />
              )}
            </div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--navy)]">
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#d5def2] border-t-[var(--navy)]" aria-hidden />
              {message}
            </p>
          </>
        ) : null}

        {failed ? (
          <div className="rounded-xl bg-white px-6 py-10 text-center shadow-sm" style={{ aspectRatio: "210 / 297" }}>
            <button
              type="button"
              onClick={() => {
                startedAt.current = performance.now();
                measured.current = false;
                setPages(0);
                setPainted(false);
                setPercent(null);
                setSlow(false);
                setTextLayer(false);
                setFailed(false);
                setAttempt((value) => value + 1);
              }}
              className="mt-4 rounded-full bg-[var(--navy)] px-5 py-2.5 text-sm font-bold text-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-white shadow-sm" style={painted ? undefined : { aspectRatio: "210 / 297" }}>
            <Document
              key={attempt}
              file={url}
              options={options}
              onLoadProgress={({ loaded, total }) => {
                if (Number.isFinite(total) && total > 0) setPercent(Math.min(100, Math.floor((loaded / total) * 100)));
              }}
              onLoadSuccess={(pdf) => setPages(pdf.numPages)}
              onLoadError={(error) => {
                console.error("[paper] Failed to open or render", { url, error });
                setFailed(true);
              }}
              loading={null}
              error={null}
            >
              {width > 0 &&
                Array.from({ length: pages }, (_, index) => (
                  <LazyPage
                    key={index}
                    pageNumber={index + 1}
                    width={width}
                    eager={index < 1}
                    textLayer={textLayer}
                    hidden={!painted}
                    onPainted={index === 0 ? onFirstPage : undefined}
                  />
                ))}
            </Document>
            {!painted ? (
              <div className="absolute inset-0 bg-white px-[9%] py-[8%]">
                <div className="paper-line mx-auto mb-10 h-4 w-[55%] rounded" />
                {Array.from({ length: 9 }, (_, index) => (
                  <div key={index} className={`paper-line mb-4 h-2.5 rounded ${index % 3 === 2 ? "w-[78%]" : "w-full"}`} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function LazyPage({
  pageNumber,
  width,
  eager,
  textLayer,
  hidden,
  onPainted,
}: {
  pageNumber: number;
  width: number;
  eager: boolean;
  textLayer: boolean;
  hidden: boolean;
  onPainted?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(eager);
  const height = Math.round(width * 1.35);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShow(true);
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [show]);

  return (
    <div ref={ref} className={hidden ? "absolute inset-x-0 top-0 opacity-0" : "mb-3 overflow-hidden bg-white"} style={{ minHeight: show && !hidden ? undefined : height }}>
      {show ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          devicePixelRatio={PIXEL_RATIO}
          renderTextLayer={textLayer}
          renderAnnotationLayer={textLayer}
          onRenderSuccess={onPainted}
          loading={<div style={{ width, height }} className="bg-white" />}
        />
      ) : null}
    </div>
  );
}
