import { NextResponse } from "next/server";
import { requireRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { Resend } from "resend";

const BATCH_CAP = 200;

function getResend() { return new Resend(process.env.RESEND_API_KEY ?? ""); }

export async function POST() {
  const caller = await requireRole(["founder"]);
  const rateLimitKey = `founder-legal-email:${caller?.id ?? "global"}`;
  const { allowed } = await rateLimit(rateLimitKey, 1, 3_600_000);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Rate limit: max 1 odoslanie za hodinu." }, { status: 429 });
  }

  const supabase = await createClient();

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("role", "owner");

  if (!allProfiles?.length) return NextResponse.json({ sent: 0 });

  const profiles = allProfiles.slice(0, BATCH_CAP);

  let sent = 0;
  for (const profile of profiles) {
    try {
      await getResend().emails.send({
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
