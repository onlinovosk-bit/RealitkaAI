# Listing generator — C2 / founder feedback notes

**Dátum:** 2026-08-07  
**Status:** **C2 CLOSED · PASS** · KEY unlock po tipoch foundera · **PR-A stále len po explicitnom GO**

---

## C2 slepý test — tipy vs kľúč (2026-08-07)

**Protokol:** PASS ak nerozozná **ALEBO** preferuje prompt; FAIL ak ľudský spozná na prvý pohľad (+ čo prezradilo). Ak tipol ľudského správne ale preferuje prompt → skôr **PASS** (preferencia), oba signály zaznačené.  
**Kľúč:** `listing-generator-C2-blind-KEY.md` · **Test:** `listing-generator-C2-blind-TEST.md`

### Tip vs pravda

| Listing | Preferujem (tip) | Ľudský (tip) | Pravda (KEY) | Preferencia vs prompt | Identifikácia ľudského | Čo prezradilo | Verdikt |
|---|---|---|---|---|---|---|---|
| **Teriakovce** | **B** | **A** | A = prompt · B = ľudský | preferuje **ľudský** (B), nie prompt | **nesprávne** (tip A, pravda B) → nepoznal | (prázdne) | **PASS** |
| **Ľubotice** | **A** | **B** | A = prompt · B = ľudský | preferuje **prompt** (A) | **správne** (B) | (prázdne) | **PASS** |

### Signály (jasne)

**Teriakovce**
- Identifikácia: tipol A ako ľudský → **mýlil sa** (ľudský je B) → signál „nepoznal“ → PASS cesta.
- Preferencia: preferuje B = golden/ľudský → prompt **nevyhral** preferenciu; to samo o sebe nie je FAIL (FAIL = spoznanie ľudského na prvý pohľad).
- Tell: prázdne → žiadny „prvý pohľad“ dôkaz.

**Ľubotice**
- Identifikácia: tipol B ako ľudský → **správne**.
- Preferencia: preferuje A = prompt → podľa protokolu **PASS** (preferencia promptu má prednosť pred správnym tipom ľudského).
- Tell: prázdne → bez „čo prezradilo“.

### Verdikt

| Položka | Výsledok |
|---|---|
| Teriakovce | **PASS** |
| Ľubotice | **PASS** |
| **C2 celkovo** | **PASS · CLOSED** |

**PR-A:** stále **len po explicitnom GO** — žiadny wire FINAL do produkcie, žiadna úprava FINAL promptu z tohto vyhodnotenia.

---

## Founder (b) — 2026-08-07: „písal človek“ = K3 Test 5 stress

**Fakt:** Founder označil `fb_ad_copy` lead z **K3 Test 5** (prázdny popis / Prešov Sídlisko III, 72 m²) ako „písal človek“.

**Artefaktová pravda:** Text je výstup **FINAL promptu** (stress fixture `t5-stress-empty`), **nie** golden / ľudský originál.

**Interpretácia:** Founder **pomýlil prompt za človeka** na riedkom vstupe → silný **pozitívny** signál pre C3/stress robustnosť (nie FAIL promptu). Štýlový tell: faktický lead s pomlčkou + ordinálne poschodie („štvrté poschodie z ôsmich“) znie ľudsky.

**Čo to NIE je:** C2 slepé párovanie Teriakovce / Ľubotice — to je uzavreté vyššie.

**Pointery:** `listing-generator-K3-eval.md` (Test 5) · `listing-generator-K5-handoff.md` §5
