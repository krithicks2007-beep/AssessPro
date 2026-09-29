-- =========================================================================
-- CRITICAL: Fix Row Level Security for Admin Operations
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================================

-- TABLE: users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all select on users" ON public.users;
DROP POLICY IF EXISTS "Allow all insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow all update on users" ON public.users;
DROP POLICY IF EXISTS "Allow all delete on users" ON public.users;
CREATE POLICY "Allow all select on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow all insert on users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on users" ON public.users FOR DELETE USING (true);

-- TABLE: students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all select on students" ON public.students;
DROP POLICY IF EXISTS "Allow all insert on students" ON public.students;
DROP POLICY IF EXISTS "Allow all update on students" ON public.students;
DROP POLICY IF EXISTS "Allow all delete on students" ON public.students;
CREATE POLICY "Allow all select on students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow all insert on students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on students" ON public.students FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on students" ON public.students FOR DELETE USING (true);

-- TABLE: staff
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all select on staff" ON public.staff;
DROP POLICY IF EXISTS "Allow all insert on staff" ON public.staff;
DROP POLICY IF EXISTS "Allow all update on staff" ON public.staff;
DROP POLICY IF EXISTS "Allow all delete on staff" ON public.staff;
CREATE POLICY "Allow all select on staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Allow all insert on staff" ON public.staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on staff" ON public.staff FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on staff" ON public.staff FOR DELETE USING (true);

-- TABLE: staff_requests
ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all select on staff_requests" ON public.staff_requests;
DROP POLICY IF EXISTS "Allow all insert on staff_requests" ON public.staff_requests;
DROP POLICY IF EXISTS "Allow all update on staff_requests" ON public.staff_requests;
DROP POLICY IF EXISTS "Allow all delete on staff_requests" ON public.staff_requests;
CREATE POLICY "Allow all select on staff_requests" ON public.staff_requests FOR SELECT USING (true);
CREATE POLICY "Allow all insert on staff_requests" ON public.staff_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on staff_requests" ON public.staff_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on staff_requests" ON public.staff_requests FOR DELETE USING (true);

-- Add unique constraint on staff_requests.email if missing (needed for upsert to work)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.staff_requests'::regclass
    AND contype = 'u'
    AND conname LIKE '%email%'
  ) THEN
    ALTER TABLE public.staff_requests ADD CONSTRAINT staff_requests_email_unique UNIQUE (email);
  END IF;
END $$;
