import type { Metadata } from "next";
import ProgramComparison from "@/components/billing/ProgramComparison";

export const metadata: Metadata = {
  title: "Porovnanie programov – Revolis.AI",
};

export default function PorovnanieProgramovPage() {
  return <ProgramComparison />;
}
