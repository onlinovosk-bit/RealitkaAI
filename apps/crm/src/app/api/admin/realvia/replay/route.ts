import { NextRequest, NextResponse } from 'next/server';
import { assertRealviaAdminApi } from '@/lib/realvia/adminAuth';
import { enqueueReplayForWebhookLog } from '@/lib/realvia/webhookStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readBodyId(request: NextRequest): Promise<string | undefined> {
  try {
    const body = await request.json();
    const id =
      typeof body?.id === 'string'
        ? body.id.trim()
        : typeof body?.webhook_log_id === 'string'
          ? body.webhook_log_id.trim()
          : undefined;
    return id;
  } catch {
    return undefined;
  }
}

/** Idempotent-ish re-queue: resets webhook processed flag & queue row → pending */
export async function GET(request: NextRequest) {
  const gate = await assertRealviaAdminApi();
  if (gate instanceof NextResponse) return gate;

  const webhookLogId = request.nextUrl.searchParams.get('id')?.trim();
  if (!webhookLogId) {
    return NextResponse.json(
      { error: 'Missing id query param (?id=<webhook_log uuid>)' },
      { status: 400 },
    );
  }

  return replayResponse(webhookLogId);
}

export async function POST(request: NextRequest) {
  const gate = await assertRealviaAdminApi();
  if (gate instanceof NextResponse) return gate;

  let webhookLogId = request.nextUrl.searchParams.get('id')?.trim();
  if (!webhookLogId) {
    webhookLogId = await readBodyId(request);
  }

  if (!webhookLogId) {
    return NextResponse.json(
      { error: 'Missing webhook log id (?id=<uuid> or JSON { \"id\": \"...\" })' },
      { status: 400 },
    );
  }

  return replayResponse(webhookLogId);
}

async function replayResponse(webhookLogId: string): Promise<NextResponse> {
  const res = await enqueueReplayForWebhookLog(webhookLogId);
  if (!res.ok) {
    const status = res.error.includes('not found') ? 404 : 502;
    return NextResponse.json({ error: res.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    webhook_log_id: webhookLogId,
    queue_job_id: res.queueJobId,
  });
}
