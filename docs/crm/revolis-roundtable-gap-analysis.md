# Revolis AI Roundtable — dokument vs. aktuálny kód (prehľad)

Zdroj: interný dokument *Revolis_AI_Roundtable* (obrázky / Word). Porovnanie s `apps/crm` k stavu implementácie.

## Už pokryté alebo čiastočne v produkte

| Téma z dokumentu | V projekte |
|------------------|------------|
| AI asistent / odpovede na lead | `POST /api/leads/[id]/assistant`, `AssistantPanel`, značka AI Asistent |
| Lead scoring | AI skóre, Sales Brain, `ai_engine` |
| Matching nehnuteľností | Matching modul, API |
| Follow-up / outreach | Outreach, úlohy, playbook |
| Konverzačná inteligencia (časť) | Call Analyzer, transkripcia Whisper |
| GDPR / legal stránky | Trust center, DPA, dokumentácia |
| Onboarding flow | `/onboarding`, kroky Step1–9 |
| Performance / testy | Vitest, Playwright, perf smoke, `optimizePackageImports` |
| Deploy / rollback (dokument) | `docs/rollout-plan-24-48h-phases.md`, Vercel štandard |

## V dokumente, nie ako plná produktová implementácia

| Modul (dokument) | Poznámka |
|------------------|----------|
| **M-01 Sofia** ako samostatný engine | Menovanie „Sofia“ v UI čiastočne; dedikovaný `/api/leads/respond` podľa príkladu v dokumente nemusí existovať 1:1 |
| **M-06 CMA** (scraping, PDF) | Nie je end-to-end v tomto scope |
| **M-07 Content** (Tiptap, auto-publish) | Nie je plná implementácia |
| **M-08 Reports** (scheduled Monday) | Čiastočne cez dashboard / forecast — nie ako samostatný report engine |
| **M-09 Gong-style** | Call Analyzer existuje; plný Gong nie |
| **M-10 Compliance** automat | Pravidlá v docs; nie plný cron anonymizácie |
| **FEATURE_FLAG_*** (zoznam v dokumente) | V kóde **nie sú** — dokument je cieľový stav |
| **k6 load** | Nie je povinný v CI v tomto repozitári |
| **Twilio / WA** konkrétne M-01 | Závisí od env; nie vždy zapojené |

## Čo sme doplnili do onboardingu (tento rollout)

- Predajný obsah: tabuľka „čo robí maklér / kde AI vyhráva“, roadmap modulov M-01–M-10 (informačne), tri princípy (rýchlosť, autonómia, dôvera).
- Súbory: `src/components/onboarding/RoundtableOnboardingSection.tsx`, vložené do `src/app/onboarding/page.tsx`; v kroku 4 (`steps/Step4.tsx`) krátky kontextový blok.
- Layout onboardingu: `max-w-3xl` pre lepšiu čitateľnosť tabuľky.
- **Nie** nové backend moduly ani nové env premenné — čisto UX + dokumentácia.
- Env / rollback / test plán: `docs/onboarding-roundtable-env.md`.
- Záloha repozitára: git tag `backup-pre-onboarding-roundtable-2026-04-16`.
