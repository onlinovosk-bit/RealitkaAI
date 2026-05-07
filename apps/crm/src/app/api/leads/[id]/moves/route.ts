import { NextResponse } from "next/server";
import { appendPipelineMove, getPipelineMovesByLeadId } from "@/lib/leads-store";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const moves = await getPipelineMovesByLeadId(id);
  return NextResponse.json({ ok: true, moves });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { leadName, fromStatus, toStatus } = body as {
    leadName?: string;
    fromStatus?: string;
    toStatus?: string;
  };

  if (!fromStatus || !toStatus) {
    return NextResponse.json(
      { ok: false, error: "fromStatus a toStatus sú povinné." },
      { status: 400 }
    );
  }

  await appendPipelineMove(id, leadName ?? "", fromStatus, toStatus);
  return NextResponse.json({ ok: true });
}
