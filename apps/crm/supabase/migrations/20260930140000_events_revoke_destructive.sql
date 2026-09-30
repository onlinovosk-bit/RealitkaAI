-- EVENTS-WRITE-PATH-01: anon a authenticated strácajú právo `events` zmazať.
--
-- Nález pri zapájaní zapisovacej cesty. `public.events` má RLS zapnutú a jej
-- politiky sú v poriadku, ale grants boli široké:
--
--   anon           INSERT, SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
--   authenticated  to isté
--
-- RLS chráni riadky, ale **TRUNCATE nie je riadková operácia a RLS ju
-- nekontroluje**. Držiteľ browserového (publishable) kľúča teda mohol tabuľku
-- vyprázdniť jedným volaním, bez ohľadu na politiky. UPDATE a DELETE sú
-- politikami dnes zablokované (permisívna politika pre ne neexistuje), ale
-- držať grant, ktorý nemá krývať nič, je zbytočná plocha — a o jednu zabudnutú
-- politiku neskôr by to prestalo platiť.
--
-- Práve do tejto tabuľky ide engagement signál (ENGAGEMENT-EMAIL-01), takže
-- moment na zúženie je teraz, kým je prázdna.
--
-- Čo zostáva: SELECT a INSERT, oboje scopované politikami na vlastný profil
-- (`profiles.auth_user_id = auth.uid()`). Serverové zápisy idú service-role
-- klientom cez politiku `service role full access` a tie sa nemenia.

REVOKE TRUNCATE, DELETE, UPDATE, REFERENCES, TRIGGER ON public.events FROM anon;
REVOKE TRUNCATE, DELETE, UPDATE, REFERENCES, TRIGGER ON public.events FROM authenticated;

-- Explicitne potvrdené, nech je zámer čitateľný aj bez git histórie.
GRANT SELECT, INSERT ON public.events TO anon, authenticated;

COMMENT ON TABLE public.events IS
  'Event pipeline. Zápis zo servera ide service-role klientom (logEvent s `client`); anon/authenticated majú len SELECT a INSERT, oboje scopované RLS na vlastný profil. TRUNCATE odobraný zámerne — RLS ho nekontroluje (EVENTS-WRITE-PATH-01).';
