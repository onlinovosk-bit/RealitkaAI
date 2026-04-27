import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function isDormant(lastContactRaw: unknown): boolean {
  if (typeof lastContactRaw !== "string" || !lastContactRaw.trim()) return false;
  const parsed = Date.parse(lastContactRaw);
  if (Number.isNaN(parsed)) return false;
  const sixMonthsMs = 1000 * 60 * 60 * 24 * 180;
  return Date.now() - parsed > sixMonthsMs;
}

function looksLikeBsmLead(note: unknown): boolean {
  if (typeof note !== "string") return false;
  const value = note.toLowerCase();
  return value.includes("bsm") || value.includes("bezpodiel") || value.includes("manzel");
}

function buildMessage(leadName: string, location: string) {
  return `${leadName}, od 1.1.2026 vstupuje do účinnosti reforma BSM, ktorá sa môže dotknúť predaja pre ${location}. Pri predaji po 2026 môže byť nutný nový súhlas a dodatočné právne kroky. Ak chcete, pripravím vám bezplatnú 5-minútovú konzultáciu, aby ste vedeli, či je výhodnejšie riešiť predaj ešte pred reformou.`;
}

Deno.serve(async () => {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id,name,email,phone,location,last_contact,note,assigned_profile_id")
    .limit(300);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  let inspected = 0;
  let reactivated = 0;

  for (const lead of leads ?? []) {
    inspected += 1;

    const dormant = isDormant(lead.last_contact);
    const bsmCandidate = looksLikeBsmLead(lead.note);
    if (!dormant || !bsmCandidate) continue;

    const message = buildMessage(lead.name || "Dobrý deň", lead.location || "vašu lokalitu");

    const { error: outreachError } = await supabase.from("outreach_logs").insert({
      profile_id: lead.assigned_profile_id ?? null,
      lead_id: lead.id,
      campaign: "BSM_GHOST_2.0",
      channel: lead.phone ? "whatsapp" : "email",
      message_content: message,
      sent_at: new Date().toISOString(),
      payload: {
        automation: "ghost-resurrection-bsm",
      },
    });

    if (!outreachError) {
      reactivated += 1;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, inspected, reactivated }),
    { headers: { "Content-Type": "application/json" } },
  );
});
