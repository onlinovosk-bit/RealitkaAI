import { NextRequest, NextResponse } from 'next/server';
import { revolisGuard } from '@/lib/revolis-guard';

export async function GET(req: NextRequest) {
  return revolisGuard(req, 'Demo Engine', async () => {
    return NextResponse.json({ success: true });
  });
}
