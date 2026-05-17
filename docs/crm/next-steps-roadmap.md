# ĎALŠÍ VÝVOJ BEZ CHAOSU

## FÁZA 0 — VERIFY
1. Spusť `supabase/04_verify_current_schema.sql`
2. Skontroluj, že existujú všetky tabuľky
3. Skontroluj, že RLS a policies sú zapnuté
4. Ak je verify OK, pokračuj na FÁZU 1

## FÁZA 1 — Modul používateľov a tímov
Cieľ:
- mať reálnych používateľov
- mať tímy
- vedieť priraďovať leady konkrétnym ľuďom

Databáza:
- agencies
- teams
- profiles
- napojenie leads.assigned_profile_id

UI neskôr:
- /team
- /users
- assign lead to agent

## FÁZA 2 — Modul nehnuteľností
Cieľ:
- plný CRUD pre properties
- prehľad inventory
- detail nehnuteľnosti
- väzba properties → leads cez matching

Databáza:
- properties

UI neskôr:
- /properties
- create property
- edit property
- property detail

## FÁZA 3 — Matching engine
Cieľ:
- počítať zhody klient ↔ nehnuteľnosť
- ukladať ich do lead_property_matches

Databáza:
- lead_property_matches

Backend:
- matching worker / action
- recalculate match pri zmene leadu alebo property

UI:
- matching v detaile klienta
- matching v detaile nehnuteľnosti

## FÁZA 4 — Activity stream
Cieľ:
- každá zmena sa zapíše do activities
- mať audit trail

Databáza:
- activities
- pipeline_moves
- tasks

Backend:
- create activity on create/update/delete/move/follow-up

UI:
- timeline v detaile leadu
- timeline v pipeline slide-over

## FÁZA 5 — AI recommendations
Cieľ:
- ukladať AI odporúčania do databázy
- zobrazovať next best action

Databáza:
- ai_recommendations

Backend:
- create recommendation on score, move, inactivity, matching

UI:
- dashboard insights
- lead detail ai panel
- pipeline ai next step

## ODPORÚČANÉ PORADIE IMPLEMENTÁCIE V KÓDE
1. users + teams
2. properties CRUD
3. matching write to DB
4. activities on every action
5. ai recommendations persistence

## PRAVIDLO PROTI CHAOSU
Nikdy nerob naraz:
- novú databázovú tabuľku
- nový veľký UI modul
- AI logiku
- integrácie

Vždy iba:
1 databázová migrácia
1 backend vrstva
1 UI vrstva
1 test
