# Monitoring & Alerts for Production
# 1. Healthcheck endpoint
# 2. Error logging to external service (Sentry)
# 3. Basic alert for failed jobs (email)

# 1. Healthcheck endpoint (api/healthz)
GET /api/healthz => 200 OK

# 2. Sentry integration (add to .env and _app.tsx/_middleware)
SENTRY_DSN=your_sentry_dsn

# 3. Alert on failed outreach (add to scripts/outreach-automation-2.0.ts):
// if (error) sendAlertEmail(error)

# 4. Optionally: UptimeRobot or StatusCake for endpoint monitoring
