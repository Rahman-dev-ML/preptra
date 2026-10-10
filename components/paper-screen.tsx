"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const PdfDocument = dynamic(() => import("@/components/pdf-document").then((m) => m.PdfDocument), {
  ssr: false,
  loading: () => <Opening />,
});

export function PaperScreen({
  src,
  title,
  openedAt,
  onClose,
}: {
  src: string;
  title: string;
  openedAt: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[640px] flex-col bg-[#e9edf5]">
      <div className="flex items-center gap-2 bg-[var(--navy)] px-3 py-3 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close paper"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">{title}</p>
        </div>
        <a
          href={`${src}?download`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10"
          aria-label="Download paper"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
      <div className="min-h-0 flex-1">
        <PdfDocument
          url={src}
          openedAt={openedAt}
        />
      </div>
    </div>
  );
}

function Opening() {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-2 h-[3px] overflow-hidden rounded-full bg-[#e2e8f0]">
          <div className="paper-bar" />
        </div>
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--navy)]">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#d5def2] border-t-[var(--navy)]" aria-hidden />
          Getting your paper ready…
        </p>
        <div className="aspect-[210/297] rounded-xl bg-white px-[9%] py-[8%] shadow-sm">
          <div className="paper-line mx-auto mb-10 h-4 w-[55%] rounded" />
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className={`paper-line mb-4 h-2.5 rounded ${index % 3 === 2 ? "w-[78%]" : "w-full"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
