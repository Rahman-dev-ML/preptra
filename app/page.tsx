import { AppHeader } from "@/components/app-header";
import { PrepTraLanding } from "@/components/preptra-landing";
import { SubjectList } from "@/components/subject-list";
import { getLibraryStats, getSubjects } from "@/lib/content";

export default function HomePage() {
  const subjects = getSubjects();
  const stats = getLibraryStats();

  return (
    <div className="app-shell">
      <PrepTraLanding stats={stats}>
        <AppHeader />
      </PrepTraLanding>
      <main id="subjects" className="bg-[var(--bg)] px-4 pb-16 pt-5">
        <SubjectList subjects={subjects} />
      </main>
    </div>
  );
}
