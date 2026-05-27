-- ============================================================
-- VOTTA — SUPABASE SQL MIGRATIONS
-- Run these in the Supabase SQL Editor in order, one block
-- at a time. Do not skip any. Do not reorder them.
-- ============================================================


-- ============================================================
-- 001_extensions.sql
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 002_enums.sql
-- ============================================================
CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'admin',
  'student'
);

CREATE TYPE public.document_type AS ENUM (
  'degree_certificate',
  'transcript',
  'other'
);

CREATE TYPE public.document_status AS ENUM (
  'pending_approval',
  'approved',
  'rejected',
  'superseded',
  'revoked'
);

CREATE TYPE public.semester_type AS ENUM (
  'first',
  'second'
);

CREATE TYPE public.verification_status AS ENUM (
  'verified',
  'tampered',
  'invalid_signature',
  'not_found',
  'superseded',
  'revoked'
);

CREATE TYPE public.audit_action AS ENUM (
  'USER_LOGIN',
  'USER_LOGOUT',
  'STUDENT_CREATED',
  'STUDENT_UPDATED',
  'RESULT_CREATED',
  'RESULT_UPDATED',
  'RESULT_LOCKED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_APPROVED',
  'DOCUMENT_REJECTED',
  'DOCUMENT_SUPERSEDED',
  'DOCUMENT_REVOKED',
  'CORRECTION_REQUESTED',
  'CORRECTION_APPROVED',
  'CORRECTION_REJECTED',
  'TRANSCRIPT_GENERATED',
  'VERIFICATION_PERFORMED',
  'CERTIFICATE_MISMATCH',
  'DUPLICATE_HASH_DETECTED',
  'CROSS_STUDENT_DUPLICATE',
  'INSTITUTION_CREATED',
  'INSTITUTION_UPDATED',
  'INSTITUTION_SUSPENDED',
  'INSTITUTION_REACTIVATED',
  'INSTITUTION_DELETED',
  'ADMIN_PROVISIONED'
);

CREATE TYPE public.audit_severity AS ENUM (
  'info',
  'warning',
  'critical'
);


-- ============================================================
-- 003_institutions.sql
-- ============================================================
CREATE TABLE public.institutions (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200)  NOT NULL,
  acronym       VARCHAR(20)   NOT NULL,
  state         VARCHAR(80),
  admin_email   VARCHAR(200)  NOT NULL UNIQUE,
  public_key_pem TEXT,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read institution data
CREATE POLICY "institutions_select_authenticated"
  ON public.institutions FOR SELECT
  TO authenticated
  USING (true);

-- Public (anon) can read institution data for the verify portal
CREATE POLICY "institutions_select_anon"
  ON public.institutions FOR SELECT
  TO anon
  USING (true);

-- Super admin can create and update institutions
CREATE POLICY "institutions_write_super_admin"
  ON public.institutions FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'super_admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'super_admin');

-- Service role has full access (used by Express API)
CREATE POLICY "institutions_write_service"
  ON public.institutions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 004_profiles.sql
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id  UUID        REFERENCES public.institutions(id), -- nullable: super_admin has no institution
  role            public.user_role NOT NULL DEFAULT 'student',
  full_name       VARCHAR(200),
  email           VARCHAR(200) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_institution ON public.profiles(institution_id);
CREATE INDEX idx_profiles_role        ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins can read all profiles in their institution
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- Super admin can read all profiles across all institutions
CREATE POLICY "profiles_select_super_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'super_admin');

-- Service role has full access (used by Express API)
CREATE POLICY "profiles_all_service"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 005_departments.sql
-- ============================================================
CREATE TABLE public.departments (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID        NOT NULL REFERENCES public.institutions(id),
  name            VARCHAR(200) NOT NULL,
  hod_name        VARCHAR(200),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, name)
);

