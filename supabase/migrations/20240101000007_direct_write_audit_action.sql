-- Audit action recorded when a row is changed without going through the API.
--
-- Kept in its own file because Postgres does not let a newly added enum
-- value be used in the same transaction that added it. Run this file first.
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'DIRECT_DB_WRITE';
