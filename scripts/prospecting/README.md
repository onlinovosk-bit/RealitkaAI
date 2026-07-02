# Revolis Prospecting Pipeline (lokálny CLI)

**Nie je deploynuté do Vercelu.** Spúšťaj z koreňa monorepa cez `npx tsx`.

## Účel spracovania (B2B — text na review pre AKMV)

Tento pipeline spracúva **výhradne firemné údaje** z exportu FinStat (verejný obchodný register) a **verejné firemné webstránky** uvedené v tomto exporte. Cieľom je identifikácia realitných kancelárií (RK) zodpovedajúcich ideálnemu zákazníckemu profilu (ICP) a príprava podkladov pre **obchodný B2B kontakt** (oprávnený záujem — ponuka softvéru pre RK).

Ukladáme len: IČO, názov firmy, sídlo, konateľa, firemný e-mail/telefón (nie osobné gmail/azet), odhad veľkosti tímu z verejného webu, detekciu odkazov na portály (bez ich sťahovania).

## Čo pipeline ZÁMERNE nerobí

| Zakázané | Dôvod |
|----------|--------|
| Scraping realitných portálov (nehnutelnosti.sk, topreality, …) | ToS + GDPR; hardcoded denylist + test |
| Súkromné e-maily ako outreach kontakt | B2B len firemná komunikácia |
| Retries / agresívne fetche | Šetrný bot, rate limit 1 req / 2 s / doména |
| Deploy na Vercel / cron v produkcii | Lokálny outreach nástroj |

## Vstup

Umiestni export do:

```
data/finstat-export.csv
```

Vzor: `data/finstat-export.sample.csv`. Hlavičky sa mapujú automaticky (ico, nazov, web, kraj, …).

## Príkazy (idempotentné)

```bash
# 1. Enrichment (cache v data/prospecting-cache/)
npx tsx scripts/prospecting/enrich.ts
npx tsx scripts/prospecting/enrich.ts --force   # ignoruj cache

# 2. ICP skóre
npx tsx scripts/prospecting/score.ts

# 3. Export CSV + markdown report
npx tsx scripts/prospecting/export.ts
npx tsx scripts/prospecting/export.ts --personalize 10   # top 10 → Anthropic ( .env.local )
```

## Výstupy

| Súbor | Obsah |
|-------|--------|
| `data/enriched.json` | Web enrichment per IČO |
| `data/scored.json` | ICP skóre + breakdown |
| `data/prospects-scored.csv` | Zoradený outreach zoznam |
| `data/prospects-report.md` | Po krajoch, histogram, top 50 |

## ICP váhy (0–100)

- Tím na webe 3–10: **30** (1–2: 10, 11–15: 15)
- FinStat zamestnanci 3–10: **25**
- ≥2 portály v linkoch: **15**
- Bez CRM widgetov: **10**
- Kraj Prešovský/Košický: **10**
- Konateľ ako maklér na webe: **10**

Diskvalifikácia: franšízové brandy (RE/MAX, …), 1-osobová bez webu.

## Testy

```bash
cd apps/crm
npx vitest run --config ../../scripts/prospecting/vitest.config.ts
```

## Env (voliteľné)

`ANTHROPIC_API_KEY` v `apps/crm/.env.local` alebo `.env.local` — len pre `--personalize`.

## Bot identita

`User-Agent: RevolisBot/1.0 (+https://revolis.ai/bot)` · robots.txt · max 6 stránok / doména · timeout 10 s.
