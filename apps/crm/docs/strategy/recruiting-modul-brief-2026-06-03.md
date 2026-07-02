# Produktový + compliance brief: Modul "Nábor maklérov"

**Stav:** roadmap (post-v1). NESTAVAŤ, kým nie sú splnené vstupné podmienky nižšie.
**Dátum:** 2026-06-03 · **Vlastník:** Andy (CPO/CRO) · **Verzia:** v1 návrh

---

## 1. Načo to je (biznis)

Majiteľ realitnej kancelárie potrebuje rásť náborom aktívnych maklérov. Dnes to robí ručne, neefektívne. Modul mu pomôže **nájsť, kvalifikovať a osloviť** maklérov otvorených spolupráci — legálne a transparentne. Nahrádza zavrhnutý "Stealth Recruiter" (covert scraping), ktorý bol GDPR riziko a pri due diligence by zničil valuáciu.

Komerčný cieľ je rovnaký ako pri pôvodnej myšlienke (owner platí za prístup k maklérom), ale postavený tak, aby obstál pri kontrole úradu aj acquirera.

## 2. Čo to NIE je (zavrhnuté hranice)

Toto sa do produktu nedostane, bez výnimky:
- Skryté scrapovanie súkromnej inzercie alebo "infiltrácia" platforiem proti ich ToS.
- Sledovanie osôb v súkromných/poloverejných diskusiách (Facebook skupiny a pod.).
- Profilovanie podľa finančnej tiesne (exekúcie, dlhy) na cielenie zraniteľných osôb.
- Ťaženie osobných kontaktov z cudzieho CRM bez základu.
- Akýkoľvek "stealth / neviditeľný / infiltrácia" jazyk v UI aj marketingu.

## 3. Legitímny dátový základ (toto je jadro compliance)

Modul stojí VÝHRADNE na dvoch zdrojoch, oba obhájiteľné cez GDPR:

**A) Verejná profesijná inzercia.** Maklér, ktorý verejne inzeruje nehnuteľnosti pod svojím menom a kontaktom na portáli, tieto údaje **sám zverejnil na profesijný účel**. Oslovenie ohľadom spolupráce je B2B kontakt s oprávneným záujmom (čl. 6(1)(f) GDPR). Spracúvajú sa len profesijné údaje (meno, verejný kontakt, počet/typ inzerátov, lokalita) — nie súkromné.

**B) Opt-in.** Maklér, ktorý v Revolise (alebo inde) sám aktívne označí "som otvorený ponukám spolupráce". Najsilnejší základ — výslovný súhlas.

## 4. Povinné compliance prvky (bez nich sa nestavia)

1. **Transparentná notifikácia pri prvom oslovení** — kto oslovuje, prečo, na základe čoho (oprávnený záujom), a ako vzniesť námietku/odhlásiť sa. Povinné pri spracúvaní cez čl. 6(1)(f).
2. **Suppression list** — maklér, ktorý povie "nekontaktovať", sa zapíše a už nikdy nie je zobrazený/oslovený. Trvalé, naprieč všetkými RK na platforme.
3. **Účelové viazanie** — údaje sa použijú len na nábor/spoluprácu, nie na iné účely. Žiadne ďalšie obohacovanie z citlivých zdrojov.
4. **Evidencia základu** — pri každom zobrazenom maklérovi je dohľadateľné, z akého zdroja a na akom základe sa údaje spracúvajú.
5. **Právo na výmaz** — maklér môže požiadať o odstránenie; modul to vie vykonať.

## 5. Ako modul funguje (UX, vysokoúrovňovo)

1. Owner zadá kritériá: lokalita, segment, úroveň aktivity.
2. Modul zobrazí **verejne inzerujúcich maklérov** zodpovedajúcich kritériám — meno, verejný kontakt, počet aktívnych inzerátov, lokalita, prípadne odhad aktivity (z verejných dát).
3. Owner odomkne kontakt (kreditový model — viď nižšie) a osloví s ponukou spolupráce; oslovenie automaticky priloží transparentnú notifikáciu (bod 4.1).
4. Suppression list a evidencia základu bežia na pozadí.

Jazyk v UI: "Nábor maklérov", "Osloviť spoluprácu". NIE "stealth/infiltrácia/neviditeľný".

## 6. Kde sadne kreditový model

Odomknutie kontaktu kvalifikovaného makléra = kredity, rovnaká mechanika ako odomknutie leadu (spend_credits, idempotentný, cena podľa kvality/aktivity makléra). Re-unlock zadarmo. Monetizácia bez nového účtovného systému.

## 7. Dátové závislosti (PREČO to nejde stavať teraz)

Modul potrebuje feed verejnej inzercie maklérov z portálov — a ten dnes NEEXISTUJE funkčne:
- `portal_listings` je prázdne (audit 2026-06-03).
- `portal-parser.ts` existuje, ale nikto ho nevolá (mŕtvy kód).
- Realvia plní `properties`, nie `portal_listings`.

Bez ingestu inzercie modul nemá z čoho čerpať maklérov. Je to tá istá prázdna rúra ako pri arbitráži a radare.

**Kľúčová veta:** tento modul nevieš postaviť skôr než vyriešiš feed inzercie (`portal_listings` / portal-parser), lebo stojí na tých istých dátach ako arbitráž a radar. Nie je to „ďalší modul na zajtra“ — je to definovaný produkt, ktorý vytiahneš, keď bude na čom stáť.

## 8. Vstupné podmienky pred stavbou (gate)

Nestavať, kým nie sú splnené VŠETKY:
1. Ingest verejnej inzercie funguje (`portal_listings` / ekvivalent sa reálne plní) — post-v1 práca.
2. Aspoň jeden platiaci zákazník za LIVE jadro (validácia, že je o platformu záujem).
3. Krátka právna konzultácia potvrdzujúca oprávnený záujem pre tvoj konkrétny use-case a zdroje (SK/EU).

## 9. Odhad práce (po splnení gate)

Stredný až väčší modul — rádovo týždne, nie dni: ingest + kvalifikácia maklérov z inzercie, suppression list, oslovovací flow s notifikáciou, evidencia základu, kreditové napojenie, UI. Detailný rozpad až pri otvorení.

## 10. Prečo to zvyšuje valuáciu (nie znižuje)

Recruiting modul navrhnutý compliant od základu je predajný feature, ktorý pri due diligence obstojí. Naopak covert verzia by bola záväzok — acquirerov právnik ju nájde a buď zrazí cenu, alebo zabije deal. Tento brief je zároveň dôkaz, že produkt bol navrhnutý zodpovedne.
