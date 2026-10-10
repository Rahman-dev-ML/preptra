import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "PrepTra — Crack CSS",
  description:
    "PrepTra. Crack the CSS code. 25 years of papers analysed for recurring themes, question patterns, and repeated questions, then past papers, MCQs, and study notes.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0b1e5b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={font.className}>{children}</body>
    </html>
  );
}
