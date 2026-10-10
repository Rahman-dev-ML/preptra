import Link from "next/link";

export function PageFrame({
  children,
  back,
}: {
  children: React.ReactNode;
  back?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#1c2834]">
      <header className="border-b border-[#d9dee6] bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-4">
          {back ? (
            <Link href="/" className="text-sm font-medium text-[#1e4f8a]">
              Subjects
            </Link>
          ) : null}
          <Link href="/" className="text-lg font-semibold tracking-tight text-[#163e6e]">
            PrepTra
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
