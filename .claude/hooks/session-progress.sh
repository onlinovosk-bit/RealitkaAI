#!/usr/bin/env bash
# Postup session v % (founder 2026-10-02: „uvádzaj posun v percentách, 0–100 %").
# Zdroj pravdy: blok <!-- SESSION:START/END --> v docs/STATUS.md (míľniky - [x] / - [ ]).
#
#   session-progress.sh print   vypíše „Session <cieľ>: NN % (a/b) · ďalší míľnik: …"
#   session-progress.sh stop    Stop hook: odpoveď na správu foundera bez riadku
#                               „Session …: NN %" sa zablokuje a model ho doplní.
#
# Webhook/notifikačné turny sa nevynucujú (pracovná dohoda: na webhooky neodpisovať).
# Hook nikdy nezlyhá hlučne: pri akejkoľvek chybe pustí odpoveď ďalej.

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)}"
export STATUS_FILE="$root/docs/STATUS.md"
export MODE="${1:-print}"
# stdin patrí skriptu pythonu (heredoc), vstup hooku preto ide cez premennú
[ "$MODE" = stop ] && export HOOK_INPUT="$(cat)"

python3 - <<'PY' 2>/dev/null || exit 0
import json, os, re, sys

def progress():
    s = open(os.environ["STATUS_FILE"], encoding="utf-8").read()
    m = re.search(r"<!-- SESSION:START -->(.*?)<!-- SESSION:END -->", s, re.S)
    if not m:
        return None
    block = m.group(1)
    goal = re.search(r"^Cieľ:\s*(.+)$", block, re.M)
    items = re.findall(r"^- \[( |x)\] (.+)$", block, re.M)
    if not items:
        return None
    done = sum(1 for x, _ in items if x == "x")
    nxt = next((t for x, t in items if x == " "), "všetko hotové")
    pct = round(100 * done / len(items))
    return f"Session {goal.group(1).strip() if goal else ''}: {pct} % ({done}/{len(items)} míľnikov) · ďalší míľnik: {nxt}"

line = progress()
if os.environ["MODE"] == "print":
    print(line or "Session: blok SESSION v docs/STATUS.md chýba")
    sys.exit(0)

# --- stop ---
data = json.loads(os.environ.get("HOOK_INPUT") or "{}")
if data.get("stop_hook_active") or not line:
    sys.exit(0)

def text_of(content):
    if isinstance(content, str):
        return content
    return "\n".join(c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text")

entries = [json.loads(l) for l in open(data["transcript_path"], encoding="utf-8") if l.strip()]
# posledná skutočná správa (nie tool_result) a všetok text asistenta po nej
last_prompt, replies = None, []
for e in entries:
    msg = e.get("message") or {}
    content = msg.get("content")
    if e.get("type") == "user" and content is not None:
        is_tool_result = isinstance(content, list) and any(isinstance(c, dict) and c.get("type") == "tool_result" for c in content)
        if not is_tool_result:
            last_prompt, replies = text_of(content), []
    elif e.get("type") == "assistant" and content is not None:
        replies.append(text_of(content))

if last_prompt is None or re.search(r"task-notification|SYSTEM NOTIFICATION", last_prompt):
    sys.exit(0)  # webhook turn: nevynucuje sa
reply = "\n".join(replies)
if not reply.strip() or re.search(r"Session[^\n]*\d{1,3}\s?%", reply):
    sys.exit(0)

print(json.dumps({
    "decision": "block",
    "reason": "Chýba postup session v %. Doplň na koniec odpovede tento riadok (z docs/STATUS.md, blok SESSION; "
              "ak sa stav zmenil, najprv uprav míľniky podľa overeného dôkazu): " + line,
}, ensure_ascii=False))
PY
exit 0
