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
