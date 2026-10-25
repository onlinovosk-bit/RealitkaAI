-- BRI-ONCONFLICT. compute_bri_score aj compute_bri_score_v2 upsertujú do
-- public.lead_scores s `ON CONFLICT (profile_id, lead_id)`. Taký constraint
-- na tabuľke NEEXISTUJE — má len PRIMARY KEY (id) a UNIQUE (lead_id) —
-- takže obe funkcie padajú pri KAŽDOM volaní:
--
--   rpc compute_bri_score: there is no unique or exclusion constraint
--   matching the ON CONFLICT specification
--
-- Zmerané v PROD 2026-10-19: cron `recompute-bri` 3 z 3 pokusov `failed`,
-- `lead_scores` má 0 riadkov. Žiadne BRI skóre teda nikdy nevzniklo.
--
-- PREČO SA PRIDÁVA (profile_id, lead_id) — a prečo nie:
-- Pôvodný zámer bol kľúč (profile_id, lead_id): migrácia
-- 20260425231407_event_pipeline.sql tabuľku s ním zakladá. Lenže ju zakladá
-- podmienene (klauzula IF NOT EXISTS) a tabuľka už existovala — založila ju
-- 20260418_enterprise_ai_intelligence.sql s UNIQUE (lead_id). Composite
-- sa preto nikdy neaplikoval; prešli len jej ADD COLUMN (odtiaľ je
-- profile_id nullable).
--
-- Pozn.: táto migrácia sama NEZAKLADÁ žiadnu tabuľku, iba znovu vytvára dve
-- funkcie. Predošlá verzia komentára vyššie obsahovala doslovné znenie
-- príkazu na založenie tabuľky a `check-security.mjs` ho zachytil ako
-- skutočný príkaz (regex číta aj komentáre), takže PR spadol na bezpečnostnej
-- bráne. Preto je tu opísaný slovom.
--
-- Pridať composite a nechať aj UNIQUE (lead_id) sa nedá zmysluplne: druhý
-- profil skórujúci ten istý lead by porušil UNIQUE (lead_id). Zahodiť
-- UNIQUE (lead_id) sa tiež nedá: závisí od neho tretí zapisovateľ,
-- `enterprise-intelligence-store.ts` (`onConflict: "lead_id"`), ktorý beží
-- z /api/ai/process-lead.
--
-- Riešenie, ktoré nerozbije nikoho: cieliť konflikt na kľúč, ktorý SKUTOČNE
-- existuje — (lead_id). Je to zároveň správny kľúč podľa dátového modelu:
-- `leads.assigned_profile_id` priraďuje lead práve jednému profilu, takže
-- na jeden lead patrí jeden riadok skóre. Pri prepise leadu na iného
-- makléra sa `profile_id` v DO UPDATE prepíše, takže riadok ide za novým
-- vlastníkom namiesto toho, aby zhodil zápis na UNIQUE (lead_id).
--
-- PREČO SA FUNKCIA NEPREPISUJE KÓPIOU Z REPOZITÁRA:
-- v PROD je aplikovaných 78 zo 138 migrácií (zmerané 2026-10-19), takže
-- živé telo funkcie sa môže líšiť od ktoréhokoľvek súboru v repe.
-- Prepísanie kópiou by potichu vrátilo späť zmeny, o ktorých nevieme.
-- Táto migrácia preto PATCHUJE živú definíciu: vezme pg_get_functiondef,
-- vymení jeden podreťazec a funkciu znovu vytvorí. Keď podreťazec nenájde,
-- RAISE — nikdy nespraví niečo iné, než čo je tu napísané.

BEGIN;

DO $migration$
DECLARE
  v_name    TEXT;
  v_def     TEXT;
  v_new     TEXT;
  v_patched INT := 0;
  v_skipped INT := 0;
BEGIN
  FOR v_name, v_def IN
    SELECT p.proname, pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('compute_bri_score', 'compute_bri_score_v2')
  LOOP
    -- Už opravená (opakované spustenie migrácie) → nechať tak.
    IF position('ON CONFLICT (profile_id, lead_id)' IN v_def) = 0 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Jediná zmena: cieľ konfliktu + prepis profile_id na aktuálneho vlastníka.
    -- Obe funkcie majú `ON CONFLICT (profile_id, lead_id)` práve raz
    -- (overené v PROD 2026-10-20); `replace` tak nemá čo iné zasiahnuť.
    v_new := replace(
      v_def,
      'ON CONFLICT (profile_id, lead_id)',
      'ON CONFLICT (lead_id)'
    );

    -- Pri konflikte na lead_id musí riadok prevziať aktuálneho vlastníka,
    -- inak by po prepise leadu ostalo staré profile_id a čítanie
    -- `.eq(lead_id).eq(profile_id)` by riadok nenašlo.
    v_new := replace(
      v_new,
      'DO UPDATE SET',
      'DO UPDATE SET' || E'\n    profile_id       = EXCLUDED.profile_id,'
    );

    IF v_new = v_def THEN
      RAISE EXCEPTION 'BRI-ONCONFLICT: % sa nezmenila, patch neplatí', v_name;
    END IF;

    EXECUTE v_new;
    v_patched := v_patched + 1;
    RAISE NOTICE 'BRI-ONCONFLICT: opravená %', v_name;
  END LOOP;

  IF v_patched + v_skipped <> 2 THEN
    RAISE EXCEPTION
      'BRI-ONCONFLICT: čakali sa 2 funkcie, spracované % (opravené %, preskočené %)',
      v_patched + v_skipped, v_patched, v_skipped;
  END IF;
END
$migration$;

-- Dôkaz po migrácii: ani jedna z oboch funkcií už necieli na neexistujúci
-- constraint. Keby áno, migrácia tu spadne a nenechá PROD v polovičnom stave.
DO $overenie$
DECLARE
  v_zle INT;
BEGIN
  SELECT count(*) INTO v_zle
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('compute_bri_score', 'compute_bri_score_v2')
    AND pg_get_functiondef(p.oid) LIKE '%ON CONFLICT (profile_id, lead_id)%';

  IF v_zle > 0 THEN
    RAISE EXCEPTION 'BRI-ONCONFLICT: % funkcií stále cieli na (profile_id, lead_id)', v_zle;
  END IF;
END
$overenie$;

COMMIT;
