"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AppHeader({ back, title }: { back?: boolean; title?: string }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <header className="flex h-16 items-center gap-3 px-4">
      {back ? (
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 active:bg-white/20"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      <Link href="/" prefetch className="flex items-center gap-2.5">
        <img src="/logo.jpg" alt="" width={40} height={40} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/20" />
        <span className="text-lg font-extrabold tracking-tight text-white">{title || "PrepTra"}</span>
      </Link>
    </header>
  );
}
