# Speed & time-saving roadmap — 20. 10. 2026

**Vyhlásil:** founder (Andrej), 20. 10. 2026  
**Rozhodnutie:** value proposition Revolisu sa mení z „komu volať ako prvému“ na **rýchlosť a úsporu času** makléra.  
**Tento dokument:** audit toho, čo už v repe je, voči zoznamu AIRAmax (snímky webu od foundera) + fázy podľa hodnoty / námahy.  
**Stav kódu Phase 1:** v tom istom PR, za flagom `LISTING_FROM_PHOTOS_V0` (predvolene OFF).  
**Ceny v3:** nemením.  
**Merge / PROD env:** len na výslovné GO foundera.

Zdroj snímok AIRAmax (nie ich backend): recenzie AIRA Studio + porovnávacia tabuľka (staging, vyprázdnenie, 2 regenerácie, reel, pôdorys, text z fotiek, náhľad pred registráciou). Ich čísla a mená recenzentov **neoverujeme a nekopírujeme**.

---

## 0. Founder Brief (Ústava v2)

1. **Čo navrhujem:** EXTEND existujúceho generátora inzerátov o fotky (Claude vision, `ANTHROPIC_API_KEY` už v stacku). Staging / reel / pôdorys **nestavať** v tomto PR.
2. **Q1 (zaplatil by klient?):** founder povedal, že AIRAmax vyhráva práve týmito funkciami. Strop nie je VALIDATE.
3. **Q8 (timing):** teraz — konkurent to predáva. Nie „príliš skoro“.
4. **Moat:** nie samotná úprava fotky (komodita). Moat = text + parametre + fotky + tenant CRM v jednom ťahu, s kreditmi a izoláciou.
5. **Čo to stojí:** tokeny `NEMERANÉ` na fotku; sadzba modelu je v `apps/crm/src/lib/ai/llm-usage-cost.ts`.
6. **Rozhodnutie tohto PR:** BUILD Phase 1 za flagom + copy na webe iba o tom, čo je LIVE dnes. Ceny a merge nerobím.

---

## 1. Čo AIRAmax predáva (zo snímok)

| # | Funkcia na ich webe | Čo tvrdia |
|---|---|---|
| A | Úprava fotiek (enhance) | pod minútu |
| B | Virtuálny staging | pod minútu |
| C | Vyprázdnenie / declutter | pod minútu |
| D | 2 regenerácie zadarmo | súčasť úkonu |
| E | Reel / short video z tých istých fotiek | Instagram / TikTok |
| F | 2D / 3D pôdorys z inzerátu | z listingu |
| G | Text inzerátu z fotiek | nie len z parametrov |
| H | Náhľad výsledku pred registráciou | bez karty, bez vodoznaku |

---

## 2. Audit Revolis (dôkaz = cesta v repe, 20. 10. 2026)

Stavy: **exists** = volateľné v produkčnej ceste · **partial** = kód / schema / playbook, nie produkt · **missing** = 0 implementácie.

