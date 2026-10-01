# 2026-09-23 — `ignoreCommand` bol pod kľúčom, ktorý Vercel nečíta (nahrádza #578)

## Verdikt

`#578` dal príkaz pod `"git": { "ignoreCommand": ... }`. **Vercel ten kľúč nečíta.**
Ignored Build Step sa od 2026-09-17 **ani raz nespustil** — oba projekty buildovali
každý commit vrátane docs-only a migration-only.

## Dôkaz

**1. Build log deploymentu, ktorý sa mal preskočiť.**
`dpl_8pgg5NkEQQPs1a942q86FeaiDLqP` — projekt `realitka-ai`, commit `472ca758`
(`docs: record the working agreement`), ktorý nezmenil **ani jeden** súbor pod `apps/crm`:

```
Cloning github.com/onlinovosk-bit/RealitkaAI (Branch: main, Commit: 472ca75)
Cloning completed: 1.525s
Restored build cache from previous deployment (...)
Running "vercel build"
```

Medzi klonovaním a buildom **nie je žiadny ignore krok**. Nespustil sa.

**2. Vercel schéma a dokumentácia.** `ignoreCommand` je **top-level** vlastnosť
`vercel.json`. Objekt `git` prijíma `deploymentEnabled` — `ignoreCommand` medzi jeho
kľúčmi nie je nikde dokumentovaný.

**3. Prečo to vyzeralo, že to funguje.** V zozname deploymentov bolo 12 `CANCELED`,
čo pôsobilo ako preskočené buildy. Pri spárovaní po commitoch ale vyšiel nezmysel —
napr. `b32aa132` (#643, zmenil 1 súbor pod `apps/crm`) mal `realitka-ai` = CANCELED
a `revolis-marketing` = READY, teda presne naopak, než by ignoreCommand urobil.
Tie `CANCELED` sú `autoJobCancelation` — Vercel ruší rozbehnutý build, keď na `main`
pristane novší commit. Pri dnešnom tempe mergov to vyzerá ako náhodný vzor.

**4. Prečo to harness nechytil.** `scripts/vercel-ignore-command.test.mjs` mal príkaz
**natvrdo v konštante `GOOD`** a `vercel.json` vôbec nečítal. Testoval teda logiku
shell príkazu, nie to, či ho Vercel vôbec prečíta. 4/4 zelené pri mŕtvom kľúči.

## Oprava

1. `ignoreCommand` presunutý na **top-level** v `apps/crm/vercel.json`
   aj `apps/marketing/vercel.json`; mŕtvy `git` objekt odstránený.
2. Príkaz opravený:
   - základ je `VERCEL_GIT_PREVIOUS_SHA` (SHA posledného úspešného deploymentu,
     Vercel ho vystavuje **práve len** keď je Ignored Build Step nastavený),
     s fallbackom na `HEAD^`;
   - `git cat-file -e` overí, že základ je v shallow klone dostupný — ak nie,
     `exit 1` = **buildni** (fail-open, nikdy nepreskoč pri pochybnosti);
   - `apps/crm` navyše vylučuje `supabase/migrations` — migrácie aplikuje
     `supabase db push`, nie Next.js build, takže na build nemajú vplyv.
3. Harness **číta príkaz z `vercel.json`** namiesto vlastnej kópie a zlyhá,
   ak `ignoreCommand` opäť skončí pod `git`.

## Validácia (merané 2026-09-23)

| ID | Kontrola | Výsledok |
|----|----------|----------|
| V1 | `node scripts/vercel-ignore-command.test.mjs` | **4/4 passed**, exit 0 |
| V2 | `--mutate-bad-grep` | `mixed` FAIL got=0 expect=1 → mutácia zachytená |
| V3 | regresia: `ignoreCommand` vrátený pod `git` | **exit 1** + menovitá chyba |
| V4 | `472ca758` (docs-only) proti reálnej histórii | exit 0 = SKIP ✓ |
| V5 | `b32aa132` (len migrácia) | exit 0 = SKIP ✓ (bez exclude: BUILD) |
| V6 | `fc381004` (1 súbor v `apps/crm`, nie migrácia) | exit 1 = BUILD ✓ |
| V7 | fail-open: neexistujúci `VERCEL_GIT_PREVIOUS_SHA` | exit 1 = BUILD ✓ |
| V8 | `crons` v `apps/crm/vercel.json` | 16 pred aj po, nedotknuté |

## Čo to NErieši — a prečo to treba povedať nahlas

**Nešetrí to dennú kvótu `api-deployments-free-per-day`.** Kvóta sa míňa pri
**vytvorení** deploymentu; ignoreCommand beží až potom. Šetrí build minúty a CI čas,
nie počet deploymentov. `memory/decisions.md` (2026-09-20) to už raz zaznamenal;
návrh tejto brány to napriek tomu tvrdil opačne. Tvrdenie bolo nesprávne.

Na **počet** deploymentov je páka `git.deploymentEnabled` (per vetva alebo úplne),
prípadne vypnutie preview deploymentov v nastavení projektu. To je produktové
rozhodnutie — stratia sa preview URL — a patrí do samostatnej brány.
