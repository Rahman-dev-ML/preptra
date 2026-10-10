type Stats = {
  papers: number;
  mcqs: number;
  notes: number;
};

const FINDINGS = [
  ["01", "Recurring themes", "Topics that return across years."],
  ["02", "Question patterns", "How the same topic is tested differently."],
  ["03", "Repeated questions", "Questions repeated in different words."],
] as const;

export function PrepTraLanding({
  stats,
  children,
}: {
  stats: Stats;
  children?: React.ReactNode;
}) {
  return (
    <>
      <section className="relative overflow-hidden bg-[#07111f] text-white">
        {children}
        <div className="relative px-5 pb-8 pt-2">
          <PaperMark />
          <p className="relative text-[11px] font-bold tracking-[0.16em] text-white/70">
            25 YEARS OF CSS PAPERS, ANALYSED.
          </p>
          <h1 className="relative mt-3 max-w-[16rem] text-[2.7rem] font-extrabold leading-[0.92] tracking-tight">
            Crack the
            <br />
            CSS
            <br />
            <span className="text-[#4d6bff]">code.</span>
          </h1>
          <p className="relative mt-4 max-w-[18.5rem] text-[15px] font-medium leading-6 text-white/75">
            25 years of CSS papers, analysed to reveal recurring themes, question patterns, and repeated questions.
          </p>
          <a
            href="#subjects"
            className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-bold text-[#07111f]"
          >
            Explore the research
            <span aria-hidden>↗</span>
          </a>
        </div>
      </section>

      <section className="bg-[#1f4bff] px-5 py-8 text-white">
        <h2 className="max-w-[16rem] text-[1.85rem] font-extrabold leading-[1.05] tracking-tight">
          The research behind your preparation.
        </h2>
        <ul className="mt-6 space-y-5">
          {FINDINGS.map(([index, title, line]) => (
            <li key={index} className="flex gap-4">
              <span className="w-8 shrink-0 text-[15px] font-bold text-white/80">{index}</span>
              <span>
                <span className="block text-[16px] font-bold leading-5">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-5 text-white/75">{line}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white px-5 py-7 text-[#0b1220]">
        <h2 className="text-[1.55rem] font-extrabold leading-tight tracking-tight">
          Research first.
          <br />
          Practice next.
        </h2>
        <dl className="mt-5 grid grid-cols-3 gap-2">
          <Stat value={stats.papers} label="Past papers" />
          <Stat value={stats.mcqs} label="MCQs" />
          <Stat value={stats.notes} label="Study notes" />
        </dl>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="text-[1.35rem] font-extrabold leading-none tracking-tight">{value.toLocaleString("en-US")}</dt>
      <dd className="mt-1 text-[12px] font-medium leading-4 text-[#5b6475]">{label}</dd>
    </div>
  );
}

function PaperMark() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[52%]" aria-hidden>
      <svg viewBox="0 0 240 320" className="absolute -right-2 top-0 h-full w-full" fill="none">
        <g transform="translate(78 36) rotate(8)">
          <rect width="132" height="168" rx="3" fill="#10284f" />
          <rect x="14" y="18" width="78" height="5" rx="2" fill="#fff" opacity="0.28" />
          <rect x="14" y="32" width="96" height="3" rx="1.5" fill="#fff" opacity="0.16" />
          <rect x="14" y="42" width="88" height="3" rx="1.5" fill="#fff" opacity="0.16" />
          <rect x="14" y="52" width="70" height="3" rx="1.5" fill="#fff" opacity="0.12" />
        </g>
        <g transform="translate(108 18) rotate(-7)">
          <rect width="120" height="156" rx="3" fill="#16325f" />
          <rect x="12" y="16" width="70" height="4" rx="2" fill="#fff" opacity="0.22" />
          <rect x="12" y="28" width="88" height="3" rx="1.5" fill="#fff" opacity="0.14" />
          <rect x="12" y="38" width="76" height="3" rx="1.5" fill="#fff" opacity="0.14" />
        </g>
        <text
          x="8"
          y="248"
          fill="#1a3e86"
          fontSize="168"
          fontWeight="800"
          fontFamily="inherit"
          letterSpacing="-8"
        >
          25
        </text>
      </svg>
    </div>
  );
}
