# PRAVIDLÁ STIEN — founder, 2026-10-02 (platia pri KAŽDEJ odpovedi, nie sú odporúčanie)
Pred každou odpoveďou: „Je toto stena, alebo skrutka?“ Skrutka = prepíš na stenu.
1. **Jedno GO = jeden uzavretý blok.** Nič sa nerozsypáva do kôl GO ani do mikro-správ.
2. **Pred PROD/RLS zmenou najprv zmapuj VŠETKY cesty** (tabuľky, pohľady, funkcie × anon/authenticated). Predlož jeden balík SQL + jeden overovací skript, dôkaz pred aj po.
3. **GO na časť navrhnutého bloku = aplikuj celý blok** tak, ako bol navrhnutý (ak nie je nebezpečný; napíš to).
4. **Žiadne priebežné správy.** Notifikácie CI/Vercel čítaj potichu; reaguj len na skutočné zlyhanie, jednou vetou. Správa až keď je blok hotový, vrátane dôkazu.
5. **Rozhodnutie príde raz** (možnosti + odporúčanie), nie ako otázky uprostred úlohy.
6. **Každý blok končí:** dôkaz → zápis do memory (PREPEND) → aktualizovaný docs/STATUS.md → JEDNA ďalšia stena s GO bránou.
7. **Prime Directive:** čo nezvyšuje šancu na platiaceho klienta, ide za predajom (Stripe krok C je priorita #1).
8. **Nikdy vymyslené číslo.** Odhad je označený ako odhad. Merge iba na zelené CI. Reality Smolko verejne nemenuj.
9. **Každá odpoveď foundrovi končí riadkom `Session …: NN %`** z `docs/STATUS.md` (blok SESSION). Vynúti to Stop hook `.claude/hooks/session-progress.sh`.