| AIRAmax | Revolis | Stav | Dôkaz |
|---|---|---|---|
| G Text inzerátu z parametrov | **exists** | LIVE | `apps/crm/src/lib/ai/listing-content.ts`, `POST /api/ai/listing-content`, UI `/inzerat-generator`. Vstup: typ, lokalita, cena, výmera, stav, vybavenie, poznámky. **Fotky sa do Claude neposielajú.** Kredit: `listingDescription` = 1 (`credit-rates.ts`). |
| G Text inzerátu z fotiek | **partial → Phase 1 v tomto PR** | FLAG OFF | Nový `POST /api/ai/listing-from-photos`. Bez `LISTING_FROM_PHOTOS_V0=1` vracia 404. Marketing to **nesmie** tvrdiť ako LIVE. |
| A Enhance fotiek | **missing** | — | 0 výskytov Replicate / Fal / image-edit. OpenAI kľúč je na Whisper a embeddings, nie na úpravu fotiek. |
| B Virtual staging | **missing** | — | Žiadny image-edit provider. Claude Sonnet **negeneruje** obrázky. |
| C Declutter / empty room | **missing** | — | Rovnako ako B. |
| D 2 free regenerácie | **missing** | — | Listing route nemá počítadlo regenerácií. Stream route navyše **nestrháva** kredity. |
| E Reel / short video | **partial** | nie produkt | V `apps/crm` ani `apps/marketing` nie je `remotion`. `docs/sales/listing-video-playbook.md` je akvizičný Higgsfield workflow a výslovne **zakazuje** stavať produktový modul. `auth-preview-features.ts`: Listing Reel vynechaný. |
| F 2D/3D pôdorys | **partial** | ingest only | `apps/realvia-ingestion`: `media_type` `photo\|floorplan\|video`, PDF/DWG → `floorplan`. CRM z toho pôdorys **negeneruje**. |
| H Náhľad pred registráciou | **partial** | iný produkt | 14 dní zadarmo bez karty na `www` + `/register`. **Nie** je to neprihlásený náhľad úpravy fotky bez vodoznaku. |
| Import / prechod | **exists** | LIVE | CSV / XLSX, RealSoft XML, Realvia queue. Fotky z importu sú **URL v `properties.images`**, nie vstup do AI. |
| Property Launch Pack | **partial** | FLAG OFF | `PROPERTY_LAUNCH_PACK_V0=1`. Text ide cez ten istý listing generator; fotky len na skóre / microsite URL. |
| AI kredity | **exists** | default OFF | `spendForAction` + RPC `spend_credits`. Vynútenie len pri `CREDITS_ENFORCEMENT=enforce`. Dnes sa listing často nestrháva. |
| Feature flag vzor | **exists** | — | `PROPERTY_LAUNCH_PACK_V0 === "1"`, `decision-flags.ts` explicit true. Predvolene OFF. |

**Remotion prototype:** v aktuálnom `main` **nie je**. Founder ho spomínal — v repe som nenašiel dependency ani composition. Ak existoval mimo tohto monorepa, sem sa nedostal.

---

## 3. Fázy podľa hodnoty / námahy

Poradie: čo maklérovi ušetrí čas **najskôr**, s tým čo už máme.

### Phase 1 — Text inzerátu z fotiek + parametrov · BUILD teraz · tento PR

- **Prečo prvé:** jediná položka z tabuľky AIRAmax, ktorú vieme dodať **komplet** na existujúcom stacku (Anthropic vision + listing JSON + kredity + `/inzerat-generator`).
- **Provider:** `ANTHROPIC_API_KEY`, model `claude-sonnet-4-6` (`claude.ts`). Adapter `ListingVisionProvider` + mock pre testy.
- **Implementácia:** nová route, flag default OFF, auth, `agency_id` povinné, URL fotiek len z `properties.images` daného tenanta, upload len ako `data:` URL, `spendForAction({ action: "listingDescription" })`.
- **Kredit:** 1× `LISTING_DESCRIPTION` (existujúci hook). Vision je drahšia na tokenoch; sadzbu nemením bez GO.
- **Náklad / úkon:** `NEMERANÉ` na fotku. Meria sa z `usage.input_tokens` + `estimateClaudeCostEur` (Sonnet v repe: 3 USD / 1M input, 15 USD / 1M output, kurz 0,92). Predbežný odhad pred meraním **nepíšem**.
- **Dáta / izolácia:** fotky ostávajú v requeste / v `ai_generations.input` pod `agency_id`. Cudzí `propertyId` → 403. Súkromné IP / non-http(s) URL zamietnuté.
- **GDPR:** fotky dodáva maklér (prevádzkovateľ). Model nesmie identifikovať osoby; tváre / EČV / mená na zvončekoch ignorovať (prompt). Zdroj: zhluk 1 / 1b v `master-data-sourcing-map.md` (vlastné CRM + súbor od zákazníka).
- **Acceptance:**
  1. Bez flagu POST → 404; existujúci `/api/ai/listing-content` bez zmeny.
  2. Bez session → 401; bez `agency_id` → 403.
  3. URL fotky, ktorá nie je na nehnuteľnosti tenanta → 403.
  4. Pri `CREDITS_ENFORCEMENT=enforce` a 0 kreditov → 402; inak `spendForAction` pustí a `charged=false`.
  5. Mock provider v testoch vráti C4 `ListingContent` bez siete.
  6. UI sekcia fotiek sa renderuje len keď je flag ON.
  7. Marketing **netvrdí** túto funkciu, kým flag nie je ON v PROD.

### Phase 2 — Úprava fotky (enhance) · VALIDATE → COMPOSE

