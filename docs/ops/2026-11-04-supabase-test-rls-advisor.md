# Supabase advisor: TEST projekt `ndfytadjboqvtsrpdyby` (stav 31.10.2026)

Alerty: `rls_disabled_in_public`, `sensitive_columns_exposed`. Živý stav **NEOVERENÉ** (bez Supabase prístupu).

- Repo odkazuje na TEST projekt len v dokumentácii (`docs/architecture/2026-10-06-self-serve-signup.md:28`, `docs/reports/2026-08-15-migration-history-audit.md:353`) – slúži na overovacie behy s ROLLBACK. PROD CRM = `ypgajkhqtbriqqmyawyv`. Vercel env: UNKNOWN.
- Kandidáti (NEOVERENÉ): `credit_redemption_codes` (`code`, `purchaser_email`, `stripe_session_id`), `demo_prefill_links` (`token`, `email`, `phone`, `name`).
- Oprava: migrácia `20261104120000_rls_close_codes_prefill_links.sql` (RLS + deny-all, REVOKE anon/authenticated). Kód používa len service_role.
- Po GO: najprv read-only dotaz z konca migrácie na TEST, potom aplikovať migráciu na TEST; PROD len po samostatnom GO a rovnakom read-only overení. Ak TEST projekt nie je potrebný, odporúčanie: pozastaviť ho.
