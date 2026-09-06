# Supabase MCP authentication blocker

**Dátum:** 2026-09-06  
**Požiadavka:** „Autentifikuj Supabase MCP.“  
**Verdikt:** `USER_ACTION_REQUIRED` — cloud agent nemôže dokončiť OAuth 2.1 autentifikáciu za používateľa.

## 1. Stav overenia

| Kontrola | Výsledok |
|---|---|
| Cursor dynamic namespace `Supabase` | `needsAuth` |
| Supabase MCP tools | `[]` — žiadny nástroj nie je volateľný |
| Supabase MCP endpoint | `https://mcp.supabase.com/mcp` vracia `401` bez tokenu, čo znamená, že server je dostupný |
| Repo `.mcp.json` | neobsahuje Supabase server; Cursor však Supabase namespace pozná mimo repo konfigurácie |

## 2. Prečo to agent nesmie obísť

Supabase MCP používa OAuth 2.1. Autorizácia patrí používateľovi / workspace účtu a musí prebehnúť cez Cursor auth flow v prehliadači. Agent nemá bezpečný spôsob, ako:

- otvoriť a potvrdiť OAuth consent za používateľa,
- prijať alebo uložiť používateľský refresh/access token,
- pýtať si alebo vkladať Supabase access token do repozitára alebo chatu.

Žiadny token sa nemá posielať do chatu ani commitovať do repo.

## 3. Presný unblock postup

V Cursor Desktop / Web agent prostredí:

1. Otvoriť MCP / Tools / Integrations panel.
2. Nájsť `Supabase` MCP server.
3. Kliknúť `Authenticate` / `Sign in`.
4. Dokončiť OAuth flow v browseri pre účet, ktorý má prístup k projektu `ypgajkhqtbriqqmyawyv`.
5. Po úspešnom auth reloadnúť / obnoviť agent session.
6. Agent má potom znovu overiť:

```text
GetDynamicTools(namespace="Supabase")
```

PASS kritérium:

- `namespaceStatus` už nie je `needsAuth`,
- tools obsahujú aspoň SQL/query nástroj,
- agent vie spustiť read-only dotaz proti projektu `ypgajkhqtbriqqmyawyv`.

## 4. Následný krok po auth

Po autentifikácii Supabase MCP pokračovať priamo v `SMO-B04`:

- spustiť read-only SQL z `docs/reports/2026-09-06-smo-b04-realvia-tenant-negative-test.md` §4,
- uložiť výsledok do nového reportu,
- až potom prípadne zmeniť status SMO-B04 z `BLOCKED`.

## 5. Brána

**BRÁNA:** `USER_ACTION_REQUIRED`.  
Bez OAuth auth nie je možné vykonať produkčný Supabase MCP test. DB write zostáva STOP.

