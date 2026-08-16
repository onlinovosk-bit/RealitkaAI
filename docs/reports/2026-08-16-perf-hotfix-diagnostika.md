# Perf hotfix diagnostika ? 16.8.2026

**Re?im:** docs-only + read-only Supabase MCP. ?iadny merge, ?iadny z?pis do `memory/`, ?iadny z?sah do prod DB.
**Gate:** `origin/main` = `0e3f90769` (#418) ? lane sa spustil.
**Projekt:** `ypgajkhqtbriqqmyawyv` (eu-west-1, Postgres 17).

## ?o sme h?adali

Founder nameril T1 ~4 min na `/dashboard` a T1/T2 ~5 min na `/acquisition`. Recon vlna podozrievala:

1. undici 300 s fetch timeout (?iadny AbortSignal na Supabase klientoch),
2. serializovan? `/acquisition` render (druh? `getUser` + accounts ? campaigns ? events),
3. dashboard klient 6? sequential await za jedn?m spinnerom,
4. `profiles` UPDATE + service-role prieskum na ka?d? request (kandid?t na Postgres 57 ERRORS / lock).

## Postgres logy (READ-ONLY MCP `query_logs`)

Okno **16.8.2026 06:00?09:00 UTC** (`postgres_logs`, bez checkpointov):

| event_message | n |
|---|---|
| `column leads.sofia_insight does not exist` | 23 |
| `duplicate key value violates unique constraint "guardian_open_unique"` | 11 |
| `column leads.last_contact_at does not exist` | 6 |
| `column leads.is_active does not exist` | 2 |
| `could not receive data from client: Connection reset by peer` | 1 |

Okno **15.8. 09:20 ? 16.8. 09:20 UTC** (24 h, tie ist? filtre):

| event_message | n |
|---|---|
| `column leads.sofia_insight does not exist` | 23 |
| `column leads.last_contact_at does not exist` | 12 |
| `duplicate key value violates unique constraint "guardian_open_unique"` | 11 |
| `column leads.is_active does not exist` | 9 |
| `column "inserted_at" does not exist` | 2 |
| `column "cmd" does not exist` | 1 |
| `could not receive data from client: Connection reset by peer` | 1 |
| `column profiles.account_status does not exist` | 1 |

H?adanie deadlock / lock_timeout / statement timeout / serialization failure v tom istom 24 h okne: **0 riadkov**.

### Z?ver k R-5 / L34 hypot?ze

**Nepotvrden?.** 57 ERRORS z dashboardu Supabase nie s? row-lock contention na `profiles`. Dominantn? zdroj s? **SELECT-y na neexistuj?ce st?pce `leads.*`** (schema drift) + unique violation na `guardian_open_unique`. L34 (throttling UPDATE + skip service-role) ost?va u?ito?n? ako zn??enie write amplification, ale **nie je d?kaz, ?e to bolo pr??inou min?tov?ch T1/T2**.

Schema drift (`sofia_insight`, `last_contact_at`, `is_active`) je samostatn? backlog ? nemie?a? do tejto perf vlny.

## Founder klik?-postup (ak MCP nie je k dispoz?cii nabud?ce)

1. [Supabase Dashboard](https://supabase.com/dashboard/project/ypgajkhqtbriqqmyawyv) ? **Logs & Analytics** ? **Postgres Logs**.
2. Severity = **ERROR**.
3. ?asov? okno: `2026-08-16 06:00 UTC` ? `2026-08-16 09:00 UTC`.
4. H?adaj k?dy: `40P01` deadlock, `55P03` lock_timeout, `57014` query_canceled, `25P02` in failed SQL transaction.

## ?o z toho plynie pre P1

- **L30** (8 s fetch abort) rie?i mechanizmus 300 s stropu ? najvy??? p?kov? efekt na T1.
- **L32** rie?i deterministick? T2 visenie `/acquisition` (paraleln? selecty + bez duplicitn?ho `getUser` v page).
- **L33** rie?i `/dashboard` T1 spinner (leads najprv, panely `allSettled` + 10 s abort).
- **L31** fail-open proxy po 5 s, aby visut? `getUser` v middleware nestrhol ka?d? routu.
- **L34** zni?uje zbyto?n? `profiles` UPDATE / service-role; Smolko merge ost?va 1:1.
- **server-timing.ts** v tomto PR **nie je** ? volite?n?, limity PR; meranie po deploy ost?va founder T1/T2.

## Po merge + deploy (founder GO)

Zmera? T1/T2 na `/dashboard`, `/leads`, `/acquisition`. Cie?: T1 < 10 s v?ade. Ak `/acquisition` ostane pomal? po L30+L32, pr??ina je v DB pl?ne/RLS, nie v SSR waterfalle.

## STOP

Tento lane je docs-only. Merge rob? v?hradne founder.
