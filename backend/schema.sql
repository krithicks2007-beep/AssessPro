-- =========================================================================
-- AssessPro Complete Multi-Table Database Schema
-- Run this script in: Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- 1. Base Users Table (Synchronized with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mailid TEXT UNIQUE NOT NULL,
    "UserType" TEXT NOT NULL CHECK ("UserType" IN ('student', 'staff', 'admin')) DEFAULT 'student',
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
    overall_percentage NUMERIC(5, 2) DEFAULT 0.00
);

-- Ensure columns exist if table was already created
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Staff / Faculty Profile Extension Table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    staff_code TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL DEFAULT 'Mechatronics Engineering',
    designation TEXT NOT NULL DEFAULT 'Associate Professor'
);

-- 4. Test Groups (e.g. Group 1: Programming & Logic, Group 2: Electronics & Control)
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
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'completed')) DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Student Test & Task Submissions / Performance Table
CREATE TABLE IF NOT EXISTS public.test_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    max_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    percentage NUMERIC(5, 2) GENERATED ALWAYS AS (ROUND((score / NULLIF(max_score, 0)) * 100, 2)) STORED,
    status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'in_progress')) DEFAULT 'completed',
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Security: Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tests" ON public.tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on submissions" ON public.test_submissions FOR ALL USING (true) WITH CHECK (true);


-- =========================================================================
-- Trigger: Automatic Profile Creation on Google OAuth or Email Sign In
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    detected_type TEXT := 'student';
    user_email TEXT := LOWER(NEW.email);
    full_name TEXT := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
BEGIN
    -- Strict Domain Restriction: Reject any account outside bitsathy.ac.in
    IF user_email NOT LIKE '%@bitsathy.ac.in' THEN
        RAISE EXCEPTION 'Access Denied: Only institutional @bitsathy.ac.in email addresses are authorized to sign in. (%) is rejected.', user_email;
    END IF;

    -- Determine role from email format or metadata
    IF user_email LIKE '%admin%' THEN
        detected_type := 'admin';
    ELSIF user_email ~ '\.[a-z]{2,3}\d{2}@bitsathy\.ac\.in$' THEN
        detected_type := 'student';
    ELSE
        detected_type := 'staff';
    END IF;

    IF NEW.raw_user_meta_data->>'UserType' IS NOT NULL THEN
        detected_type := NEW.raw_user_meta_data->>'UserType';
    END IF;

    -- Upsert in base users table
    INSERT INTO public.users (id, name, mailid, "UserType")
    VALUES (NEW.id, full_name, NEW.email, detected_type)
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        mailid = EXCLUDED.mailid;

    -- Auto-insert into role specific table
    IF detected_type = 'student' THEN
        INSERT INTO public.students (id, reg_no, department, year, section)
        VALUES (
            NEW.id, 
            '7376' || SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 6), 
            'Mechatronics Engineering', 
            'III Year', 
            'A'
        )
        ON CONFLICT (id) DO NOTHING;
    ELSIF detected_type = 'staff' THEN
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
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- Initial Seed Data: Groups (Group 1, Group 2, Group 3)
-- =========================================================================
INSERT INTO public.groups (id, group_number, name, category, department, color) VALUES
('00000000-0000-0000-0000-000000000001', 1, 'Programming & Logic', 'Core Subjects', 'Mechatronics Engineering', '#2563eb'),
('00000000-0000-0000-0000-000000000002', 2, 'Electronics & Control', 'Professional Core', 'Mechatronics Engineering', '#059669'),
('00000000-0000-0000-0000-000000000003', 3, 'Mechanical & Design', 'Specialization Subjects', 'Mechatronics Engineering', '#ea580c')
ON CONFLICT (id) DO NOTHING;

-- Initial Seed Tests
INSERT INTO public.tests (id, group_id, title, test_type, duration_minutes, max_score, status) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Basics of C', 'test', 45, 100, 'completed'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Data Structures', 'test', 60, 100, 'completed'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Python Programming', 'test', 45, 100, 'completed'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Problem Solving', 'test', 60, 100, 'completed'),

('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Basic Electronics', 'test', 45, 100, 'completed'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Sensors & Actuators', 'test', 45, 100, 'completed'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Control Systems', 'test', 60, 100, 'completed'),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'PLC Basics', 'test', 60, 100, 'completed'),

('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Engineering Drawing', 'test', 45, 100, 'completed'),
('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'CAD Modeling', 'test', 60, 100, 'completed'),
('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Manufacturing', 'test', 45, 100, 'completed'),
('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Mechanics Basics', 'test', 60, 100, 'completed')
ON CONFLICT (id) DO NOTHING;
