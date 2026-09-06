# Reality Smolko Voiceflow — audit a náprava

**Dátum:** 2026-09-06
**Verdikt:** Voiceflow chat patrí na `realitysmolko.sk`, kde je už vložený. Interný panel `/revolis-ai` bol nesprávna implementácia požiadavky a je odstránený v tejto vetve.

## Overené na verejnom webe

| Kontrola | Nález |
|---|---|
| Vloženie | Footer stránky `https://www.realitysmolko.sk/` načítava Voiceflow bundle a produkčnú verziu existujúceho projektu. |
| Render | DOM má host `#voiceflow-chat`; jeho shadow DOM vykresľuje launcher s titulkom „Poraďte sa!“. |
| Miesto | Ide o návštevnícky web Reality Smolko, nie o prihlásenú aplikáciu Revolis. |
| Verejné ponuky | Web má vlastný výpis `/nehnutelnosti` a filtre lokalita / kategória / typ. |
| Prístup k úprave | Voiceflow Creator je v tomto prostredí odhlásený. Nevytvoril som účet ani som neskúšal obísť prístup. |

## Nesprávne predchádzajúce riešenie

Predchádzajúci slice pridal prihlásený panel „Komu volať a čo zachrániť dnes“ do `/revolis-ai`. Čítal CRM leady a úlohy aktuálneho tenant-u, takže nebol ani verejný, ani špecifický pre Reality Smolko. Neodpovedal na druh nehnuteľnosti, zámer a lokalitu návštevníka.

Odstránené artefakty:

- `apps/crm/src/components/revolis/SmolkoChatbotPanel.tsx`
- `apps/crm/src/app/api/ai/smolko-chat/route.ts`
- `apps/crm/src/lib/smolko-chatbot.ts`
- jeho registry, metriku a testy

## Správny prvý release

Použiť existujúci Voiceflow projekt s hotovým canvasom v `docs/voiceflow/reality-smolko-property-guide-v1.md`:

1. druh nehnuteľnosti: byt / dom / pozemok;
2. zámer: kúpa / prenájom / predaj;
3. lokalita pri kúpe alebo prenájme;
4. prechod na verejný výpis ponúk, prípadne na existujúci formulár Ponuka/dopyt pre predaj.

V1 nespúšťa CRM zápis ani nežiada kontaktné údaje. Aktuálne neexistuje zdokumentovaný parameterizovaný URL kontrakt filtra na webe Reality Smolko, preto tok netvrdí, že výsledky automaticky filtroval.

## Otvorená externá brána

Na publikovanie správneho canvasu je potrebný prístup vlastníka do existujúceho Voiceflow projektu. Po prihlásení ide o jeden konfiguračný zásah v Creatore; samotný skript na webe sa nemení.

## Lokálne overenie

- `npm test -- src/lib/__tests__/revolis-ai-features.test.ts` — **PASS, 12/12**.
- `npm run lint` — **PASS**.
- `rg` cez zdrojové TypeScript súbory — **PASS**, nezostal import panelu, endpoint ani metrika.
- `npm test` — **280 súborov PASS**; 5 integračných/RLS suites sa nespustilo, pretože v tomto worktree nie je nakonfigurovaný lokálny alebo dedikovaný `TEST_SUPABASE_*` projekt. Ich chyby nesúvisia s odstráneným panelom.
- `npm run build` — blokuje existujúca chýbajúca závislosť `uuid` z `src/app/onboarding/useOnboarding.ts`, mimo rozsahu tejto korekcie.
