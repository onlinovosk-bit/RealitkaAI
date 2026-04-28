import type { Metadata } from "next";
import LiveDemoExperience from "@/components/marketing/LiveDemoExperience";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Live Demo | Revolis.AI",
  description:
    "Klikateľné živé DEMO Revolis.AI pre klientov ešte pred aktiváciou plateného prístupu.",
};

export default async function LiveDemoPage({
  searchParams,
}: {
  searchParams?: {
    agency?: string;
    rep?: string;
    name?: string;
    email?: string;
    mail?: string;
    phone?: string;
    tel?: string;
    telefon?: string;
    city?: string;
    agents?: string;
    sid?: string;
  };
}) {
  let agency = searchParams?.agency?.trim() || "Vašu kanceláriu";
  let rep = searchParams?.rep?.trim() || "tím";
  let prefillName = searchParams?.name?.trim() || (rep && rep !== "tím" ? rep : "");
  let prefillEmail = searchParams?.email?.trim() || searchParams?.mail?.trim() || "";
  let prefillPhone =
    searchParams?.phone?.trim() || searchParams?.tel?.trim() || searchParams?.telefon?.trim() || "";
  let prefillCity = searchParams?.city?.trim() ?? "";
  let prefillAgents = searchParams?.agents?.trim() ?? "";

  // Preferred secure mode: sid token carries private prefill server-side.
  const sid = searchParams?.sid?.trim();
  if (sid) {
    const supabase = createServiceRoleClient();
    if (supabase) {
      const { data } = await supabase
        .from("demo_prefill_links")
        .select("agency, rep, name, email, phone, city, agents, expires_at")
        .eq("token", sid)
        .maybeSingle();

      if (data) {
        const expired = new Date(data.expires_at).getTime() < Date.now();
        if (!expired) {
          agency = data.agency?.trim() || agency;
          rep = data.rep?.trim() || rep;
          prefillName = data.name?.trim() || prefillName;
          prefillEmail = data.email?.trim() || prefillEmail;
          prefillPhone = data.phone?.trim() || prefillPhone;
          prefillCity = data.city?.trim() || prefillCity;
          prefillAgents =
            Number.isFinite(Number(data.agents)) && Number(data.agents) > 0
              ? String(data.agents)
              : prefillAgents;
        }
      }
    }
  }

  return (
    <LiveDemoExperience
      agency={agency}
      rep={rep}
      prefill={{
        name: prefillName,
        email: prefillEmail,
        phone: prefillPhone,
        city: prefillCity,
        agents: prefillAgents,
      }}
    />
  );
}

