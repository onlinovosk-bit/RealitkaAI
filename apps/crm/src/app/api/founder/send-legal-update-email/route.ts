import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST() {
  await requireRole(["founder"]);
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("role", "owner");

  if (!profiles?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const profile of profiles) {
    try {
      await resend.emails.send({
        from: "Revolis.AI <support@revolis.ai>",
        to: profile.email,
        subject: "Revolis.AI – Aktualizácia podmienok používania",
        text: [
          "Dobrý deň " + (profile.full_name ?? "") + ",",
          "",
          "aktualizovali sme naše právne dokumenty (v1.0, účinnosť od 21. apríla 2026).",
          "",
          "Čo sa zmenilo:",
          "• Aktualizované podmienky používania",
          "• Privacy Policy v súlade s GDPR",
          "• SLA s konkrétnymi uptime garanciami",
          "",
          "Pre vás sa nič nemení. Váš plán zostáva nezmenený.",
          "",
          "Dokumenty: https://app.revolis.ai/trust-center",
          "",
          "Otázky: legal@revolis.ai",
          "",
          "Tím Revolis.AI",
          "support@revolis.ai",
        ].join("\n"),
      });
      sent++;
    } catch (err) {
      console.error("Email failed for " + profile.email + ":", err);
    }
  }
  return NextResponse.json({ sent, total: profiles.length });
}
