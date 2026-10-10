import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app-shell flex items-center justify-center px-6 text-center">
      <div>
        <img src="/logo.jpg" alt="" width={64} height={64} className="mx-auto h-16 w-16 rounded-2xl" />
        <h1 className="mt-5 text-2xl font-extrabold text-[var(--navy)]">That page is not here</h1>
        <Link href="/" className="mt-5 inline-block rounded-full bg-[var(--blue)] px-5 py-3 font-bold text-white">
          Back to subjects
        </Link>
      </div>
    </div>
  );
}
