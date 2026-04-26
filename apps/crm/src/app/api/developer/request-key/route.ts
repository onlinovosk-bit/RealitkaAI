import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    companyName?: string;
    contactName?: string;
    contactEmail?: string;
    useCase?: string;
    requestedTier?: "developer" | "enterprise";
  };

  const companyName = body.companyName?.trim();
  const contactEmail = body.contactEmail?.trim();

  if (!companyName || !contactEmail) {
    return NextResponse.json(
      { ok: false, error: "companyName a contactEmail sú povinné." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("developer_api_key_requests").insert({
    company_name: companyName,
    contact_name: body.contactName?.trim() || null,
    contact_email: contactEmail,
    use_case: body.useCase?.trim() || null,
    requested_tier: body.requestedTier ?? "enterprise",
    status: "new",
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
