# 🏗️ Skill: PROJECT_ARCHITECTURE

## Účel
Kompletná mapa projektu. Agent číta toto PRED každou väčšou zmenou.
Žiadne dohady kde čo je – všetko je tu.

---

## Projekt: RealitkaAI / Revolis

```
Repozitár: onlinovosk-bit/realitka-ai
Organizácia: ONLINOVO, s. r. o.
Klient: Reality Smolko, s. r. o. (Rastislav Smolko RSc.)
Platform: Revolis.AI
Production URL: https://app.revolis.ai
Hosting: Vercel (onlinovosk-4317s-projects/realitka-ai)
```

---

## Monorepo štruktúra

```
RealitkaAI/
├── apps/
│   ├── crm/                    ← Hlavná Next.js CRM aplikácia
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/        ← API routes (Next.js App Router)
│   │   │   │   │   └── webhooks/realvia/route.ts
│   │   │   │   └── (dashboard)/
│   │   │   ├── lib/
│   │   │   │   ├── realvia/    ← Realvia integrácia
│   │   │   │   │   └── validate.ts
│   │   │   │   └── revolis-guard.ts
│   │   │   ├── proxy.ts        ← Auth bypass pre webhooky
│   │   │   └── types/
│   │   └── .env.local
│   ├── marketing/              ← Marketing stránka
│   ├── realvia-ingestion/      ← Spracovanie Realvia dát
│   └── revenue-intelligence/   ← Revenue analytika
├── packages/                   ← Shared packages
├── memory/                     ← Agent memory súbory
│   ├── skills.md               ← REVOLIS SKILL LIBRARY (tento súbor)
│   ├── decisions.md            ← Záznamy rozhodnutí
│   ├── session-summary.md      ← Súhrn session
│   ├── people.md               ← Kontakty a osoby
│   ├── preferences.md          ← Preferencie projektu
│   └── user.md                 ← Info o používateľovi
├── briefs/                     ← Task briefy
├── docs/                       ← Dokumentácia
└── scripts/                    ← Utility skripty
```

---

## Tech Stack

| Vrstva | Technológia |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Jazyk | TypeScript |
| Databáza | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js |
| Hosting | Vercel |
| AI | Anthropic Claude API |
| Package manager | pnpm (monorepo) |
| Branch strategy | Feature branches + Stacked PRs |

---

## Kľúčové osoby

| Osoba | Rola | Kontakt |
|---|---|---|
| Andrej Ondruš | CEO / Chief AI Product Architect | andrej@revolis.ai, +421 948 444 014 |
| Rastislav Smolko RSc. | Klient / konateľ Reality Smolko | - |
| pani Bereczová | Realvia technický kontakt | - |

---

## Externé integrácie

| Systém | Typ | Status |
|---|---|---|
| Realvia | Webhook (inbound) | ✅ Implementované 18.05.2026 |
| Domire | Export | ✅ Aktívne |
| backOFFICE | Export | ✅ Aktívne |
| Bazos.sk | Export | ⚫ Vypnuté |
| realitysmolko.sk | Export | ⚫ Vypnuté |
| Matterport | Integrácia | ✅ Aktívne |

---

## Vercel projekty

| Projekt | URL | Branch |
|---|---|---|
| realitka-ai (production) | app.revolis.ai | main |
| realitka-ai (preview) | *.vercel.app | feature/* |

---

## Dôležité príkazy

```bash
# Lokálny vývoj
pnpm dev

# Build
cd apps/crm && pnpm build

# Lint
cd apps/crm && pnpm lint

# Prisma
pnpm prisma generate
pnpm prisma migrate dev

# Vercel CLI
vercel env add NAZOV
vercel deploy --prod
```
