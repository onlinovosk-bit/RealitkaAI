import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '@/lib/realvia/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'realvia-import',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req);

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Forbidden', details: validation.errors },
        { status: 403 },
      );
    }

    const contentType = req.headers.get('content-type');

    if (!contentType?.includes('xml')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid content type',
        },
        {
          status: 400,
        },
      );
    }

    const xml = await req.text();

    console.log('REALVIA IMPORT');
    console.log(xml.slice(0, 1000));

    return NextResponse.json({
      ok: true,
      received: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 500,
      },
    );
  }
}
