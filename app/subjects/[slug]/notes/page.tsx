import { redirect } from "next/navigation";

export default async function NotesRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/subjects/${slug}?tab=resources`);
}
