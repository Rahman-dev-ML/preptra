import { NextResponse } from "next/server";
import { getAnalysis, getPaperYears, getSubject } from "@/lib/content";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { slug } = await params;
  if (!getSubject(slug)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ analysis: getAnalysis(slug), years: getPaperYears(slug) });
}
