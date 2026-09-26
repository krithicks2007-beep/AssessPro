-- =========================================================================
-- Fix Row Level Security (RLS) Policies for Groups and Tests in Supabase
-- Copy and run this in Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- 1. FIX GROUPS PERMISSIONS (Allows Insert, Update, Select, Delete)
DROP POLICY IF EXISTS "Public read for authenticated users on groups" ON public.groups;
DROP POLICY IF EXISTS "Staff can manage groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all select on groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all insert on groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all update on groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all delete on groups" ON public.groups;

CREATE POLICY "Allow all select on groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Allow all insert on groups" ON public.groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on groups" ON public.groups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on groups" ON public.groups FOR DELETE USING (true);

-- 2. FIX TESTS PERMISSIONS (Allows Insert, Update, Select, Delete)
DROP POLICY IF EXISTS "Public read for authenticated users on tests" ON public.tests;
DROP POLICY IF EXISTS "Staff can manage tests" ON public.tests;
DROP POLICY IF EXISTS "Allow all select on tests" ON public.tests;
DROP POLICY IF EXISTS "Allow all insert on tests" ON public.tests;
DROP POLICY IF EXISTS "Allow all update on tests" ON public.tests;
DROP POLICY IF EXISTS "Allow all delete on tests" ON public.tests;

CREATE POLICY "Allow all select on tests" ON public.tests FOR SELECT USING (true);
CREATE POLICY "Allow all insert on tests" ON public.tests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on tests" ON public.tests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on tests" ON public.tests FOR DELETE USING (true);

-- 3. FIX TEST_SUBMISSIONS PERMISSIONS
DROP POLICY IF EXISTS "Public read for authenticated users on submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Allow all select on test_submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Allow all insert on test_submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Allow all update on test_submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Allow all delete on test_submissions" ON public.test_submissions;

CREATE POLICY "Allow all select on test_submissions" ON public.test_submissions FOR SELECT USING (true);
CREATE POLICY "Allow all insert on test_submissions" ON public.test_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on test_submissions" ON public.test_submissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on test_submissions" ON public.test_submissions FOR DELETE USING (true);
