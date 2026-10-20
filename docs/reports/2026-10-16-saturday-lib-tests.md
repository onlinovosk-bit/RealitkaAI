# Sobotné testy — billing, proxy, AI volanie

**ZMERANÉ** prehliadnutím stromu na `main` @ `9168d583` (2026-10-16):

- `apps/crm/src/lib/billing/` má dva zdrojové súbory a oba už mali test. Doplnené sú mapovanie `starter` → solo grant 30 a `enterprise` → office grant 40 (2 sedadlá) a `null` pri chybe dotazu.
- `apps/crm/middleware.ts` v strome **nie je**. Next 16 brána je `src/proxy.ts`. Behové testy už sú v `src/proxy-auth-timeout.test.ts` a verifikačný test `tests/verification/proxy-session-gate.verification.test.ts` drží, že mŕtvy `middleware.ts` sa nevráti.
- AI volanie `callOpenAI` v `src/lib/ai/openai.ts` nemalo priamy test. Nový súbor overí, že bez `OPENAI_API_KEY` letí veta „OPENAI_API_KEY nie je nastavený“ a klient sa nevolá, a že e-mail v správe odíde ako `[EMAIL_1]` a v odpovedi sa vráti.
