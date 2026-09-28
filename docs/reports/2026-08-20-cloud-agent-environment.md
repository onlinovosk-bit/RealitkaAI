# Cloud Agent development environment — setup report

Dátum: 2026-08-20
Vetva: `cursor/setup-dev-environment-4850`

## Čo bolo nastavené

Nový, verzovaný Cloud Agent development environment pre monorepo (primárna appka
`apps/crm` — Next.js 16 CRM so Supabase backendom). Konfigurácia je repo-managed:

- `.cursor/environment.json` — definícia prostredia (install / start / terminals).
- `.cursor/install.sh` — durable, idempotentná príprava: system tooling
  (Docker + `fuse-overlayfs` + Supabase CLI) a `npm ci` v `apps/crm`.
- `.cursor/start.sh` — per-boot reconciliácia: štart Docker daemona a lokálneho
  ephemeral Supabase stacku, generovanie `apps/crm/.env.local` z lokálnych
  Supabase kľúčov.
- `terminals.crm-dev` — `npm run dev` (Next.js dev server na porte 3000).

## Kľúčové rozhodnutia / nálezy

- **Docker-in-Docker**: v nested Cloud Agent VM beží `dockerd` so storage driverom
  `fuse-overlayfs`.
- **Networking fix**: container-to-container TCP cez bridge zlyhával (Supabase
  inter-container volania viseli). Riešenie: `sysctl net.bridge.bridge-nf-call-iptables=0`
  (a ip6 variant) — bridged prevádzka obchádza host iptables FORWARD chain. Nastavuje
  sa v `start.sh` pri každom boote.
- **Supabase CLI** pinnutý na `v2.115.0`; lokálny stack cez `supabase start`
  (config `apps/crm/supabase/config.toml`), migrácie + `seed.sql` aplikované.
- **Runtime env**: `src/config/env.ts` (zod) vyžaduje `OPENAI_API_KEY`,
  `STRIPE_SECRET_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. Pre lokálny dev
  `start.sh` zapisuje placeholder hodnoty do `.env.local` (reálne kľúče patria do secrets).
- `.env.local` je gitignored a generovaný za behu — necommituje sa.

## Verifikácia (end-to-end)

| Kontrola | Príkaz | Výsledok |
| --- | --- | --- |
| Install (idempotentný) | `bash .cursor/install.sh` (2×) | PASS |
| Lint | `npm run lint` (apps/crm) | PASS |
| Unit + RLS testy | `npm test` (apps/crm) | 1122 passed / 6 todo, 235 súborov |
| Production build | `npm run build` (apps/crm) | PASS |
| Local Supabase | `supabase start` | migrácie + seed OK, všetky služby healthy |
| Dev server | `npm run dev` (terminals) | Ready na :3000, `/api/healthz` → `{"ok":true}` |
| E2E flow | registrácia → onboarding → dashboard | PASS (user zapísaný do `auth.users`) |

Reálna akcia: cez UI vytvorený účet `demo.agent@revolis.local`, redirect na
`/onboarding/step-1-vitaj`, následne autentikovaný `/dashboard`. Zápis potvrdený
priamo v DB (`select ... from auth.users`).

## Build verifikácia (fresh Cloud Agent)

- Snapshot VM → draft build `bld-20260820-65806a15` (install exit 0, `npm ci` 8 s,
  Docker + Supabase CLI zapečené v snapshote).
- Fresh agent bootnutý z buildu: `node v22.14.0`, `docker 29.1.3`, `supabase 2.115.0`;
  supabase kontajnery healthy; `/api/healthz` → `{"ok":true}`; REST dotaz na seedované
  `agencies` vrátil "Reality Smolko, s. r. o." → potvrdená DB konektivita.
- `start.sh` sprísnený: retry + readiness poll okolo `supabase start` (odolné voči
  tranzientnému `LegacyStatusDbNotReadyError`, keď DB kontajner ešte štartuje).
  Overená konvergencia na 1 spustenie aj idempotencia pri opakovaní.
