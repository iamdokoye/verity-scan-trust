-- =============================================================================
-- Direct database write detection
-- =============================================================================
-- The application writes its own audit entries, so a row changed straight in
-- the database (SQL editor, psql, a seed script, a leaked credential) used to
-- leave no trace. These triggers close that gap: every INSERT/UPDATE/DELETE on
-- the important tables that does NOT come from the Votta API is recorded in
-- audit_logs as DIRECT_DB_WRITE, with the database user and client address.
--
-- How the API is recognised: its connection sets application_name to
-- 'votta-api' (backend/src/config/prisma.ts adds it to the connection string).
-- Anything else is treated as direct.
--
-- Honest limit: application_name is a label, not a credential. Someone who
-- knows about it can set it and write unnoticed. This catches accidental and
-- casual direct edits and leaves evidence for them; it does not stop a
-- determined insider. Keep direct credentials to as few people as possible.
--
-- Run 20240101000007_direct_write_audit_action.sql first, in its own run.
-- Safe to run more than once.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_direct_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  watched  CONSTANT text[] := ARRAY[
    'sha256_hash', 'signature', 'status', 'verification_token', 'file_path',
    'is_locked', 'grade', 'grade_point', 'total_score', 'role',
    'institution_id', 'superseded_by', 'action'
  ];
  old_row  jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  new_row  jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  row_json jsonb := COALESCE(new_row, old_row);
  changed  text[];
  before   jsonb;
  after    jsonb;
BEGIN
  -- The API is the expected writer.
  IF current_setting('application_name', true) = 'votta-api' THEN
    RETURN NULL;
  END IF;

  -- The audit entry below is itself an insert into audit_logs.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(n.key ORDER BY n.key) INTO changed
    FROM jsonb_each(new_row) n
    WHERE n.value IS DISTINCT FROM old_row -> n.key;

    -- Nothing actually changed (UPDATE ... SET x = x).
    IF changed IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT jsonb_object_agg(k, old_row -> k) INTO before
  FROM unnest(watched) k
  WHERE old_row ? k AND (TG_OP = 'DELETE' OR k = ANY (COALESCE(changed, watched)));

  SELECT jsonb_object_agg(k, new_row -> k) INTO after
  FROM unnest(watched) k
  WHERE new_row ? k AND (TG_OP = 'INSERT' OR k = ANY (COALESCE(changed, watched)));

  INSERT INTO public.audit_logs (action, severity, target_type, target_id, metadata)
  VALUES (
    'DIRECT_DB_WRITE',
    'critical',
    TG_TABLE_NAME,
    NULLIF(row_json ->> 'id', '')::uuid,
    jsonb_strip_nulls(jsonb_build_object(
      'operation',        TG_OP,
      'table',            TG_TABLE_NAME,
      'db_user',          current_user,
      'session_user',     session_user,
      'application_name', NULLIF(current_setting('application_name', true), ''),
      'client_addr',      host(inet_client_addr()),
      'changed_columns',  to_jsonb(changed),
      'before',           before,
      'after',            after
    ))
  );

  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'institutions', 'profiles', 'students', 'results', 'documents',
    'transcript_requests', 'audit_logs', 'audit_log_checkpoints'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Skipping %, table does not exist.', t;
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS direct_write_detection ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER direct_write_detection
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.record_direct_write()', t);
  END LOOP;
END;
$$;
