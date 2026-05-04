import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { HubSpotSyncResult } from "@/lib/hubspot/types"
import { syncLeadToHubSpot } from "@/lib/hubspot/sync"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: Request) {
  let body: { leadId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { leadId } = body
  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json({ ok: false, error: "leadId is required" }, { status: 400 })
  }

  const db = getServiceClient()

  const { data: lead, error: fetchError } = await db
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (fetchError || !lead) {
    return NextResponse.json(
      { ok: false, error: fetchError?.message ?? "Lead not found" },
      { status: 404 }
    )
  }

  let result: HubSpotSyncResult
  try {
    result = await syncLeadToHubSpot(lead)
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "syncLeadToHubSpot failed" },
      { status: 500 }
    )
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }

  if (result.contactId) {
    const { error: updateError } = await db
      .from("leads")
      .update({ hubspot_contact_id: result.contactId })
      .eq("id", leadId)

    // column may not exist yet — non-fatal
    if (updateError && !updateError.message.includes("column")) {
      console.error("[HubSpot sync] Failed to persist hubspot_contact_id:", updateError.message)
    }
  }

  return NextResponse.json({
    ok: true,
    contactId: result.contactId ?? null,
    dealId: result.dealId ?? null,
  })
}
