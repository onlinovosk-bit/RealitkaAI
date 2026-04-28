import type { Metadata } from "next";
import LiveDemoExperience from "@/components/marketing/LiveDemoExperience";

export const metadata: Metadata = {
  title: "Live Demo | Revolis.AI",
  description:
    "Klikateľné živé DEMO Revolis.AI pre klientov ešte pred aktiváciou plateného prístupu.",
};

export default function LiveDemoPage({
  searchParams,
}: {
  searchParams?: {
    agency?: string;
    rep?: string;
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    agents?: string;
  };
}) {
  const agency = searchParams?.agency?.trim() || "Vašu kanceláriu";
  const rep = searchParams?.rep?.trim() || "tím";
  return (
    <LiveDemoExperience
      agency={agency}
      rep={rep}
      prefill={{
        name: searchParams?.name?.trim() ?? "",
        email: searchParams?.email?.trim() ?? "",
        phone: searchParams?.phone?.trim() ?? "",
        city: searchParams?.city?.trim() ?? "",
        agents: searchParams?.agents?.trim() ?? "",
      }}
    />
  );
}