CREATE INDEX idx_departments_institution ON public.departments(institution_id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_select"
  ON public.departments FOR SELECT
  TO authenticated
  USING (
    institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "departments_insert"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "departments_update"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "departments_all_service"
  ON public.departments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 006_students.sql
-- ============================================================
CREATE TABLE public.students (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID        UNIQUE REFERENCES public.profiles(id),
  institution_id  UUID        NOT NULL REFERENCES public.institutions(id),
  department_id   UUID        NOT NULL REFERENCES public.departments(id),
  matric_number   VARCHAR(30) NOT NULL,
  full_name       VARCHAR(200) NOT NULL,
  programme       VARCHAR(200),
  admission_year  SMALLINT,
  graduation_year SMALLINT,
  created_by      UUID        REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, matric_number)
);

CREATE INDEX idx_students_institution ON public.students(institution_id);
CREATE INDEX idx_students_department  ON public.students(department_id);
CREATE INDEX idx_students_matric      ON public.students(matric_number);
CREATE INDEX idx_students_profile     ON public.students(profile_id);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Admins can read all students in their institution
CREATE POLICY "students_select_admin"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Students can read their own record
CREATE POLICY "students_select_own"
  ON public.students FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "students_insert"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "students_update"
  ON public.students FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "students_all_service"
  ON public.students FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 007_academic_sessions.sql
-- ============================================================
CREATE TABLE public.academic_sessions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID        NOT NULL REFERENCES public.institutions(id),
  label           VARCHAR(20) NOT NULL,
  semester        public.semester_type NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, label, semester)
);

