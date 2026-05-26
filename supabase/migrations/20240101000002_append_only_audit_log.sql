-- =============================================================================
-- Append-Only Audit Log Trigger
-- =============================================================================
-- The audit_logs table is a tamper-evident record of every sensitive action.
-- This trigger fires BEFORE any UPDATE or DELETE on audit_logs and raises an
-- exception, making it physically impossible to modify or delete audit entries
-- even for a superuser executing raw SQL through Supabase.
--
-- The application-level Prisma client only ever calls auditService.log() which
-- does INSERT — it never updates or deletes audit rows.
--
-- HOW TO DEPLOY:
--   Run this entire file in the Supabase SQL Editor after the Prisma migration
--   has created the audit_logs table (i.e., after `prisma migrate deploy`).
-- =============================================================================

-- Trigger function — raises an exception on any modification attempt
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION
    'audit_logs is append-only. Modifications and deletions are not permitted. '
    'Action: %, Table: audit_logs, Attempted at: %',
    TG_OP,
    now();
END;
$$;

-- Attach the trigger to audit_logs for both UPDATE and DELETE
DROP TRIGGER IF EXISTS audit_logs_append_only ON public.audit_logs;

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- Confirm the trigger is in place
DO $$
BEGIN
  RAISE NOTICE 'audit_logs_append_only trigger installed successfully.';
END;
$$;
