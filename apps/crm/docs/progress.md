# Progress Summary

## Current status
- `uv` bol nainštalovaný úspešne pomocou skriptu:
  - `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
- Inštalácia umiestnená do `C:\Users\aondr\.local\bin`
- `uv` je dostupný v PATH a overené spustením `uv --version`
- V tomto workspace-e (`apps/crm`) momentálne nemáme žiadne Python `.py` skripty alebo Python nástroje.

## Actions taken
- Overil som prítomnosť Python súborov v celom workspace-e: žiadne `.py` súbory nenájdené.
- Skontroloval som, že `uv` je funkčný v súčasnom termináli.
- Vytvoril som túto dokumentáciu v `docs/progress.md`.

## Results
- `uv` je pripravený na použitie pre budúce Python utility alebo skripty.
- Ak potrebujeme, projekt môže pridať Python skripty do nového priečinka napr. `scripts/` alebo `tools/`.

## Recommendations
1. Ak chceš pridať Python skripty do projektu, vytvor nový priečinok, napr.:
   - `scripts/`
   - `tools/`
2. Použi `uv` na inštaláciu závislostí:
   - `uv install requests`
   - `uv install pandas`
3. Spúšťaj skripty cez `uvx`:
   - `uvx python scripts/my_script.py`
4. Ak budeš mať viac Python dependencies, môžeš vytvoriť `requirements.txt` a nainštalovať ich priamo cez `uvx pip install -r requirements.txt`.

## Next steps
- Pridať konkrétny Python skript, ak chceš automatizovať niečo v tomto projekte.
- Pridať dokumentáciu do `docs/progress.md` s konkrétnym zoznamom Python utility, ktoré chceš používať.
- Ak potrebuješ, rád pomôžem pripraviť prvý Python skript pre tento projekt.
