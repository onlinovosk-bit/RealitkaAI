// ================================================================
// Revolis.AI — Negotiation Script Generator
// Generates a data-backed conversation script for the maklér
// based on the seller's price trail history
// ================================================================
import type { NegotiationBrief, NegotiationLine } from '@/types/price-trail'

const fmt = (n: number) => n.toLocaleString('sk-SK')

export function generateNegotiationScript(
  brief: NegotiationBrief
): NegotiationLine[] {
  const {
    drop_count, total_drop_eur, total_drop_pct, days_on_market,
    first_price, current_price, estimated_floor, negotiation_range,
    motivation_tier, days_since_last_drop,
  } = brief

  const hasDrop = drop_count > 0

  const lines: NegotiationLine[] = []

  // ── OPENER ────────────────────────────────────────────────
  if (motivation_tier === 'urgent') {
    lines.push({
      phase:   'opener',
      text:    `"Sledujeme váš inzerát od začiatku — vidím, že ste cenu upravili ${drop_count}×. Rozumiete mi správne, to ma priviedlo k tomu, aby som vás kontaktoval osobne."`,
      context: `Uznáva ich situáciu bez toho aby pôsobil agresívne. Predajca cíti, že maklér vie o histórii — to vytvára psychologický tlak bez konfrontácie.`,
    })
  } else if (hasDrop) {
    lines.push({
      phase:   'opener',
      text:    `"Zaujal ma váš inzerát — a všimol som si, že ste cenu prispôsobili trhu. To ukazuje, že ste realistický predajca."`,
      context: `Framing poklesu ako "realistický prístup" je kompliment. Predajca je otvorenejší na ďalší rozhovor.`,
    })
  } else {
    lines.push({
      phase:   'opener',
      text:    `"Mám záujemcu, ktorý hľadá presne tento typ nehnuteľnosti v tejto lokalite."`,
      context: `Štandardný opener pre nehnuteľnosti bez veľkej cenovej histórie.`,
    })
  }

  // ── ANCHOR ────────────────────────────────────────────────
  if (hasDrop && first_price && current_price) {
    lines.push({
      phase:   'anchor',
      text:    `"Rozumiem, že ste začínali na ${fmt(first_price)} €. Trh vám povedal svoje — aktuálna cena ${fmt(current_price)} € je${total_drop_pct >= 10 ? ' výrazne' : ''} realistickejšia."`,
      context: `Kotviaci efekt — pripomenie im prvú (vysokú) cenu, čím aktuálna vyzerá ako ústupok. Predajca je psychologicky "unavený" z procesu.`,
    })
  }

  if (days_on_market && days_on_market >= 60) {
    lines.push({
      phase:   'anchor',
      text:    `"${days_on_market} dní na trhu je dlhá doba — kupujúci si to všimnú. Rýchle uzavretie by vám ušetrilo ďalšie mesiace neistoty."`,
      context: `Čas = tlak. ${days_on_market} dní je konkrétne číslo ktoré predajca pozná — nie vaša interpretácia.`,
    })
  }

  // ── FLOOR OFFER ───────────────────────────────────────────
  if (estimated_floor && current_price) {
    const offerPrice = Math.round(estimated_floor / 1000) * 1000  // round to thousands
    lines.push({
      phase:   'floor',
      text:    `"Môj klient by bol ochotný vstúpiť s ponukou ${fmt(offerPrice)} €. Viem, že to nie je číslo, ktoré ste čakali — ale je to seriózna ponuka na stole dnes."`,
      context: `"Dnes" vytvára urgentnosť. Konkrétna suma je anchored na estimated_floor = ${fmt(estimated_floor)} €, vypočítaná z histórie ich vlastných poklesov.`,
    })
  }

  // ── CLOSE ─────────────────────────────────────────────────
  if (motivation_tier === 'urgent' && days_since_last_drop !== null && days_since_last_drop <= 14) {
    lines.push({
      phase:   'close',
      text:    `"Viem, že ste cenu znížili pred ${days_since_last_drop} dňami. Navrhujem stretnúť sa tento týždeň — ukážem vám konkrétne porovnania z trhu a spolu nájdeme číslo, ktoré dáva zmysel pre obe strany."`,
      context: `Čerstvý pokles = čerstvá frustrácia. Stretnutie tento týždeň využíva toto okno kým je predajca stále v "rozhodovacím móde".`,
    })
  } else {
    lines.push({
      phase:   'close',
      text:    `"Čo keby sme sa stretli na 20 minút? Mám dáta z posledných predajov v okolí — ukážem vám kde trh skutočne stojí a čo môžeme realisticky dosiahnuť."`,
      context: `"20 minút" znižuje bariéru vstupu. "Dáta z trhu" pozicionuje makléra ako poradcu, nie predajcu.`,
    })
  }

  return lines
}

// ── Export pre PDF / tlač ────────────────────────────────────
export function formatScriptForExport(
  brief:  NegotiationBrief,
  lines:  NegotiationLine[]
): string {
  const { city, street, motivation_tier, drop_count,
          total_drop_eur, total_drop_pct, days_on_market,
          first_price, current_price, estimated_floor } = brief

  const header = [
    `VYJEDNÁVACÍ BRIEF — Revolis.AI`,
    `═══════════════════════════════`,
    `Nehnuteľnosť: ${street ?? ''} ${city ?? ''}`,
    `Motivácia predajcu: ${motivation_tier.toUpperCase()}`,
    ``,
    `CENOVÁ HISTÓRIA:`,
    `  Prvá cena:    ${first_price?.toLocaleString('sk-SK')} €`,
    `  Aktuálna:     ${current_price?.toLocaleString('sk-SK')} €`,
    `  Celkový pokles: ${total_drop_eur?.toLocaleString('sk-SK')} € (${total_drop_pct?.toFixed(1)}%)`,
    `  Počet poklesov: ${drop_count}`,
    `  Dni na trhu:  ${days_on_market}`,
    `  Odhadovaný floor: ${estimated_floor?.toLocaleString('sk-SK')} €`,
    ``,
    `VYJEDNÁVACÍ SKRIPT:`,
    `───────────────────`,
  ].join('\n')

  const scriptLines = lines.map((l, i) =>
    `\n${i + 1}. [${l.phase.toUpperCase()}]\n${l.text}\n→ ${l.context}`
  ).join('\n')

  return header + scriptLines + '\n\n─── Revolis.AI / app.revolis.ai ───'
}
