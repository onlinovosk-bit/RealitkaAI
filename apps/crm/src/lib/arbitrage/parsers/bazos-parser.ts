// ================================================================
// Revolis.AI — Bazoš.sk RSS Parser
// Parses public RSS feed for real estate listings
//
// Bazoš RSS URLs:
//   https://reality.bazos.sk/rss.php                   (all SK)
//   https://reality.bazos.sk/rss.php?kraj=Prešovský    (region)
//   https://reality.bazos.sk/rss.php?hledani=presov    (city search)
//
// Rate limit: 1 request / 10s to be a good citizen
// ================================================================
import { normaliseListing, normalisePrice } from '../normalise'
import type { ParseResult, PortalListing, BazosRawItem } from '@/types/arbitrage'

// Regions → Bazoš kraj parameter mapping
const REGION_TO_BAZOS: Record<string, string> = {
  'Prešov':            'Prešovský',
  'Košice':            'Košický',
  'Bratislava':        'Bratislavský',
  'Banská Bystrica':   'Banskobystrický',
  'Žilina':            'Žilinský',
  'Nitra':             'Nitriansky',
  'Trnava':            'Trnavský',
  'Trenčín':           'Trenčínský',
}

export function getBazosRSSUrl(region?: string, city?: string): string {
  const base = 'https://reality.bazos.sk/rss.php'
  const params = new URLSearchParams()

  if (city) {
    params.set('hledani', city)
  } else if (region && REGION_TO_BAZOS[region]) {
    params.set('kraj', REGION_TO_BAZOS[region])
  }

  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

// ── XML → BazosRawItem[] ──────────────────────────────────────
function parseRSSXML(xml: string): BazosRawItem[] {
  const items: BazosRawItem[] = []

  // Grab all <item> blocks
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  for (const m of itemMatches) {
    const block = m[1]

    const get = (tag: string): string => {
      const rx = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`)
      const match = block.match(rx)
      return (match?.[1] ?? match?.[2] ?? '').trim()
    }

    const title       = get('title')
    const link        = get('link')
    const description = get('description')
    const pubDate     = get('pubDate')
    const guid        = get('guid') || link

    if (!title || !link) continue

    // Extract price from title or description: "120 000 €", "120000€", "Cena: 125 000"
    const priceRx = /(\d[\d\s]{2,8})\s*€|[Cc]ena[:\s]+(\d[\d\s]{2,8})/
    const priceMatch = (title + ' ' + description).match(priceRx)
    const rawPrice = priceMatch ? (priceMatch[1] ?? priceMatch[2] ?? null) : null
    const price = rawPrice ? normalisePrice(rawPrice.replace(/\s/g, '')) : null

    // Extract location: usually in description as "Lokalita: Prešov" or just city name
    const locRx = /[Ll]okalit[aa]:\s*([^\n<,]+)|([A-ZÁČŠŽ][a-záčšž]+(?:\s[A-ZÁČŠŽ][a-záčšž]+)?),\s*[Ss]lovensko/
    const locMatch = description.match(locRx)
    const location_raw = locMatch ? (locMatch[1] ?? locMatch[2] ?? null)?.trim() ?? null : null

    items.push({ title, link, description, pubDate, guid, price, location_raw })
  }

  return items
}

// ── BazosRawItem → PortalListing ─────────────────────────────
function mapToListing(item: BazosRawItem): Partial<PortalListing> {
  // Extract area from title: "3-izbový byt 75m²" → 75
  const areaMatch = (item.title + ' ' + item.description)
    .match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i)
  const area_m2 = areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : null

  // Extract rooms: "3-izbový" → 3, "3+1" → 3.5, "garsoniéra" → 1
  let rooms: number | null = null
  const rooms3 = item.title.match(/(\d+)\s*[-+]\s*(?:izbový|izby|izb\b|kk\b|1\b)/i)
  const roomsGarsoniéra = /garsoniéra|1-iz/i.test(item.title)
  if (rooms3) {
    const base = parseInt(rooms3[1])
    rooms = item.title.includes('+1') ? base + 0.5 : base
  } else if (roomsGarsoniéra) {
    rooms = 1
  }

  // Property type from title
  let property_type = 'apartment'
  if (/dom|rodinný|vila/i.test(item.title))    property_type = 'house'
  if (/pozemok|stavebný|záhrad/i.test(item.title)) property_type = 'land'
  if (/komerčné|kancelár|sklad/i.test(item.title)) property_type = 'commercial'

  // Extract external ID from URL
  const idMatch = item.link.match(/\/inzerat\/(\d+)\//)
  const external_id = idMatch ? `bazos_${idMatch[1]}` : `bazos_${item.guid}`

  // City from location_raw
  const city = item.location_raw
    ? item.location_raw.split(',')[0].trim()
    : null

  const raw: Partial<PortalListing> = {
    source:          'bazos_sk',
    external_id,
    external_url:    item.link,
    title:           item.title,
    price:           item.price,
    area_m2,
    rooms,
    property_type:   property_type as any,
    transaction_type: /prenájom|prenajom|rent/i.test(item.title) ? 'rent' : 'sale',
    city,
    location_raw:    item.location_raw,
    seller_type:     'private',   // Bazoš = private sellers by default
    description:     item.description.replace(/<[^>]+>/g, '').slice(0, 500),
  }

  return normaliseListing(raw)
}

// ── Main parser function ──────────────────────────────────────
export async function parseBazosRSS(
  region?: string,
  city?:   string,
  signal?: AbortSignal
): Promise<ParseResult> {
  const url       = getBazosRSSUrl(region, city)
  const errors:   string[] = []
  const listings: Partial<PortalListing>[] = []

  try {
    const res = await fetch(url, {
      signal,
      headers: {
        'User-Agent': 'Revolis.AI Property Intelligence / support@revolis.ai',
        'Accept':     'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 0 },   // never cache — always fresh
    })

    if (!res.ok) {
      errors.push(`Bazoš RSS HTTP ${res.status}: ${url}`)
      return { listings, errors, source: 'bazos_sk', scanned_at: new Date().toISOString() }
    }

    const xml   = await res.text()
    const items = parseRSSXML(xml)

    for (const item of items) {
      try {
        const listing = mapToListing(item)
        // Only include listings with at least price or area
        if (listing.price || listing.area_m2) {
          listings.push(listing)
        }
      } catch (err) {
        errors.push(`Parse error for ${item.guid}: ${String(err)}`)
      }
    }

  } catch (err: any) {
    if (err.name !== 'AbortError') {
      errors.push(`Fetch error: ${err.message}`)
    }
  }

  return {
    listings,
    errors,
    source:     'bazos_sk',
    scanned_at: new Date().toISOString(),
  }
}
