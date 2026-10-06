import type { Metadata } from "next";
import ProgramComparisonSwitch from "@/components/billing/v2/ProgramComparisonSwitch";

export const metadata: Metadata = {
  title: "Porovnanie programov – Revolis.AI",
};

export default function PorovnanieProgramovPage() {
  return <ProgramComparisonSwitch />;
}
