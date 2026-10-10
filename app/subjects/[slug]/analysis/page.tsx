import { redirect } from "next/navigation";

export default async function AnalysisRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/subjects/${slug}?tab=research`);
}
