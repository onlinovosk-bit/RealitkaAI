import type { Metadata } from "next";
import RozpisFunkcionalit from "@/components/billing/RozpisFunkcionalit";

export const metadata: Metadata = {
  title: "Rozpis funkcionalít – Revolis.AI",
};

export default function RozpisFunkcionalitPage() {
  return <RozpisFunkcionalit />;
}
