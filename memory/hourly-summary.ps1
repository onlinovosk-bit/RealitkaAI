# Hourly session summary trigger for Revolis.AI
# Registered as Windows Task Scheduler job: "RevolisAI-HourlySummary"
#
# Writes a timestamped nudge that Claude picks up on the next load, because
# CLAUDE.md has it read every file in memory/ at session start.
#
# It used to append that nudge to memory/session-summary.md, which is TRACKED,
# and that cost real time twice over:
#
#   - every branch switch needed a `git stash` first, because the working tree
#     was dirty with trigger lines nobody wanted to commit;
#   - session-summary.md is a chronological log that is PREPENDED to (newest
#     first — see CLAUDE.md, and #701, where an overwrite destroyed 1339 lines).
#     Appending put each nudge at the oldest end of the file, which is the one
#     place a reminder is not read.
#
# So the nudge goes to its own gitignored file. Same effect on Claude, no effect
# on git.
#
# The path is derived from the script's own location rather than hardcoded to
# C:\RealitkaAI: with a second worktree checked out (a `git worktree` for a
# parallel branch), a hardcoded drive path writes into the wrong tree.

$ts       = Get-Date -Format "yyyy-MM-dd HH:mm"
$marker   = "## [HOURLY TRIGGER $ts] — Claude: uloz session summary a skontroluj pending tasks"
$filePath = Join-Path $PSScriptRoot "hourly-trigger.local.md"

if (-not (Test-Path $filePath)) {
  Set-Content -Path $filePath -Value "# Hourly trigger log (local only, gitignored)"
}

Add-Content -Path $filePath -Value ""
Add-Content -Path $filePath -Value $marker
