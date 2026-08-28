# ONL-MCP-001 — nočný audit 25. 8. 2026 (feasibility)

**Status:** DONE (dokument) + **STOP** (žiadna implementácia, žiadny merge)  
**Vetva:** `cursor/onl-mcp-001-feasibility-db1f`  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/476  
**Override:** founder „NIE! CHCEM ABY išla dnes v noci!“ — kalendár 26.→27. 8. sa nečakal.

## Čo sa stalo

Revolis nočná vlna 25.→26. 8. je mimo tejto vetvy (agent-STOP na iných PR). Táto práca je **Onlinovo only**: štyri cesty Shoptet MCP/API, TCO, security, verdikt.

## Verdikt

**BUILD** vlastný vendor-neutral MCP Gateway.  
**DON'T BUY** Shoptet Premium výhradne kvôli oficiálnemu MCP (floor 12 000 Kč/měs.).  
**DON'T BUILD** browser automation a community MCP ako primár.  
**BUY podmienené:** ak už Premium → nainštalovať oficiálny MCP (0 Kč prírastok) pre ľudí; gateway stavať aj tak.

Kánon: [`docs/onlinovo/ONL-MCP-FEASIBILITY.md`](../onlinovo/ONL-MCP-FEASIBILITY.md)

## Overené fakty (výber)

URL check 2026-08-25T21:20:37Z: **12/12 zdrojov HTTP 200**, vrátane `shoptet.cz/cenik` text **„od 12 000 Kč/měs.“** a JSON `price.amount: "12 000"`. Onlinovo fingerprint: `cdn.myshoptet.com`, `web_author=Shoptet.sk`.


| Fakt | Dôkaz |
|---|---|
| Onlinovo.sk je Shoptet | GET homepage: `cdn.myshoptet.com`, `web_author=Shoptet.sk` |
| Tarif Premium vs standard | **NEZNÁME** |
| Oficiálny MCP existuje, Premium-only, URL `https://mcp.shoptet.com/mcp` | podpora.shoptet.cz/shoptet-mcp |
| MCP doplnok zadarmo na Premium | doplnky.shoptet.cz/mcp |
| REST API len cez addon; nie pre single-shop operatorov | developers.shoptet.com basic-information-about-api |
| API token `expires_in: 1800`, max 5 | getting-api-access-token |
| Partner idea ~4 týždne, final ~4 týždne, submit do 6 mesiacov | addons-life-cycle |
| Exporty: produkty XML/CSV/XLSX, objednávky XLSX/CSV | data-export |
| Private API = Premium, `api.myshoptet.com` | private-api |

## Čo sa neskúšalo

- Žiadny Shoptet prod write
- Žiadny token v repe
- Žiadny `apps/crm` diff
- ONL-MCP-002/003/004 neotvorené

## Ďalší krok

Founder: potvrdiť tarif (Premium áno/nie). Až potom `GO ONL-MCP-002` alebo `GO` na addon idea form. Agent **STOP**.
