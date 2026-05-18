# GDPR / ochrana údajov — prevádzkový checklist (Sc. 4)

Tento dokument nenahrádza právne poradenstvo. Slúži ako **interná kontrola** pred škálovaním.

## Kto dokument „dokonale“ doplní (odporúčané pracovné pozície)

Tieto roly zvyčajne spolu pokrývajú register, zmluvy, DPIA a technické opatrenia. Mená doplňte podľa svojho tímu alebo agentúr.

| Pozícia (názov) | Skutočná zodpovednosť v checkliste | Typicky |
|-----------------|-------------------------------------|--------|
| **Externý DPO / právnik pre ochranu údajov** | Register činností, právny základ, DPIA, zmluvy so sprostredkovateľmi, kontakt pre ÚOOÚ | Externá advokátska kancelária alebo DPO-as-a-Service |
| **Interný Privacy owner (Product / Operations)** | Koordinácia checklistu, rozhraní s vývojom, školenie tímu, súhlas/opt-in procesy | Head of Product, COO alebo „Privacy champion“ |
| **Tech Lead — security & tenant isolation** | RLS, prístupové práva, logy, retention v infra, súčinnosť pri DSAR | Staff Engineer / CTO |
| **Information Security (ak existuje)** | Politika logov, incident response, klasifikácia dát | Bezpečnostný špecialista / IT |
| **Marketing / Growth (spoluúčasť)** | Súhlasy pri newsletteroch, cookies/tracking mimo CRM | Vedúci marketingu |

> **Poznámka:** Podľa GDPR nemusíte mať plný úväzok DPO; často stačí **poverená osoba + externý právnik**. Povinnosť DPO vzniká pri **pravidelnom a systematickom** monitorovaní na veľkom rozsahu alebo pri spracovaní osobitných kategórií — overte s právnikom.

## Zodpovedná osoba

- [ ] Meno kontaktu pre otázky údajov (DPO alebo poverená osoba): _______________

## Register a základ spracovania

- [ ] Zoznam činností spracovania (čo, prečo, ako dlho, kto).
- [ ] Právny základ pre každý typ dát (zmluva, oprávnený záujem, súhlas — podľa právnika).
- [ ] Žiadne hromadné importy bez dokumentovaného titulu.

## Práva dotknutých osôb

- [ ] Proces na **žiadosť o výpis / opravu / výmaz** (SLA napr. 30 dní).
- [ ] Kontaktný e-mail zverejnený v zásadách ochrany osobných údajov.

## Technické opatrenia

- [ ] RLS a tenant izolácia (`agency_id`) na produkčných tabuľkách — pravidelný audit.
- [ ] Minimalizácia PII v promptoch do AI (maskovanie — kde je implementované, overiť).
- [ ] Logy: čo obsahujú PII + doba uchovávania.

## Marketing a komunikácia

- [ ] Súhlas / opt-in kde treba (newsletter, sledovanie mimo nevyhnutnej prevádzky).
- [ ] Interný scén na „AI sledovanie“ — schválené formulácie pre médiá (PR).
