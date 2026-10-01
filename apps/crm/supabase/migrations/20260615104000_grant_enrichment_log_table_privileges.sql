-- Ensure RLS-authenticated users can access enrichment_log table.
-- RLS still enforces tenant isolation; this only grants base table privileges.

grant select, insert, update, delete on table public.enrichment_log to authenticated;
grant all privileges on table public.enrichment_log to service_role;
