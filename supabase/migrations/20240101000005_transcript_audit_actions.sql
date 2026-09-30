-- Audit actions for the transcript request workflow.
--
-- Kept in its own file because Postgres does not let a newly added enum
-- value be used in the same transaction that added it. Run this file first.
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'TRANSCRIPT_REQUESTED';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'TRANSCRIPT_REQUEST_APPROVED';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'TRANSCRIPT_REQUEST_REJECTED';