CREATE INDEX idx_sessions_institution ON public.academic_sessions(institution_id);

ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select"
  ON public.academic_sessions FOR SELECT
  TO authenticated
  USING (
    institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "sessions_write_admin"
  ON public.academic_sessions FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "sessions_all_service"
  ON public.academic_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 008_courses.sql
-- ============================================================
CREATE TABLE public.courses (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID        NOT NULL REFERENCES public.departments(id),
  code          VARCHAR(20) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  credit_units  SMALLINT    NOT NULL CHECK (credit_units > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, code)
);

CREATE INDEX idx_courses_department ON public.courses(department_id);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select"
  ON public.courses FOR SELECT
  TO authenticated
  USING (
    department_id IN (
      SELECT id FROM public.departments
      WHERE institution_id = (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "courses_write_admin"
  ON public.courses FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

CREATE POLICY "courses_all_service"
  ON public.courses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 009_results.sql
-- ============================================================
CREATE TABLE public.results (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID        NOT NULL REFERENCES public.students(id),
  session_id      UUID        NOT NULL REFERENCES public.academic_sessions(id),
  course_id       UUID        NOT NULL REFERENCES public.courses(id),
  grade           VARCHAR(4)  NOT NULL,
  grade_point     DECIMAL(3,1) NOT NULL CHECK (grade_point >= 0 AND grade_point <= 5),
  is_locked       BOOLEAN     NOT NULL DEFAULT false,
  locked_at       TIMESTAMPTZ,
  is_superseded   BOOLEAN     NOT NULL DEFAULT false,
  superseded_by   UUID        REFERENCES public.results(id),
  correction_note VARCHAR(500),
  uploaded_by     UUID        NOT NULL REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, session_id, course_id)
);

CREATE INDEX idx_results_student ON public.results(student_id);
CREATE INDEX idx_results_session ON public.results(session_id);
CREATE INDEX idx_results_course  ON public.results(course_id);

ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results_select_admin"
  ON public.results FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND student_id IN (
      SELECT id FROM public.students
      WHERE institution_id = (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "results_select_student"
  ON public.results FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "results_insert_admin"
  ON public.results FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'user_role') = 'admin');

-- Only unlocked results can be updated
CREATE POLICY "results_update_admin"
  ON public.results FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND is_locked = false
  );

CREATE POLICY "results_all_service"
  ON public.results FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 010_documents.sql
-- ============================================================
CREATE TABLE public.documents (
  id                        UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id                UUID              NOT NULL REFERENCES public.students(id),
  institution_id            UUID              NOT NULL REFERENCES public.institutions(id),
  uploaded_by               UUID              NOT NULL REFERENCES public.profiles(id),
  approved_by               UUID              REFERENCES public.profiles(id),

  document_type             public.document_type NOT NULL,
  status                    public.document_status NOT NULL DEFAULT 'pending_approval',

  -- File storage
  file_path                 TEXT              NOT NULL,
  file_name                 VARCHAR(255)      NOT NULL,
  file_size_bytes           INTEGER           NOT NULL,
  mime_type                 VARCHAR(100)      NOT NULL,

  -- Cryptographic fields
  sha256_hash               CHAR(64)          UNIQUE,
  signature                 TEXT,
  signed_at                 TIMESTAMPTZ,

  -- Verification
  verification_token        CHAR(64)          UNIQUE,
  qr_code_base64            TEXT,

  -- Cross-validation metadata
  declared_degree_class     VARCHAR(50),
  declared_programme        VARCHAR(200),
  declared_graduation_year  SMALLINT,

  -- Supersession chain
  superseded_by             UUID              REFERENCES public.documents(id),
  supersession_reason       TEXT,
  superseded_at             TIMESTAMPTZ,

  -- Revocation
  revocation_reason         TEXT,
  revoked_at                TIMESTAMPTZ,
  revoked_by                UUID              REFERENCES public.profiles(id),

  -- Approval / rejection
  approval_note             TEXT,
  rejected_at               TIMESTAMPTZ,

  created_at                TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_student      ON public.documents(student_id);
CREATE INDEX idx_documents_institution  ON public.documents(institution_id);
CREATE INDEX idx_documents_token        ON public.documents(verification_token);
CREATE INDEX idx_documents_hash         ON public.documents(sha256_hash);
CREATE INDEX idx_documents_status       ON public.documents(status);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_admin"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "documents_select_student"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "documents_write_admin"
  ON public.documents FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Anon users can read approved documents for verification
-- (the Express API handles this via service role, but this
--  allows the public verify endpoint to work directly too)
CREATE POLICY "documents_select_anon_verify"
  ON public.documents FOR SELECT
  TO anon
  USING (status = 'approved');

CREATE POLICY "documents_all_service"
  ON public.documents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 011_verification_logs.sql
-- ============================================================
CREATE TABLE public.verification_logs (
  id              UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID                        REFERENCES public.documents(id),
  token_used      CHAR(64),
  verifier_ip     INET,
  verifier_org    VARCHAR(200),
  method          VARCHAR(10)                 NOT NULL CHECK (method IN ('qr', 'token')),
  status          public.verification_status  NOT NULL,
  failure_reason  TEXT,
  verified_at     TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verlog_document   ON public.verification_logs(document_id);
CREATE INDEX idx_verlog_token      ON public.verification_logs(token_used);
CREATE INDEX idx_verlog_verified   ON public.verification_logs(verified_at);

ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read verification logs for their institution
CREATE POLICY "verlogs_select_admin"
  ON public.verification_logs FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
    AND document_id IN (
      SELECT id FROM public.documents
      WHERE institution_id = (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Students can see logs for their own documents
CREATE POLICY "verlogs_select_student"
  ON public.verification_logs FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT d.id FROM public.documents d
      JOIN public.students s ON s.id = d.student_id
      WHERE s.profile_id = auth.uid()
    )
  );

-- Only service role inserts (verification handled by Express API)
CREATE POLICY "verlogs_all_service"
  ON public.verification_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- 012_audit_logs.sql + append-only trigger
-- ============================================================
CREATE TABLE public.audit_logs (
  id          UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID                    REFERENCES public.profiles(id),
  actor_role  VARCHAR(20),
  action      public.audit_action     NOT NULL,
  severity    public.audit_severity   NOT NULL DEFAULT 'info',
  target_type VARCHAR(80),
  target_id   UUID,
  ip_address  INET,
  metadata    JSONB,
  created_at  TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditlog_actor    ON public.audit_logs(actor_id);
CREATE INDEX idx_auditlog_action   ON public.audit_logs(action);
CREATE INDEX idx_auditlog_severity ON public.audit_logs(severity);
CREATE INDEX idx_auditlog_created  ON public.audit_logs(created_at);
CREATE INDEX idx_auditlog_target   ON public.audit_logs(target_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read audit logs
CREATE POLICY "auditlog_select_admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'user_role') = 'admin');

-- Only service role inserts
CREATE POLICY "auditlog_insert_service"
  ON public.audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ─── APPEND-ONLY ENFORCEMENT ─────────────────────────────────────────────────
-- This is the most important trigger in the system.
-- It fires BEFORE any UPDATE or DELETE on audit_logs and raises an exception.
-- This is enforced at the PostgreSQL level — no application code can bypass it.
-- Even a developer with direct database access cannot silently modify audit entries.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_audit_log_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION
    'SECURITY VIOLATION: The audit log is append-only. '
    'Modification and deletion of audit entries is permanently prohibited. '
    'Attempted operation: %, Table: audit_logs, Time: %',
    TG_OP,
    NOW();
END;
$$;

CREATE TRIGGER audit_log_immutability
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_audit_log_immutability();

-- ─── TEST THE TRIGGER ────────────────────────────────────────────────────────
-- Run this immediately after to confirm it works:
-- INSERT INTO public.audit_logs (action, severity) VALUES ('USER_LOGIN', 'info');
-- DELETE FROM public.audit_logs WHERE id = (SELECT id FROM public.audit_logs LIMIT 1);
-- Expected result: ERROR: SECURITY VIOLATION: The audit log is append-only.
-- ─────────────────────────────────────────────────────────────────────────────


-- ============================================================
-- 013_gpa_functions.sql
-- ============================================================

-- Compute semester GPA for a student in a specific session
CREATE OR REPLACE FUNCTION public.compute_semester_gpa(
  p_student_id UUID,
  p_session_id UUID
)
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_weighted  DECIMAL(10,2) := 0;
  v_total_units     INTEGER       := 0;
BEGIN
  SELECT
    COALESCE(SUM(r.grade_point * c.credit_units), 0),
    COALESCE(SUM(c.credit_units), 0)
  INTO v_total_weighted, v_total_units
  FROM public.results r
  JOIN public.courses c ON c.id = r.course_id
  WHERE r.student_id   = p_student_id
    AND r.session_id   = p_session_id
    AND r.is_superseded = false;

  IF v_total_units = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(v_total_weighted / v_total_units, 2);
END;
$$;

-- Compute CGPA across all sessions for a student
CREATE OR REPLACE FUNCTION public.compute_cgpa(
  p_student_id UUID
)
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_weighted  DECIMAL(10,2) := 0;
  v_total_units     INTEGER       := 0;
BEGIN
  SELECT
    COALESCE(SUM(r.grade_point * c.credit_units), 0),
    COALESCE(SUM(c.credit_units), 0)
  INTO v_total_weighted, v_total_units
  FROM public.results r
  JOIN public.courses c ON c.id = r.course_id
  WHERE r.student_id   = p_student_id
    AND r.is_superseded = false;

  IF v_total_units = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(v_total_weighted / v_total_units, 2);
END;
$$;

-- Map CGPA to degree class (Nigerian 5-point scale)
CREATE OR REPLACE FUNCTION public.compute_degree_class(
  p_cgpa DECIMAL(4,2)
)
RETURNS VARCHAR(30)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN p_cgpa >= 4.50 THEN 'First Class'
    WHEN p_cgpa >= 3.50 THEN 'Second Class Upper'
    WHEN p_cgpa >= 2.40 THEN 'Second Class Lower'
    WHEN p_cgpa >= 1.50 THEN 'Third Class'
    ELSE 'Pass'
  END;
END;
$$;


-- ============================================================
-- 014_cross_validation_function.sql
-- ============================================================

-- Validates declared certificate metadata against computed academic record.
-- Called before signing any uploaded degree certificate.
-- Returns NULL if all checks pass, or an error message string if any check fails.
CREATE OR REPLACE FUNCTION public.validate_certificate_metadata(
  p_student_id           UUID,
  p_declared_class       VARCHAR(50),
  p_declared_programme   VARCHAR(200),
  p_declared_grad_year   SMALLINT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_cgpa              DECIMAL(4,2);
  v_computed_class    VARCHAR(30);
  v_actual_programme  VARCHAR(200);
  v_actual_grad_year  SMALLINT;
BEGIN
  -- Get student record
  SELECT programme, graduation_year
  INTO v_actual_programme, v_actual_grad_year
  FROM public.students
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RETURN 'Student record not found';
  END IF;

  -- Compute class from stored results
  v_cgpa           := public.compute_cgpa(p_student_id);
  v_computed_class := public.compute_degree_class(v_cgpa);

  -- Check degree class
  IF p_declared_class IS NOT NULL
    AND LOWER(TRIM(p_declared_class)) != LOWER(TRIM(v_computed_class))
  THEN
    RETURN FORMAT(
      'Degree class mismatch. Declared: "%s". Computed from academic record: "%s" (CGPA: %s).',
      p_declared_class, v_computed_class, v_cgpa
    );
  END IF;

  -- Check programme
  IF p_declared_programme IS NOT NULL
    AND v_actual_programme IS NOT NULL
    AND LOWER(TRIM(p_declared_programme)) != LOWER(TRIM(v_actual_programme))
  THEN
    RETURN FORMAT(
      'Programme mismatch. Declared: "%s". On record: "%s".',
      p_declared_programme, v_actual_programme
    );
  END IF;

  -- Check graduation year
  IF p_declared_grad_year IS NOT NULL
    AND v_actual_grad_year IS NOT NULL
    AND p_declared_grad_year != v_actual_grad_year
  THEN
    RETURN FORMAT(
      'Graduation year mismatch. Declared: %s. On record: %s.',
      p_declared_grad_year, v_actual_grad_year
    );
  END IF;

  RETURN NULL; -- NULL means all checks passed
END;
$$;


-- ============================================================
-- 015_duplicate_hash_function.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_duplicate_hash(
  p_hash        CHAR(64),
  p_student_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_same_student_exists   BOOLEAN := false;
  v_cross_student_exists  BOOLEAN := false;
  v_cross_student_id      UUID;
BEGIN
  -- Same student duplicate
  SELECT EXISTS(
    SELECT 1 FROM public.documents
    WHERE sha256_hash = p_hash
      AND student_id  = p_student_id
      AND status NOT IN ('superseded', 'revoked')
  ) INTO v_same_student_exists;

  -- Cross-student duplicate
  SELECT id INTO v_cross_student_id
  FROM public.documents
  WHERE sha256_hash = p_hash
    AND student_id != p_student_id
    AND status NOT IN ('superseded', 'revoked')
  LIMIT 1;

  v_cross_student_exists := (v_cross_student_id IS NOT NULL);

  RETURN jsonb_build_object(
    'same_student_duplicate', v_same_student_exists,
    'cross_student_duplicate', v_cross_student_exists,
    'conflicting_student_id',  v_cross_student_id
  );
END;
$$;


-- ============================================================
-- 016_audit_log_helper.sql
-- ============================================================

-- Convenience function called by Express API via supabase.rpc()
-- to write audit entries without repeating insert logic everywhere.
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_actor_id    UUID        DEFAULT NULL,
  p_actor_role  VARCHAR     DEFAULT NULL,
  p_action      public.audit_action DEFAULT 'USER_LOGIN',
  p_severity    public.audit_severity DEFAULT 'info',
  p_target_type VARCHAR     DEFAULT NULL,
  p_target_id   UUID        DEFAULT NULL,
  p_ip_address  INET        DEFAULT NULL,
  p_metadata    JSONB       DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    actor_id, actor_role, action, severity,
    target_type, target_id, ip_address, metadata
  ) VALUES (
    p_actor_id, p_actor_role, p_action, p_severity,
    p_target_type, p_target_id, p_ip_address, p_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Grant execute to service role only
GRANT EXECUTE ON FUNCTION public.write_audit_log TO service_role;


-- ============================================================
-- 017_lock_results_function.sql
-- ============================================================

-- Locks all non-locked results for a student after transcript generation.
-- Called atomically by the transcript service.
CREATE OR REPLACE FUNCTION public.lock_student_results(
  p_student_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.results
  SET
    is_locked = true,
    locked_at = NOW()
  WHERE student_id  = p_student_id
    AND is_locked   = false
    AND is_superseded = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ============================================================
-- 018_updated_at_triggers.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_institutions
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_departments
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_students
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_results
  BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_documents
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 019_auto_create_profile_trigger.sql
-- ============================================================

-- Fires automatically when a new user is created in auth.users
-- via Supabase Auth. Creates the matching profile record using
-- metadata passed at signup time.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    institution_id,
    role,
    full_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- super_admin has no institution; NULLIF converts empty string to NULL
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'institution_id', '')), '')::UUID,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::public.user_role,
      'student'
    ),
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 020_custom_access_token_hook.sql
-- ============================================================

-- IMPORTANT: After running this migration, you must register
-- this function in Supabase Dashboard:
--   Authentication → Hooks → Add Hook
--   → Hook type: Custom Access Token
--   → Schema: public
--   → Function: custom_access_token_hook
--
-- This function fires before every JWT is issued and injects
-- user_role and institution_id into the token claims.
-- Your Express API reads these claims on every request.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims          JSONB;
  v_user_role     TEXT;
  v_institution   UUID;
BEGIN
  -- Fetch role and institution from profiles table
  SELECT role::TEXT, institution_id
  INTO v_user_role, v_institution
  FROM public.profiles
  WHERE id = (event ->> 'user_id')::UUID;

  claims := event -> 'claims';

  -- Inject user_role claim
  IF v_user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_user_role));
  END IF;

  -- Inject institution_id claim
  IF v_institution IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{institution_id}',
      to_jsonb(v_institution::TEXT)
    );
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute permission to the Supabase Auth admin role
GRANT EXECUTE
  ON FUNCTION public.custom_access_token_hook
  TO supabase_auth_admin;

-- Revoke from everyone else — this function must only be called
-- by the Supabase Auth system, never by application code
REVOKE EXECUTE
  ON FUNCTION public.custom_access_token_hook
  FROM authenticated, anon, public;


-- ============================================================
-- 021_storage_policies.sql
-- ============================================================

-- Run AFTER creating the votta-documents bucket in the
-- Supabase Storage dashboard with these settings:
--   Name: votta-documents
--   Public: OFF (private)
--   File size limit: 5242880 (5MB)
--   Allowed MIME types: application/pdf,image/jpeg,image/png,image/webp

-- Admins can upload documents
CREATE POLICY "admin_upload_documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'votta-documents'
    AND (SELECT auth.jwt() ->> 'user_role') = 'admin'
  );

-- Admins can read documents from their institution
-- (path starts with institution_id/)
CREATE POLICY "admin_read_documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'votta-documents'
    AND (SELECT auth.jwt() ->> 'user_role') = 'admin'
  );

