# Kontrolor — zlúčenie CRM draftov (16. 11. 2026)

**Verdikt:** PASS na draft PR. `published: true` / merge / LIVE = STOP.

1. **FAKT** — starý slug v runtime nikde neodkazuje (overené `rg` v `.ts/.tsx`). Presmerovanie netreba. PASS.
2. **DÔKAZ** — vitest 89/89, tsc 0, CRM marketing-blog 1/1. CI na heade ešte pred pushom FLAG.
3. **REFUND** — starý text mal 100 % späť; v zlúčenom tele nie je. Test to zamkýna. PASS.
4. **SCOPE** — jeden PR, jeden článok. CI workflow a `vercel.json` nedotknuté. PASS.
5. **WORD COUNT** — 1029, v intervale 700–1200. PASS.
6. **published** — checklist aj AI inzerát ostávajú false. PASS.
7. **ENGINEERING** — žiadny nový súbor kódu. PASS.

**STOP:** zverejniť, merge, LIVE.
