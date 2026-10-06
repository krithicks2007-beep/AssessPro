-- 1. Add group_type to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'test';

-- 2. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  max_score integer DEFAULT 100,
  due_date timestamp with time zone,
  status text DEFAULT 'draft', -- 'draft' or 'published'
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create task_submissions table
CREATE TABLE IF NOT EXISTS task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  student_id uuid REFERENCES users(id) ON DELETE CASCADE,
  submission_url text,
  student_message text,
  score integer,
  staff_feedback text,
  status text DEFAULT 'waiting_for_result', -- 'waiting_for_result', 'graded', 'resubmission_required'
  submitted_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(task_id, student_id)
);

-- 4. Enable Row Level Security (RLS) - Optional but good practice
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policies to allow all operations (since backend handles auth)
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on task_submissions" ON task_submissions FOR ALL USING (true) WITH CHECK (true);
