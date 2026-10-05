#!/usr/bin/env bash
# Vloží do kontextu POVINNÝ záverečný riadok s postupom (zdroj: docs/STATUS.md).
root="${CLAUDE_PROJECT_DIR:-.}"; f="$root/docs/STATUS.md"
total="$(grep -m1 '^## Celkom' "$f" 2>/dev/null | sed 's/^## Celkom: *//')"
sess="$(grep -m1 '^\*\*Session' "$f" 2>/dev/null | sed 's/\*\*//g')"
echo "POVINNÝ POSTUP (founder 2026-10-02): KAŽDÁ odpoveď končí riadkom \`📊 Session: <X %> · Architektúra: <Y %>\`. Zdroj docs/STATUS.md -> Celkom: ${total:-?} | ${sess:-Session: ?}. Ak sa blok počas odpovede dokončil, najprv prepíš STATUS.md. Odhad označ ako odhad, číslo nevymýšľaj."
exit 0
