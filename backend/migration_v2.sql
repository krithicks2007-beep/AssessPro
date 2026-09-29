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
        "UserType" = EXCLUDED."UserType";

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
        INSERT INTO public.staff (id, staff_code, department, designation)
        VALUES (
            NEW.id, 
            'BIT-FAC-' || SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 4), 
            'Mechatronics Engineering', 
            'Faculty'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
