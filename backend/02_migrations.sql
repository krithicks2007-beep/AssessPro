-- =========================================================================
-- AssessPro Comprehensive Database Upgrade (v2.0)
-- Run this script in: Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- 1. Update public.users UserType Check Constraint to support 'unassigned' and 'pending_staff'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_UserType_check;
ALTER TABLE public.users ADD CONSTRAINT users_UserType_check 
    CHECK ("UserType" IN ('student', 'staff', 'admin', 'unassigned', 'pending_staff'));

-- 2. Create public.staff_requests table
CREATE TABLE IF NOT EXISTS public.staff_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMPTZ
);

-- 3. Add missing columns to public.tests
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS allow_latecomers BOOLEAN DEFAULT true;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS assigned_students JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0;

-- 4. Add missing columns to public.test_submissions
ALTER TABLE public.test_submissions ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.test_submissions ADD COLUMN IF NOT EXISTS student_email TEXT;
ALTER TABLE public.test_submissions ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.test_submissions ADD COLUMN IF NOT EXISTS tab_switch_count INT DEFAULT 0;
ALTER TABLE public.test_submissions ADD COLUMN IF NOT EXISTS time_taken_seconds INT DEFAULT 0;
ALTER TABLE public.test_submissions ADD COLUMN IF NOT EXISTS correct_count INT DEFAULT 0;
ALTER TABLE public.test_submissions ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0;

-- Ensure student_id in test_submissions can be NULL or gracefully linked
ALTER TABLE public.test_submissions ALTER COLUMN student_id DROP NOT NULL;

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on users" ON public.users;
DROP POLICY IF EXISTS "Allow all on students" ON public.students;
DROP POLICY IF EXISTS "Allow all on staff" ON public.staff;
DROP POLICY IF EXISTS "Allow all on groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all on tests" ON public.tests;
DROP POLICY IF EXISTS "Allow all on submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Allow all on staff_requests" ON public.staff_requests;

-- Security policies are installed by fix_rls.sql. Do not recreate public allow-all policies here.

-- 6. Trigger handle_new_user(): Clean separation between BIT institutional and personal (@gmail) accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    detected_type TEXT := 'unassigned';
    user_email TEXT := LOWER(NEW.email);
    full_name TEXT := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
BEGIN
    -- 1. Super Admin
    IF user_email = 'krithickrajs.cs25@bitsathy.ac.in' OR user_email LIKE '%admin@bitsathy.ac.in' THEN
        detected_type := 'admin';
    -- 2. Institutional BIT emails (@bitsathy.ac.in)
    ELSIF user_email LIKE '%@bitsathy.ac.in' THEN
        -- Batch number pattern (e.g. .cs25, .al23, .it24, or any digits before @) -> Student
        IF user_email ~ '\.[a-z]*\d+[^@]*@' OR user_email ~ '\d{2}@' THEN
            detected_type := 'student';
        ELSE
            detected_type := 'staff';
        END IF;
    -- 3. External / Personal emails (@gmail.com, etc.)
    ELSE
        -- Never assume role for external users; leave as 'unassigned' to trigger Role Selection modal
        detected_type := 'unassigned';
    END IF;

    -- Explicit metadata override if provided
    IF NEW.raw_user_meta_data->>'UserType' IS NOT NULL THEN
        detected_type := NEW.raw_user_meta_data->>'UserType';
    END IF;

    -- Upsert into public.users
    INSERT INTO public.users (id, name, mailid, "UserType")
    VALUES (NEW.id, full_name, NEW.email, detected_type)
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        mailid = EXCLUDED.mailid,
        "UserType" = CASE 
            WHEN public.users."UserType" IN ('unassigned') THEN EXCLUDED."UserType"
            ELSE public.users."UserType"
        END;

    -- Role-specific extension tables: ONLY for verified institutional accounts
    IF detected_type = 'student' AND user_email LIKE '%@bitsathy.ac.in' THEN
        INSERT INTO public.students (id, reg_no, department, year, section)
        VALUES (
            NEW.id, 
            '7376' || SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 6), 
            'Computer Science and Engineering', 
            'II Year (Second Year)', 
            'A'
        )
        ON CONFLICT (id) DO NOTHING;
    ELSIF detected_type = 'staff' AND user_email LIKE '%@bitsathy.ac.in' THEN
        INSERT INTO public.staff (id, staff_code, department, designation, staff_name)
        VALUES (
            NEW.id, 
            'BIT-FAC-' || SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 4), 
            'Computer Science and Engineering', 
            'Faculty',
            full_name
        )
        ON CONFLICT (id) DO UPDATE SET staff_name = EXCLUDED.staff_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =========================================================================
-- AssessPro Migration: Add missing columns for Supabase-only deployment
-- Run in: Supabase Dashboard → SQL Editor → Run
-- =========================================================================

