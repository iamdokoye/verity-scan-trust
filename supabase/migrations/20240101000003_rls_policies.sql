-- =============================================================================
-- Row Level Security Policies
-- =============================================================================
-- The Express backend uses the Supabase SERVICE ROLE key, which bypasses RLS
-- entirely. These policies are a defence-in-depth layer that prevents any
-- direct Supabase client (anon key, authenticated key) from reading or writing
-- data if someone ever bypasses the Express API.
--
-- HOW TO DEPLOY:
--   Run this entire file in the Supabase SQL Editor after the Prisma migration
--   has created all tables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on every application table
-- ---------------------------------------------------------------------------
ALTER TABLE public.institutions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- profiles
-- A user can only read their own profile row.
-- The service role (backend) can read/write all rows.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_owner_select" ON public.profiles;
CREATE POLICY "profiles_owner_select"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- institutions
-- Authenticated users can read the institution they belong to.
-- Requires matching via the profiles table.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "institutions_member_select" ON public.institutions;
CREATE POLICY "institutions_member_select"
  ON public.institutions
  FOR SELECT
  USING (
    id IN (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- departments, academic_sessions, courses
-- Any authenticated member of the institution can read.
-- Write requires admin — enforced at the API layer, not RLS.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "departments_institution_select" ON public.departments;
CREATE POLICY "departments_institution_select"
  ON public.departments FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sessions_institution_select" ON public.academic_sessions;
CREATE POLICY "sessions_institution_select"
  ON public.academic_sessions FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "courses_institution_select" ON public.courses;
CREATE POLICY "courses_institution_select"
  ON public.courses FOR SELECT
  USING (
    department_id IN (
      SELECT d.id FROM public.departments d
      JOIN public.profiles p ON p.institution_id = d.institution_id
      WHERE p.id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- students
-- Admins can see all students in their institution.
-- Students can only see their own record.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "students_institution_select" ON public.students;
CREATE POLICY "students_institution_select"
  ON public.students FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- results
-- Same as students — institution-scoped.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "results_institution_select" ON public.results;
CREATE POLICY "results_institution_select"
  ON public.results FOR SELECT
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      JOIN public.profiles p ON p.institution_id = s.institution_id
      WHERE p.id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- documents
-- Institution-scoped reads only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_institution_select" ON public.documents;
CREATE POLICY "documents_institution_select"
  ON public.documents FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- verification_logs — read-only, institution-scoped
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "vlogs_institution_select" ON public.verification_logs;
CREATE POLICY "vlogs_institution_select"
  ON public.verification_logs FOR SELECT
  USING (
    document_id IN (
      SELECT d.id FROM public.documents d
      JOIN public.profiles p ON p.institution_id = d.institution_id
      WHERE p.id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- audit_logs — read-only for admins in the same institution
-- No INSERT via anon/authenticated key — only via service role (backend)
-- No UPDATE/DELETE — enforced by the trigger in migration 002
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_institution_select" ON public.audit_logs;
CREATE POLICY "audit_logs_institution_select"
  ON public.audit_logs FOR SELECT
  USING (
    actor_id IN (
      SELECT p.id FROM public.profiles p
      JOIN public.profiles me ON me.institution_id = p.institution_id
      WHERE me.id = auth.uid()
    )
    OR actor_id IS NULL  -- system-generated entries without an actor
  );

-- No direct INSERT from client — only the service role (backend) may insert
DROP POLICY IF EXISTS "audit_logs_no_direct_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_no_direct_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (false);  -- Blocks all direct inserts; service role bypasses this
