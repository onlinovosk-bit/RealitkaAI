# Hourly session summary trigger for Revolis.AI
# Registered as Windows Task Scheduler job: "RevolisAI-HourlySummary"
# Appends a timestamped reminder to session-summary.md — Claude reads it on next load.

$ts       = Get-Date -Format "yyyy-MM-dd HH:mm"
$marker   = "## [HOURLY TRIGGER $ts] — Claude: uloz session summary a skontroluj pending tasks"
$filePath = "C:\RealitkaAI\memory\session-summary.md"

Add-Content -Path $filePath -Value ""
Add-Content -Path $filePath -Value $marker
