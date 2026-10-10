export default function SubjectLoading() {
  return (
    <div className="app-shell">
      <div className="hero text-white">
        <div className="h-16" />
        <div className="px-5 pb-8 pt-1">
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-2xl bg-white/15" />
            <span className="min-w-0 flex-1">
              <span className="block h-3 w-24 rounded bg-white/20" />
              <span className="mt-2 block h-6 w-48 rounded bg-white/25" />
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <span className="h-14 rounded-2xl bg-white/10" />
            <span className="h-14 rounded-2xl bg-white/10" />
            <span className="h-14 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
      <div className="-mt-5 rounded-t-[28px] bg-[var(--bg)] px-4 pb-16 pt-4">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-[#e4e9f5] p-1">
          <span className="h-10 rounded-xl bg-white" />
          <span className="h-10 rounded-xl" />
          <span className="h-10 rounded-xl" />
          <span className="h-10 rounded-xl" />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className="h-12 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
