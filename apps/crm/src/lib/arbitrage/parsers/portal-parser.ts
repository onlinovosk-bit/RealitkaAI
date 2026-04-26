// ================================================================
// Revolis.AI — nehnutelnosti.sk CSV/JSON Parser
// Handles export from admin.nehnutelnosti.sk/exports
// Also handles Vlastný web XML feed if configured
// ================================================================
import Papa      from 'papaparse'
import { normaliseListing, normalisePrice } from '../normalise'
import type { ParseResult, PortalListing, PortalSource } from '@/types/arbitrage'

// ── Column aliases for nehnutelnosti.sk CSV export ────────────
const COL = {
  external_id:   ['ID', 'Id inzerátu', 'Číslo inzerátu', 'Ref'],
  external_url:  ['URL', 'Odkaz', 'Link'],
  title:         ['Názov', 'Nadpis', 'Titulok'],
  price:         ['Cena', 'Cena (EUR)', 'Požadovaná cena'],
  area_m2:       ['Plocha', 'Plocha (m²)', 'm²', 'Úžitková plocha'],
  rooms:         ['Počet izieb', 'Izby', 'Izb'],
  property_type: ['Typ nehnuteľnosti', 'Kategória', 'Druh'],
  transaction_type: ['Typ transakcie', 'Predaj/Prenájom'],
  street:        ['Ulica', 'Adresa'],
  city:          ['Mesto', 'Obec'],
  district:      ['Okres', 'District'],
  region:        ['Kraj', 'Región'],
  postal_code:   ['PSČ'],
  seller_name:   ['Maklér', 'Agent', 'Kontaktná osoba'],
  seller_phone:  ['Telefón makléra', 'Tel.'],
  description:   ['Popis', 'Description'],
  cover_photo_url: ['Foto URL', 'Hlavná fotografia'],
} as const

function buildHeaderMap(headers: string[]): Map<string, number> {
  const norm  = (s: string) => s.toLowerCase().trim()
    .replace(/[áä]/g,'a').replace(/[éě]/g,'e').replace(/[íi]/g,'i')
    .replace(/[óô]/g,'o').replace(/[úů]/g,'u').replace(/[čc]/g,'c')
    .replace(/[šs]/g,'s').replace(/[žz]/g,'z').replace(/\s+/g,'_')
    .replace(/[^a-z0-9_]/g,'')

  const map = new Map<string, number>()
  for (const [field, aliases] of Object.entries(COL)) {
    const normAliases = (aliases as readonly string[]).map(norm)
    const idx = headers.findIndex(h => normAliases.includes(norm(h)))
    if (idx !== -1) map.set(field, idx)
  }
  return map
}

export async function parsePortalCSV(
  csvContent: string,
  source:     PortalSource = 'nehnutelnosti_sk',
  profileId?: string
): Promise<ParseResult> {
  const errors:   string[] = []
  const listings: Partial<PortalListing>[] = []

  const parsed: any = Papa.parse<string[]>(csvContent as any, {
    skipEmptyLines: true,
    encoding:       'UTF-8',
  } as any)

  if (parsed.errors.length > 0) {
    errors.push(...parsed.errors.map((e: any) => `CSV parse: ${e.message} (row ${e.row})`))
  }

  const [headerRow, ...rows] = parsed.data
  if (!headerRow) return { listings, errors, source, scanned_at: new Date().toISOString() }

  const hmap = buildHeaderMap(headerRow)
  const get  = (row: string[], field: string): string =>
    (hmap.has(field) ? row[hmap.get(field)!] ?? '' : '').trim()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const raw: Partial<PortalListing> = {
        source,
        external_id:      get(row, 'external_id') || `row_${i}`,
        external_url:     get(row, 'external_url') || null,
        title:            get(row, 'title'),
        price:            normalisePrice(get(row, 'price')),
        area_m2:          parseFloat(get(row, 'area_m2'))  || null,
        rooms:            parseFloat(get(row, 'rooms'))    || null,
        property_type:    get(row, 'property_type') as any || 'other',
        transaction_type: /prenájom/i.test(get(row,'transaction_type')) ? 'rent' : 'sale',
        street:           get(row, 'street')           || null,
        city:             get(row, 'city')             || null,
        district:         get(row, 'district')         || null,
        region:           get(row, 'region')           || null,
        postal_code:      get(row, 'postal_code')      || null,
        seller_name:      get(row, 'seller_name')      || null,
        seller_phone:     get(row, 'seller_phone')     || null,
        seller_type:      'agency',
        description:      get(row, 'description').slice(0, 500) || null,
        cover_photo_url:  get(row, 'cover_photo_url')  || null,
        profile_id:       profileId ?? null,
      }

      if (!raw.title && !raw.price) continue

      listings.push(normaliseListing(raw))
    } catch (err) {
      errors.push(`Row ${i + 2}: ${String(err)}`)
    }
  }

  return { listings, errors, source, scanned_at: new Date().toISOString() }
}

// ── Vlastný web XML feed parser ───────────────────────────────
export async function parsePortalXMLFeed(
  feedUrl:   string,
  source:    PortalSource = 'nehnutelnosti_sk',
  profileId?: string
): Promise<ParseResult> {
  const errors:   string[] = []
  const listings: Partial<PortalListing>[] = []

  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Revolis.AI/1.0 +support@revolis.ai' },
      next:    { revalidate: 0 },
    })
    if (!res.ok) {
      return { listings, errors: [`HTTP ${res.status}`], source, scanned_at: new Date().toISOString() }
    }
    const xml = await res.text()

    // Generic XML property feed — nehnutelnosti.sk / Vlastný web format
    const itemRx = /<(?:item|property|nehnutelnost|inzerat)([\s\S]*?)<\/(?:item|property|nehnutelnost|inzerat)>/g
    for (const m of xml.matchAll(itemRx)) {
      const block = m[1]
      const getTag = (t: string) => {
        const match = block.match(new RegExp(`<${t}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${t}>|<${t}[^>]*>([^<]*)<\\/${t}>`, 'i'))
        return (match?.[1] ?? match?.[2] ?? '').trim()
      }

      const raw: Partial<PortalListing> = {
        source,
        external_id:   getTag('id') || getTag('ref') || getTag('guid'),
        external_url:  getTag('url') || getTag('link'),
        title:         getTag('title') || getTag('nadpis') || getTag('nazov'),
        price:         normalisePrice(getTag('price') || getTag('cena')),
        area_m2:       parseFloat(getTag('area') || getTag('plocha') || '0') || null,
        rooms:         parseFloat(getTag('rooms') || getTag('izby') || '0') || null,
        property_type: getTag('type') || getTag('typ') || 'other',
        city:          getTag('city') || getTag('mesto'),
        street:        getTag('street') || getTag('ulica'),
        region:        getTag('region') || getTag('kraj'),
        seller_type:   'agency',
        profile_id:    profileId ?? null,
      } as any

      if (raw.external_id) listings.push(normaliseListing(raw))
    }
  } catch (err: any) {
    errors.push(`XML feed error: ${err.message}`)
  }

  return { listings, errors, source, scanned_at: new Date().toISOString() }
}
