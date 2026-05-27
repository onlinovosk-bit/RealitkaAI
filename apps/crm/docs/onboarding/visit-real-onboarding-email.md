# VISIT REAL — onboarding e-mail (visitreal@visitreal.sk)

**Tenant:** VISIT REAL  
**Kontaktný e-mail (registrácia):** `visitreal@visitreal.sk`  
**Konateľky:** Soňa Tomčíková, Silvia Pethoová  
**Dátum šablóny:** 2026-05-27  
**Interné — neposielať tento súbor zákazníkovi**

---

## Pred odoslaním (Andrej)

- [ ] Over v Supabase / admin, či účet `visitreal@visitreal.sk` už existuje → ak áno, CTA je **prihlásenie** (`https://app.revolis.ai/login`), nie register.
- [ ] Ak existujú **dva profily** (Soňa / Silvia), priprav druhý e-mail alebo osobný invite podľa `profiles.email`.
- [ ] Skontroluj preview deploy po merge copy PR (footer `/porovnanie-programov`).
- [ ] Po registrácii: onboarding 99 € s DPH (jednorazovo) + výber programu v `/billing`.
- [ ] Realvia / import — samostatný krok podľa dohody s klientom.

---

## E-mail (SK) — jedna správa pre obe konateľky

**Komu:** Soňa Tomčíková, Silvia Pethoová (VISIT REAL)  
**Predmet:** VISIT REAL × Revolis — aktivácia účtu a prvý krok v CRM

---

Dobrý deň, pani Tomčíková a pani Pethoová,

ďakujeme za dôveru — pripravili sme pre **VISIT REAL** prístup do **Revolis CRM** (inteligentný systém pre maklérov a vedenie kancelárie).

### Čo urobíte teraz (cca 5 minút)

1. Otvorte registračný odkaz (spoločný pre kanceláriu):  
   **https://app.revolis.ai/register?email=visitreal@visitreal.sk**

2. Dokončite registráciu heslom pre `visitreal@visitreal.sk`.  
   Ak už účet existuje, prihláste sa na: **https://app.revolis.ai/login**

3. Po prihlásení prejdite onboardingom v aplikácii — sprievodca vás prevedie profilom kancelárie a prvými dátami.

4. Program a fakturáciu nastavíte v sekcii **Predplatné** (`/billing`). Porovnanie programov:  
   **https://app.revolis.ai/porovnanie-programov**  
   Všetky plány majú **30-dňovú garanciu vrátenia**. Jednorazový onboarding je **99 € s DPH**.

### Čo získate hneď po aktivácii

- Prehľad leadov, nehnuteľností a kontaktov na jednom mieste  
- Denný AI briefing a scoring záujmu (BRI / Hot Alert)  
- Tímový prehľad a reporty podľa zvoleného programu (SMART START → MARKET VISION)

### Podpora

Pri probléme s prihlásením odpovedzte na tento e-mail alebo napíšte na **podpora@revolis.ai** — uveďte prosím názov kancelárie **VISIT REAL** a e-mail `visitreal@visitreal.sk`.

S pozdravom,  
**Tím Revolis**  
https://revolis.ai

---

## Technické poznámky

| Položka | Hodnota |
|--------|---------|
| Register CTA | `https://app.revolis.ai/register?email=visitreal@visitreal.sk` |
| Login fallback | `https://app.revolis.ai/login` |
| Porovnanie programov | `https://app.revolis.ai/porovnanie-programov` |
| Onboarding cena (copy) | 99 € s DPH, jednorazovo |
