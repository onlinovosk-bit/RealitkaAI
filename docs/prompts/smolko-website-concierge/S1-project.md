# S1 — PROJECT CONTEXT (Website Concierge)

## Požiadavka (zákazník)

P. Smolko: pôvodný Realvia chatbot po update prestal fungovať. Potrebuje
verejného asistenta nad ponukami (typ / predaj-prenájom / lokalita), zachytenie
záujmu, handoff maklérovi, neskôr booking.

V architektúre = **Website Concierge**.

## Čo už je (over príkazom, never textu naslepo)

| Vec | Ako overiť |
|---|---|
| Interný CRM chat na main | `git cat-file -e origin/main:apps/crm/src/lib/smolko-chatbot.ts` |
| Panel na `/revolis-ai` | `git grep SmolkoChatbotPanel origin/main -- apps/crm/src` |
| Status report | `docs/reports/2026-09-06-smolko-chatbot-status.md` |
| Register brán | `docs/briefs/reality-smolko-blocking-conditions-register.md` |
| B04 kód (#569/#573) | `git merge-base --is-ancestor <sha> origin/main` |
| Open cleanup PR | `gh pr view 544 --json state,title,url` |
| Public visibility kontrakt | `apps/crm/src/lib/properties/public-visibility.ts` |
| Scheduled events kód | `apps/crm/src/lib/scheduled-events/store.ts` + migrácia `20260527143000_*` |
| Google OAuth route | `apps/crm/src/app/api/integrations/google/auth/route.ts` |

## Čo NIE JE hotové (stav k písaniu stacku — vždy re-auditni)

- B04: PROD dôkaz (stĺpec `realvia_updated_at`, freshness rozdelenie, cross-tenant)
- B05: schválené AI disclosure / privacy / FAQ
- B06: routing matrix od Smolka
- B07: `scheduled_events` v produkcii (tabuľka ABSENT + history drift)
- B08/B09: calendar + idempotent confirm
- Verejný Concierge endpoint/UI na webe Reality Smolko (nie dashboard)

## Definition of done pre workerov

Každý uzol končí jedným z:

```
DONE     acceptance S4 pravda + S5 príkazy prešli + HANDOFF vyplnený
BLOCKED  chýba GO / credentials / územie — bez odhadu
HUMAN    potrebný podpis foundera / Smolka / Privacy
```

## Zakázané skratky

- „Voiceflow to vyrieši“ bez dôkazu flow + Revolis handoff kontraktu
- „B04 je PASS lebo unit testy“ bez PROD SQL
- „Booking pridám do MVP“ pred B07
- Rozšírenie scope na B01–B03 / B10 v Concierge vlnách (iný stack)
