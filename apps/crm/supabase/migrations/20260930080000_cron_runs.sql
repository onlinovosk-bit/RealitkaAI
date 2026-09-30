-- BRI-CRON-OBSERVE-01: cron_runs — jeden riadok na jeden beh cronu.
--
-- Prečo vôbec: 2026-09-30 o 02:40 UTC prvýkrát bežal /api/cron/recompute-bri.
-- `lead_scores` zostali na nule a o 07:50, keď sa to kontrolovalo, sa už nedalo
-- zistiť prečo — runtime logy Vercelu tu prežijú asi hodinu a route vracia
-- `{ ok: true, computed: 0 }` rovnako, keď nemá čo počítať, ako keď zlyhala.
-- Beh, po ktorom nezostane stopa, sa nedá vyšetriť; táto tabuľka je tá stopa.
--
-- Nie je to tenant dáta, je to prevádzkový denník: žiadne agency_id, žiadny
-- prístup pre anon ani authenticated. Píše a číta výhradne service role
-- (a founder cez SQL editor). RLS je zapnutá, takže bez politík je tabuľka pre
-- oba klientske roly uzavretá — fail-closed, nie fail-open.

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job         text        NOT NULL,
  status      text        NOT NULL
              CHECK (status IN ('ok', 'empty', 'partial', 'failed')),
  -- scanned  = koľko entít beh našiel na vstupe (tu: aktívne profily)
  -- eligible = koľko z nich prešlo filtrom (tu: leady na prepočet)
  -- written  = koľko zápisov sa naozaj podarilo
  -- failed   = koľko pokusov zlyhalo
  scanned     integer     NOT NULL DEFAULT 0 CHECK (scanned  >= 0),
  eligible    integer     NOT NULL DEFAULT 0 CHECK (eligible >= 0),
  written     integer     NOT NULL DEFAULT 0 CHECK (written  >= 0),
  failed      integer     NOT NULL DEFAULT 0 CHECK (failed   >= 0),
  -- prvá chyba doslovne; bez nej ostáva „niečo zlyhalo", čo nikomu nepomôže
  first_error text,
  detail      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer     CHECK (duration_ms >= 0),
  started_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cron_runs_job_started_idx
  ON public.cron_runs (job, started_at DESC);

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cron_runs FROM anon;
REVOKE ALL ON public.cron_runs FROM authenticated;

COMMENT ON TABLE public.cron_runs IS
  'Prevádzkový denník behov cronov (BRI-CRON-OBSERVE-01). Jeden riadok na beh. Zapisuje service role; anon ani authenticated k nej nemajú prístup.';
COMMENT ON COLUMN public.cron_runs.status IS
  'ok = prebehlo a niečo zapísalo; empty = nebolo čo spracovať; partial = časť zlyhala; failed = nezapísalo sa nič.';