-- Add missing columns to public.tests
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS test_number INT DEFAULT 1;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS uploaded_file_name TEXT;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS created_by_email TEXT;

-- Add missing columns to public.staff (for full staff profile)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS institution TEXT DEFAULT 'Bannari Amman Institute of Technology';
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS office_location TEXT;

-- Update existing tests to have test_number if null
UPDATE public.tests SET test_number = 1 WHERE test_number IS NULL;

-- Allow questions JSONB to have default empty array
ALTER TABLE public.tests ALTER COLUMN questions SET DEFAULT '[]'::jsonb;

-- staff_requests: ensure table exists (may have been missed in initial schema)
CREATE TABLE IF NOT EXISTS public.staff_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'staff_requests' AND policyname = 'Allow all on staff_requests'
  ) THEN
    -- Staff-request policies are installed by fix_rls.sql.
  END IF;
END $$;
-- =========================================================================
-- AssessPro - Bug Fix Migration v2.1
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- BUG FIX 1: staff table missing extended profile columns
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS office_location TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS institution TEXT;

-- BUG FIX 2: students table - ensure institution column exists
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS institution TEXT;

-- BUG FIX 3: tests table - ensure created_by_email exists (needed for staff isolation filter)
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS created_by_email TEXT;
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS uploaded_file_name TEXT;

-- BUG FIX 4: Add proper UNIQUE CONSTRAINT on test_submissions (test_id, student_email)
-- First drop the old index, then add a real constraint
DROP INDEX IF EXISTS test_submissions_test_student_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'test_submissions_test_student_unique'
  ) THEN
    ALTER TABLE public.test_submissions
      ADD CONSTRAINT test_submissions_test_student_unique 
      UNIQUE (test_id, student_email);
  END IF;
END $$;

-- BUG FIX 5: student_id FK in test_submissions should allow NULL
-- (for external/Gmail users who haven't created a student profile)
ALTER TABLE public.test_submissions ALTER COLUMN student_id DROP NOT NULL;

-- Verification query
SELECT 
  'staff columns' as check_name,
  column_name 
FROM information_schema.columns 
WHERE table_name = 'staff' AND table_schema = 'public'
ORDER BY column_name;
-- =========================================================================
-- AssessPro - Active Sessions Migration
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- Create a table to track live user presence and exam status
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT UNIQUE NOT NULL,
    user_name TEXT,
    role TEXT,
    status TEXT DEFAULT 'Online - Active', -- Options: 'Online - Active', 'In Exam', 'Offline'
    test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast querying of active/in-exam users
CREATE INDEX IF NOT EXISTS idx_active_sessions_heartbeat ON public.active_sessions(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_active_sessions_status ON public.active_sessions(status);
CREATE INDEX IF NOT EXISTS idx_active_sessions_role ON public.active_sessions(role);

-- Create a trigger function to update last_heartbeat on updates
CREATE OR REPLACE FUNCTION update_active_session_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_heartbeat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the table
DROP TRIGGER IF EXISTS trigger_active_sessions_heartbeat ON public.active_sessions;
CREATE TRIGGER trigger_active_sessions_heartbeat
    BEFORE UPDATE ON public.active_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_active_session_heartbeat();

-- RLS Policies (Allow authenticated users to upsert their own status, and admins/staff to read all)
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.active_sessions;
CREATE POLICY "Anyone can view active sessions"
    ON public.active_sessions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can update their own session" ON public.active_sessions;
CREATE POLICY "Users can update their own session"
    ON public.active_sessions FOR ALL
    USING (auth.jwt() ->> 'email' = user_email)
    WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- =========================================================================
-- AssessPro Migration v3 — Bug fixes & data normalization
-- Run in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================================

-- BUG 11 FIX: Make reg_no nullable so new students don't get UUID fragments
ALTER TABLE public.students ALTER COLUMN reg_no DROP NOT NULL;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_reg_no_key;
ALTER TABLE public.students ADD CONSTRAINT students_reg_no_key UNIQUE (reg_no) DEFERRABLE INITIALLY DEFERRED;

-- BUG 3 FIX: Ensure assigned_staff columns exist (forces schema cache refresh)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT;

-- BUG 10 FIX: Normalize any old "Computer Science & Engineering" to consistent name
UPDATE public.students SET department = 'Computer Science and Engineering' WHERE department = 'Computer Science & Engineering';
UPDATE public.staff SET department = 'Computer Science and Engineering' WHERE department = 'Mechatronics Engineering';

-- BUG 4 FIX: Normalize old year values that may have been stored as plain numbers
UPDATE public.students SET year = 'I Year' WHERE year = '1';
UPDATE public.students SET year = 'II Year' WHERE year = '2';
UPDATE public.students SET year = 'III Year' WHERE year = '3';
UPDATE public.students SET year = 'IV Year' WHERE year = '4';

-- Clear out ghost reg_no values that are UUID fragments (not real roll numbers)
UPDATE public.students SET reg_no = NULL WHERE reg_no ~ '^[0-9a-f]{8,}$' AND LENGTH(reg_no) >= 8;

-- Reload PostgREST schema cache (run this last)
NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- V4 MIGRATION: Per-Staff Group Isolation + Data Pipeline Fixes
-- Run this block in the Supabase SQL Editor (after all previous migrations)
-- =============================================================================

-- STEP 1: Add created_by column to groups table
-- This is the ROOT CAUSE fix: each group now tracks its owner (staff member)
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- STEP 2: Index for fast per-staff group queries
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- STEP 3: Backfill existing orphan groups to the first staff member
DO $$
DECLARE
  first_staff_id UUID;
BEGIN
  SELECT id INTO first_staff_id
  FROM public.users
  WHERE "UserType" = 'staff'
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_staff_id IS NOT NULL THEN
    UPDATE public.groups
    SET created_by = first_staff_id
    WHERE created_by IS NULL;
  END IF;
END $$;

-- STEP 4: Drop old overly-permissive group policies
DROP POLICY IF EXISTS "Allow all on groups" ON public.groups;
DROP POLICY IF EXISTS "groups_public_read" ON public.groups;
DROP POLICY IF EXISTS "groups_public_write" ON public.groups;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.groups;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.groups;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.groups;

-- STEP 5: Create scoped RLS policies for groups
-- Staff reads own groups; admins read all; students read their assigned staff's groups
CREATE POLICY "staff_read_own_groups" ON public.groups
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u."UserType" = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = auth.uid() AND s.assigned_staff_id = groups.created_by
    )
  );

