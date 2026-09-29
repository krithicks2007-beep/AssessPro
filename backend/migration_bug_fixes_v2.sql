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