- **Hodnota:** priamy súperov argument „pod minútu“.
- **Námaha:** nový image-edit provider. V stacku ho **nemáme**.
- **Návrh:** adapter `ImageEditProvider` (enhance / later staging). Kandidáti až po GO: OpenAI Images (kľúč už existuje na iný účel — overiť zmluvu a model), alebo dedicated API (Photoroom, Recraft, Fal). **Nekúpiť** prvého, koho nájde model.
- **Feasible now?** Kódový skelet áno. Produkčná kvalita enhance **nie je overená**. Bez merania na SK interiéroch nestavať ako LIVE claim.
- **Kredit:** nová sadzba (founder). Do vtedy NEhádať počet kreditov.
- **Náklad:** `NEMERANÉ` — v repe nie je cenník image-edit API.
- **Acceptance (až po GO):** flag OFF default; tenant storage; žiadny watermark claim, kým ho fakt nerobíme; 1 credit hook.

### Phase 3 — Staging + declutter · COMPOSE, nie BUILD

- **Hodnota:** to, čo recenzie AIRAmax chvália.
- **Feasible now?** **Nie** na Anthropic/Whisper stacku. Staging je špecializovaný image-edit. Vlastný model = zlá investícia (mega-poplach 5. 10., Stena 2).
- **Návrh:** ten istý `ImageEditProvider`, iný prompt / endpoint. 2 free regenerácie = produktové pravidlo nad kreditmi, nie AI.
- **Odomkne:** founder vyberie providera + sadzbu + GDPR (fotky bytu = často aj cudzie tváre / deti).

### Phase 4 — Reel z fotiek · BACKLOG / akvizícia

- **Hodnota:** sociálne siete, „wow“.
- **Feasible now?** **Nie ako CRM modul na Vercel Hobby.** Remotion v repe nie je; render + ffmpeg bije do timeoutu a denného limitu deployov. Playbook zakazuje produktový modul.
- **Čo áno:** naďalej ručný Higgsfield workflow v `listing-video-playbook.md` (mimo produktu).
- **Až neskôr:** queue worker mimo Hobby, alebo hotové video API. Kredit 4 (AIRAmax tak účtuje) — **nepreberať** bez nášho nákladu.

### Phase 5 — 2D/3D pôdorys · nie je feasible

- Z fotiek interiéru spoľahlivý pôdorys **nie je** dnešný produkčný problém, ktorý vieme sľúbiť.
- Čo áno: uchovať existujúci PDF/DWG z Realvie ako `floorplan` a ukázať ho v CRM (REUSE ingest).
- Generovať 3D z listingu = research. Označené **not feasible yet**.

### Phase 6 — Náhľad pred registráciou bez vodoznaku · samostatná stena

- Iný produkt než CRM úkon: verejný compute zadarmo, zneužitie, náklad.
- Dnes máme trial 14 dní bez karty — to je slušný ekvivalent „skús to“, nie pixel-perfect Studio preview.
- **Nestavať** v tomto PR. Na webe to netvrdiť.

---

## 4. Čo zámerne nestaviame

| Položka | Prečo |
|---|---|
| Vlastné AI Studio (foto+video+pôdorys od nuly) | Feature trap; mega-poplach §5 Stena 2 |
| Kopírovanie recenzií / mien z AIRAmax | fake testimonials zakázané |
| Tvrdenie Phase 1 na www pred PROD flagom | klaim len LIVE funkcie |
| Zmena cien v3 | founder: DO NOT change prices |
| Zapnutie `CREDITS_ENFORCEMENT` | obchodné GO + ohlásenie referenčnému klientovi |
| Remotion v `apps/crm` | playbook + Hobby limity |

---

## 5. Ako zapnúť Phase 1 (nie v tomto PR)

Vercel projekt CRM (`app.revolis.ai`) → Production env:

```
LISTING_FROM_PHOTOS_V0=1
ANTHROPIC_API_KEY=<už používaný kľúč>
```

Voliteľne neskôr: `CREDITS_ENFORCEMENT=enforce` (ostré strhávanie).  
Bez `ANTHROPIC_API_KEY` route vráti 503 (testy idú cez mock adapter).  
**Default v kóde je OFF** — merge tohto PR sám o sebe PROD nesprístupní.
