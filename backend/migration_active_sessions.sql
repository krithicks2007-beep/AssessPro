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
