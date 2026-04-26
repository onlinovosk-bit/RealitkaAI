// GET /api/morning-brief/track/open?id=[briefId]
// Returns 1x1 transparent GIF, records open time
import { NextRequest, NextResponse } from 'next/server'
import { createClient }               from '@/lib/supabase/server'

// 1x1 transparent GIF (43 bytes)
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (id) {
    const supabase = await createClient()
    await supabase.rpc('record_brief_open', { p_brief_id: id })
  }
  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma':        'no-cache',
    },
  })
}
