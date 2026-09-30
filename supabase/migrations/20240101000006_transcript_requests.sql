-- Transcript requests: a student asks the registry for a signed transcript,
-- an institution admin approves (which issues it) or rejects the request.

CREATE TYPE public.transcript_request_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TABLE public.transcript_requests (
  id              UUID                              PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID                              NOT NULL REFERENCES public.students(id),
  institution_id  UUID                              NOT NULL REFERENCES public.institutions(id),
  status          public.transcript_request_status  NOT NULL DEFAULT 'pending',

  -- Optional note from the student ("needed for a scholarship application")
  student_note    TEXT,

  -- Filled in when an admin decides
  decided_by      UUID                              REFERENCES public.profiles(id),
  decided_at      TIMESTAMPTZ,
  decision_note   TEXT,
  document_id     UUID                              REFERENCES public.documents(id),

  created_at      TIMESTAMPTZ                       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ                       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transcript_requests_student
  ON public.transcript_requests(student_id);
CREATE INDEX idx_transcript_requests_institution_status
  ON public.transcript_requests(institution_id, status);

-- A student can have only one open request at a time.
CREATE UNIQUE INDEX uq_transcript_requests_one_pending_per_student
  ON public.transcript_requests(student_id)
  WHERE status = 'pending';

CREATE TRIGGER set_updated_at_transcript_requests
  BEFORE UPDATE ON public.transcript_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- All access goes through the Express API using the service role.
ALTER TABLE public.transcript_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcript_requests_all_service"
  ON public.transcript_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
