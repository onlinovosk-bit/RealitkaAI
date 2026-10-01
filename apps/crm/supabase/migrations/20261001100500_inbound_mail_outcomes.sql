-- DOMAIN-LOG-DURABLE: jeden riadok na jeden spracovaný e-mail príjmu.
--
-- Prečo: runtime logy Vercelu tu prežijú ~1 h a request bez warn/error v nich
-- vôbec nie je. DOMAIN-READ (2026-10-01) našiel za 6 h jediný záznam, takže sa
-- nedá zistiť ani to, ktoré domény chodia, ani koľko dopytov sa zahodilo.
-- Bez trvalej stopy sa `SOURCE_RULES` dá rozširovať len tipovaním.
--
-- GDPR (ručný rozbor, skill gdpr-advisor v repe neexistuje):
--   * ukladá sa LEN registrovateľná doména odosielateľa a boolean príznaky,
--     NIKDY lokálna časť adresy, meno, telefón, text správy ani `to`;
--   * právny základ 6(1)(f), proporcionalita: doména sama osobu neidentifikuje;
--   * retencia: 90 dní — mazanie ZATIAĽ NEBEŽÍ (otvorené, viď decisions.md).
--
-- Prevádzkový denník, nie tenantné dáta na zobrazenie: RLS zapnutá bez politík,
-- anon ani authenticated nemajú prístup. Píše a číta výhradne service role.

CREATE TABLE IF NOT EXISTS public.inbound_mail_outcomes (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id          uuid        NOT NULL,
  request_id         text,
  event_id           text,
  outcome            text        NOT NULL
                     CHECK (outcome IN ('lead_created', 'not_a_lead')),
  -- not_a_lead: duplicate | not_inquiry | no_contact | unknown_source
  reason             text,
  source             text,
  source_type        text,
  event_kind         text,
  source_detected_by text,
  sender_domain      text,
  parser_version     text,
  has_contact_email  boolean     NOT NULL DEFAULT false,
  has_contact_phone  boolean     NOT NULL DEFAULT false,
  has_listing_ref    boolean     NOT NULL DEFAULT false,
  has_message        boolean     NOT NULL DEFAULT false,
  -- to_missing | to_agency_mailbox | to_unmatched | NULL (priradený makléř)
  mailbox_event      text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inbound_mail_outcomes_agency_created_idx
  ON public.inbound_mail_outcomes (agency_id, created_at DESC);

ALTER TABLE public.inbound_mail_outcomes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.inbound_mail_outcomes FROM anon;
REVOKE ALL ON public.inbound_mail_outcomes FROM authenticated;

COMMENT ON TABLE public.inbound_mail_outcomes IS
  'Prevádzkový denník príjmu e-mailov (DOMAIN-LOG-DURABLE). Bez osobných údajov: len doména odosielateľa + príznaky. Zapisuje service role; anon ani authenticated nemajú prístup. Retencia 90 dní (mazanie zatiaľ nebeží).';