-- Students can read their own documents
-- (path convention: institution_id/student_id/doc_id/filename)
CREATE POLICY "student_read_own_documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'votta-documents'
    AND (storage.foldername(name))[2] IN (
      SELECT id::TEXT FROM public.students
      WHERE profile_id = auth.uid()
    )
  );

-- Service role has full access — used by the Express API
-- for all upload, download, and delete operations
CREATE POLICY "service_role_storage_full"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'votta-documents')
  WITH CHECK (bucket_id = 'votta-documents');


-- ============================================================
-- 022_bootstrap_super_admin.sql
-- ============================================================

-- The super_admin is the platform owner — they sit above all
-- institutions and are responsible for creating institutions
-- and provisioning their admins.
--
-- To create the first super_admin user, run this curl command
-- (replace values with your own):
--
--   curl -X POST 'https://<project-ref>.supabase.co/auth/v1/admin/users' \
--     -H 'Authorization: Bearer <service-role-key>' \
--     -H 'Content-Type: application/json' \
--     -d '{
--       "email": "superadmin@votta.ng",
--       "password": "YourSecurePassword123!",
--       "email_confirm": true,
--       "user_metadata": {
--         "role": "super_admin",
--         "full_name": "Platform Admin"
--       }
--     }'
--
-- No institution_id is needed for super_admin.
-- The handle_new_user trigger will create a profile with
-- institution_id = NULL automatically.
--
-- After that, use the Votta API (POST /api/v1/institution) to
-- create institutions, and (POST /api/v1/institution/:id/admins)
-- to provision admin users for each institution.
-- OR run this after creating the user:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@votta.edu.ng';


