import { NextRequest } from 'next/server';
import { validateRequest } from '@/lib/realvia/validate';
import {
  realviaError,
  realviaErrorFromValidation,
  realviaSuccess,
} from '@/lib/realvia/responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return realviaSuccess('realvia-import endpoint ready');
}

export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req);

    if (!validation.valid) {
      return realviaErrorFromValidation(validation.errors, 403);
    }

    const contentType = req.headers.get('content-type');

    if (!contentType?.includes('xml')) {
      return realviaError('Invalid content type', 400);
    }

    const xml = await req.text();

    console.log('REALVIA IMPORT');
    console.log(xml.slice(0, 1000));

    return realviaSuccess('Export received');
  } catch (error) {
    console.error(error);
    return realviaError('Internal server error', 500);
  }
}
