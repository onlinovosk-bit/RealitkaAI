import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WatchedParcel = {
  id: string;
  profile_id: string;
  workspace_id: string | null;
  lead_id: string | null;
  parcel_id: string;
  last_hash: string | null;
  status: "active" | "paused" | "archived";
};

function normalizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function sha256Hex(input: string): Promise<string> {
  const msg = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", msg);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendPushNotification(_workspaceId: string | null, _message: string): Promise<void> {
  // Hook for OneSignal/Firebase bridge. Left intentionally no-op for now.
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async () => {
  const { data: parcels, error } = await supabase
    .from("watched_parcels")
    .select("id, profile_id, workspace_id, lead_id, parcel_id, last_hash, status")
    .eq("status", "active");

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  let scanned = 0;
  let changed = 0;

  for (const parcel of (parcels ?? []) as WatchedParcel[]) {
    scanned += 1;
    try {
      const response = await fetch(`https://kataster.sk/detail/${encodeURIComponent(parcel.parcel_id)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const htmlContent = await response.text();
      const cleanContent = normalizeHtml(htmlContent);
      const currentHash = await sha256Hex(cleanContent);

      if (parcel.last_hash && parcel.last_hash !== currentHash) {
        changed += 1;

        await supabase.from("kataster_events").insert({
          profile_id: parcel.profile_id,
          watched_parcel_id: parcel.id,
          lead_id: parcel.lead_id,
          parcel_id: parcel.parcel_id,
          event_type: "LV_CHANGE_DETECTED",
          severity: "high",
          old_hash: parcel.last_hash,
          new_hash: currentHash,
          payload: {
            source: "kataster-monitor-edge-fn",
          },
        });

        await sendPushNotification(parcel.workspace_id, `Zmena na LV: ${parcel.parcel_id}`);
      }

      await supabase
        .from("watched_parcels")
        .update({ last_hash: currentHash, last_checked_at: new Date().toISOString() })
        .eq("id", parcel.id);
    } catch (scanError) {
      await supabase.from("kataster_events").insert({
        profile_id: parcel.profile_id,
        watched_parcel_id: parcel.id,
        lead_id: parcel.lead_id,
        parcel_id: parcel.parcel_id,
        event_type: "LV_SCAN_ERROR",
        severity: "medium",
        payload: {
          error: scanError instanceof Error ? scanError.message : String(scanError),
        },
      });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, scanned, changed }),
    { headers: { "Content-Type": "application/json" } },
  );
});
