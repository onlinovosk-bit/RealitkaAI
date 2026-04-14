Archived migrations that are intentionally excluded from active `supabase db push`.

Reason:
- historical version collisions and environment-specific SQL assumptions
- these files blocked forward deployments on staging

Policy:
- keep only forward-safe migrations in `supabase/migrations/`
- keep legacy/conflicting history here for auditability
