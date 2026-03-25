import { NextResponse } from "next/server";
import { appendPipelineMove, getPipelineMovesByLeadId } from "@/lib/leads-store";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moves = await getPipelineMovesByLeadId(id);
  return NextResponse.json({ ok: true, moves });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