CREATE POLICY "staff_insert_own_groups" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "staff_update_own_groups" ON public.groups
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" = 'admin'
    )
  );

CREATE POLICY "staff_delete_own_groups" ON public.groups
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" = 'admin'
    )
  );

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- STEP 6: Performance indexes for tests and submissions
CREATE INDEX IF NOT EXISTS idx_tests_created_by ON public.tests(created_by);
CREATE INDEX IF NOT EXISTS idx_tests_created_by_email ON public.tests(created_by_email);
CREATE INDEX IF NOT EXISTS idx_tests_status ON public.tests(status);
CREATE INDEX IF NOT EXISTS idx_submissions_test_id ON public.test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_email ON public.test_submissions(student_email);

-- STEP 7: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- V5 MIGRATION: Add staff_name to staff table
-- Run this block in the Supabase SQL Editor
-- =============================================================================

-- STEP 1: Add staff_name column to staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS staff_name TEXT;

-- STEP 2: Backfill staff_name from the users table
UPDATE public.staff
SET staff_name = u.name
FROM public.users u
WHERE public.staff.id = u.id;

-- STEP 3: Update the trigger function so future staff get the staff_name added automatically
CREATE OR REPLACE FUNCTION public.sync_user_to_role_tables()
RETURNS TRIGGER AS $$
DECLARE
    detected_type TEXT;
    user_email TEXT;
    full_name TEXT;
BEGIN
    user_email := LOWER(TRIM(NEW.email));
    full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(user_email, '@', 1));

    -- Determine user type based on email pattern
    IF user_email = 'krithickrajs.cs25@bitsathy.ac.in' THEN
        detected_type := 'admin';
    ELSIF user_email LIKE '%@bitsathy.ac.in' THEN
        IF user_email ~ '\d' THEN
            detected_type := 'student';
        ELSE
            detected_type := 'staff';
        END IF;
    ELSE
        detected_type := 'unassigned';
    END IF;

    IF NEW.raw_user_meta_data->>'UserType' IS NOT NULL THEN
        detected_type := NEW.raw_user_meta_data->>'UserType';
    END IF;

    INSERT INTO public.users (id, name, mailid, "UserType")
    VALUES (NEW.id, full_name, NEW.email, detected_type)
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        mailid = EXCLUDED.mailid,
        "UserType" = CASE 
            WHEN public.users."UserType" IN ('unassigned') THEN EXCLUDED."UserType"
            ELSE public.users."UserType"
        END;

    IF detected_type = 'student' AND user_email LIKE '%@bitsathy.ac.in' THEN
        INSERT INTO public.students (id, reg_no, department, year, section)
        VALUES (
            NEW.id, 
            '7376' || SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 6), 
            'Computer Science and Engineering', 
            'II Year (Second Year)', 
            'A'
        )
        ON CONFLICT (id) DO NOTHING;
    ELSIF detected_type = 'staff' AND user_email LIKE '%@bitsathy.ac.in' THEN
        INSERT INTO public.staff (id, staff_code, department, designation, staff_name)
        VALUES (
            NEW.id, 
            'BIT-FAC-' || SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 4), 
            'Computer Science and Engineering', 
            'Faculty',
            full_name
        )
        ON CONFLICT (id) DO UPDATE SET staff_name = EXCLUDED.staff_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
