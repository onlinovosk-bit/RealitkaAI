import { Metadata } from "next";
import AcquisitionHub from "@/components/marketing/AcquisitionHub";

export const metadata: Metadata = {
  title: "AI Asistent Demo – Revolis.AI",
  description:
    "Živá ukážka AI modulov: odhadca ceny, monitoring susedov, AI targeting.",
};

export default function DemoPage() {
  return <AcquisitionHub />;
}
