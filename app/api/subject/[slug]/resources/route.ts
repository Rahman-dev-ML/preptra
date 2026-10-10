import { NextResponse } from "next/server";
import { getStudyNotes, getSubject } from "@/lib/content";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { slug } = await params;
  if (!getSubject(slug)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const study = getStudyNotes(slug);
  return NextResponse.json({ notes: study.notes, categories: study.categories });
}