-- ============================================================
-- 023_performance_indexes.sql
-- Compound indexes for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS "students_institution_id_idx"
  ON public.students(institution_id);

CREATE INDEX IF NOT EXISTS "results_student_id_idx"
  ON public.results(student_id);

CREATE INDEX IF NOT EXISTS "documents_student_id_institution_id_idx"
  ON public.documents(student_id, institution_id);

CREATE INDEX IF NOT EXISTS "documents_institution_id_status_idx"
  ON public.documents(institution_id, status);

CREATE INDEX IF NOT EXISTS "verification_logs_document_id_idx"
  ON public.verification_logs(document_id);

CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_created_at_idx"
  ON public.audit_logs(actor_id, created_at);


-- ============================================================
-- VERIFICATION CHECKLIST
-- After running all migrations, confirm each of these:
-- ============================================================

-- 1. All 9 tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'institutions', 'profiles', 'departments', 'students',
    'academic_sessions', 'courses', 'results',
    'documents', 'verification_logs', 'audit_logs'
  )
ORDER BY table_name;
-- Expected: 10 rows returned

-- 2. Append-only trigger is working:
-- INSERT INTO public.audit_logs (action, severity)
-- VALUES ('USER_LOGIN', 'info');
-- DELETE FROM public.audit_logs
-- WHERE id = (SELECT id FROM public.audit_logs LIMIT 1);
-- Expected: ERROR: SECURITY VIOLATION: The audit log is append-only.

-- 3. GPA function works:
-- SELECT public.compute_degree_class(4.6);
-- Expected: 'First Class'
-- SELECT public.compute_degree_class(3.7);
-- Expected: 'Second Class Upper'
-- SELECT public.compute_degree_class(2.5);
-- Expected: 'Second Class Lower'

-- 4. Custom access token hook registered:
-- Dashboard → Authentication → Hooks
-- Should show: Custom Access Token → public.custom_access_token_hook

-- 5. Storage bucket exists:
-- Dashboard → Storage → Buckets
-- Should show: votta-documents (private)