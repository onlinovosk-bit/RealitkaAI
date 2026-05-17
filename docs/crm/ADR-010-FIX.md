# ADR-010-FIX: Správna injekcia secrets do CI

Status: Schválené & Implementované

## Kontext
Detekované varovanie "Context access might be invalid" vo VS Code kvôli nesprávnemu umiestneniu ${{ secrets... }} v YAML štruktúre.

## Rozhodnutie
Presunúť priradenie tajomstiev do globálneho bloku env na úrovni jobu. Tým sa zabezpečí, že premenné sú bezpečne injektované do Node.js prostredia pred spustením testov.

## Dôsledok
- Eliminácia varovaní v IDE
- 100% úspešnosť prechodu pipeline pri validných kľúčoch
- Odstránenie rizika pádov pri produkčnom builde

## Implementácia
Pozri .github/workflows/ci.yml (blok env na úrovni jobu)

---

Tento ADR je platný od 2026-04-06 a je súčasťou governance dokumentácie.