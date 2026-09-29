-- Replace the old public allow-all policies with role-scoped policies.
-- Apply after schema.sql/migrations. The backend service-role client bypasses RLS.

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
DROP POLICY IF EXISTS "Allow all select on groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all insert on groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all update on groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all delete on groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all select on tests" ON public.tests;
DROP POLICY IF EXISTS "Allow all insert on tests" ON public.tests;
DROP POLICY IF EXISTS "Allow all update on tests" ON public.tests;
DROP POLICY IF EXISTS "Allow all delete on tests" ON public.tests;
DROP POLICY IF EXISTS "Allow all select on test_submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Allow all insert on test_submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Allow all update on test_submissions" ON public.test_submissions;
DROP POLICY IF EXISTS "Allow all delete on test_submissions" ON public.test_submissions;

CREATE POLICY "Users can read own profile" ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Students manage own profile" ON public.students FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Staff manage own profile" ON public.staff FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Authenticated users read groups" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage groups" ON public.groups FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" IN ('staff', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" IN ('staff', 'admin')));

CREATE POLICY "Authenticated users read tests" ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff create tests" ON public.tests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" IN ('staff', 'admin')));
CREATE POLICY "Staff update tests" ON public.tests FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" = 'admin'))
  WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" = 'admin'));
CREATE POLICY "Staff delete tests" ON public.tests FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" = 'admin'));

CREATE POLICY "Students read own submissions" ON public.test_submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR student_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Students create own submissions" ON public.test_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR student_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Staff read submissions" ON public.test_submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" IN ('staff', 'admin')));

CREATE POLICY "Users create own staff request" ON public.staff_requests FOR INSERT TO authenticated
  WITH CHECK (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));
CREATE POLICY "Users read own staff request" ON public.staff_requests FOR SELECT TO authenticated
  USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())) OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" = 'admin'));
CREATE POLICY "Admins manage staff requests" ON public.staff_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u."UserType" = 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS test_submissions_test_student_unique
  ON public.test_submissions (test_id, student_email);
