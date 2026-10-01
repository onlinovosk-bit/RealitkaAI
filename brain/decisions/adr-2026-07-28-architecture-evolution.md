# ADR 2026-07-28 — Architecture Evolution: Structured Brain & Governance Roles

**Cieľová cesta:** `brain/decisions/adr-2026-07-28-architecture-evolution.md`
**Status:** ACCEPTED · **Rozhodol:** founder · **Review:** pri spustení triggera

---

## ADR-A: Structured Brain (Knowledge Objects)

**Rozhodnutie (dnes):** Markdown dokumenty v `brain/` a `docs/` sú
kanonické. Žiadna konverzia do JSON/graph sa nevykonáva, kým neexistuje
druhý strojový konzument — architektúra sa nestavia pre budúcnosť bez
konzumenta.

**Budúci smer (prijatý, neimplementovaný):** Ak jeden architektonický
koncept musí konzumovať viac než jeden systém, koncept sa stane
štruktúrovaným **Knowledge Objectом** a Markdown sa stane jedným z jeho
renderovaní. Cieľový tvar (ilustračný):

```
id: FP-001
name: Capture Now
description: ...
strengthens: [Organizational Memory, Guardian, Evaluation, Decision Memory]
related: [ADR-…, Review-V2, premortem-…]
status: accepted
```

**Trigger:** druhý strojový konzument toho istého obsahu (napr. validátor
súladu ADR ↔ Founding Principles, generátor pohľadov, graf dotazov).

**Mostík už existuje:** `brain/registry/` záznamy sú proto-Knowledge-Objects
(id, typ, závislosti, súvisiace rozhodnutia, dôkaz). Evolúcia = obohatenie
ich schémy o `strengthens/related/status`, nie nový systém.

**Pravidlo proti duplicite konceptov (platí OD DNES, bez implementácie):**
Každý koncept („Capture Now", „atomicita nasadenia"…) má JEDEN kanonický
domov; všetky ostatné dokumenty naň ODKAZUJÚ, neopisujú ho nanovo.
Pri najbližšom `brain:audit` rozšírení sa duplicitné definície konceptov
hlásia ako advisory.

**Zamietnuté dnes:** `agents/*.json` adresár (Board: žiadne agentné shelly)
· 20-kapitolový playbook s kapitolami pre DEFER vrstvy · konverzia MD→JSON
bez konzumenta.

---

## ADR-B: Governance roly — Architecture Governor & Implementation Engineer

**Rozhodnutie:** Formalizujú sa dve roly s vedomým napätím:

- **Architecture Governor** — chráni dlhodobú architektúru: odmieta
  duplicitu (mapovacia tabuľka), stráži brány a Founding Principles,
  vyžaduje transparentnosť trade-offov. Nerozhoduje za foundera
  (Kontrolór pravidlo platí).
- **Implementation Engineer** — po schválení pripravuje Build Packages,
  Cursor tasky a implementačné detaily; optimalizuje na rýchlosť
  a jednoduchosť realizácie.

**Mapovanie na existujúce (žiadna nová mašinéria):** roly sú
inštitucionalizáciou dvojrole Executor/Challenger z FOUNDER.md, aplikovanej
na architektúru. Claude aj Fable môžu zastávať obe — ale každý väčší návrh
musí prejsť OBOMA perspektívami a výstup uvádza, ktorá rola hovorí.
Poradie: Governor schvaľuje smer PRED tým, než Engineer píše balík.

**Doplnok k rytmu práce (z diskusie foundera 2026-07-28):** Vývoj beží
primárne v nočných oknách (Ruflo/Cursor); denné hodiny foundera patria
obchodu. Brány vrstiev nie sú časové, ale dátové — „kedy" určuje
existencia dát/konzumenta/zákazníckeho signálu, nie kalendár.
