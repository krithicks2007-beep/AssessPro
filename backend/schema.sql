-- =========================================================================
-- AssessPro Complete Multi-Table Database Schema (v2.0)
-- Run this script in: Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- 1. Base Users Table (Synchronized with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mailid TEXT UNIQUE NOT NULL,
    "UserType" TEXT NOT NULL CHECK ("UserType" IN ('student', 'staff', 'admin', 'unassigned', 'pending_staff')) DEFAULT 'unassigned',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Students Profile Extension Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    reg_no TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL DEFAULT 'Computer Science & Engineering',
    year TEXT NOT NULL DEFAULT 'II Year',
    section TEXT NOT NULL DEFAULT 'A',
    dob DATE,
    phone TEXT,
    overall_percentage NUMERIC(5, 2) DEFAULT 0.00,
    assigned_staff_id UUID REFERENCES public.users(id),
    assigned_staff_name TEXT
);

-- Ensure columns exist if table was already created
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT;

-- 3. Staff / Faculty Profile Extension Table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    staff_code TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL DEFAULT 'Mechatronics Engineering',
    designation TEXT NOT NULL DEFAULT 'Associate Professor'
);

-- 4. Test Groups
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_number INT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Core Subjects',
    department TEXT NOT NULL DEFAULT 'Mechatronics Engineering',
    color TEXT DEFAULT '#2563eb',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tests Table
CREATE TABLE IF NOT EXISTS public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    test_type TEXT DEFAULT 'test' CHECK (test_type IN ('test', 'task')),
    duration_minutes INT NOT NULL DEFAULT 60,
    max_score INT NOT NULL DEFAULT 100,
    scheduled_date TIMESTAMPTZ DEFAULT now(),
    start_time TIMESTAMPTZ DEFAULT now(),
    end_time TIMESTAMPTZ,
    allow_latecomers BOOLEAN DEFAULT true,
    assigned_students JSONB DEFAULT '[]'::jsonb,
    questions JSONB DEFAULT '[]'::jsonb,
    total_questions INT DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'completed')) DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Student Test & Task Submissions / Performance Table
CREATE TABLE IF NOT EXISTS public.test_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name TEXT,
    student_email TEXT,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    max_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    percentage NUMERIC(5, 2) GENERATED ALWAYS AS (ROUND((score / NULLIF(max_score, 0)) * 100, 2)) STORED,
    answers JSONB DEFAULT '{}'::jsonb,
    tab_switch_count INT DEFAULT 0,
    time_taken_seconds INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'in_progress')) DEFAULT 'completed',
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Staff Access Requests Table
CREATE TABLE IF NOT EXISTS public.staff_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMPTZ
);

-- Security: Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tests" ON public.tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on submissions" ON public.test_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staff_requests" ON public.staff_requests FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- Trigger: Automatic Profile Creation on Google OAuth or Email Sign In
-- =========================================================================
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
        IF user_email ~ '\.[a-z]*\d+[^@]*@' OR user_email ~ '\d{2}@' THEN
            detected_type := 'student';
        ELSE
            detected_type := 'staff';
        END IF;
    -- 3. External / Personal emails (@gmail.com, etc.)
    ELSE
        -- Default to 'unassigned' so they select Student or Staff in UI
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
