import type { Metadata } from "next";
import AIAsistentEnterprise from "./AIAsistentEnterprise";

export const metadata: Metadata = {
  title: "AI Asistent Enterprise – Revolis.AI",
  description:
    "Tri moduly ktoré menia analógové dáta na exkluzívne mandáty v reálnom čase.",
  robots: { index: false, follow: false },
};

export default function L99ScanPage() {
  return <AIAsistentEnterprise />;
}
