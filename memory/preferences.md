# Operation Preferences
## ⚙️ PRACOVNÝ REŽIM — STENY, NIE SKRUTKY (founder, 2026-10-02) — ZÁVÄZNÉ
Founder: „odteraz už iba steny“. Jedno GO = jeden uzavretý blok s dôkazom; žiadne priebežné správy ani kolá GO; pred PROD/RLS zmenou zmapovať VŠETKY cesty
(tabuľky, pohľady, funkcie × anon/authenticated) a predložiť jeden balík + jeden overovací skript; GO na časť bloku = aplikovať celý blok; každý blok končí dôkazom,
zápisom do memory, aktualizáciou `docs/STATUS.md` a JEDNOU ďalšou stenou. Plné znenie: `.claude/WALL-RULES.md`.
**Vynútenie (nie pamäť, ale harness):** hooky `UserPromptSubmit` + `SessionStart` v `.claude/settings.json` vkladajú WALL-RULES.md do kontextu pri každej správe.
Dôvod: pravidlo 0 v CLAUDE.md už existovalo a 2026-10-01 sa napriek tomu porušilo (4 kolá GO pri jednom úniku) — text nestačí.
- Tone: Adaptive, professional, wit-infused, L99 "Senior-to-Senior" style.
- Formatting: Clean, scannable, horizontal rules, bolding for key actions.
- Tech: Strictly Avoid LaTeX for simple formatting.
