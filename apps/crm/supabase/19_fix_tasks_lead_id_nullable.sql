-- 19_fix_tasks_lead_id_nullable.sql
-- Oprava: demo booking tasky nemajú CRM lead, preto lead_id musí byť nullable.

alter table public.tasks alter column lead_id drop not null;
