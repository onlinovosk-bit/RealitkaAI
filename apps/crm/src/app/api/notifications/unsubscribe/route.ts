// GET /api/notifications/unsubscribe?profile=[profileId]
//
// EMAIL-SUPPRESSION-01: odkaz zostáva len pre už odoslané e-maily so starým
// tvarom. Nič nemení — predtým stačilo poznať UUID profilu a kto ho poznal,
// vedel niekomu vypnúť notifikácie; GET navyše spúšťajú aj poštové skenery.
// Odhlásenie teraz vybavuje podpísaný odkaz v /api/unsubscribe; starý odkaz
// len presmeruje na nastavenia, kde sa notifikácie vypnú po prihlásení.
import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.revolis.ai'

export async function GET() {
  return NextResponse.redirect(`${BASE_URL}/settings/notifications`, { status: 302 })
}
