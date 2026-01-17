/*
  # Enable RLS on lecture_jobs and lecture_artifacts

  1. Security Changes
    - Enable RLS on lecture_jobs table
    - Enable RLS on lecture_artifacts table
    - Add policies for educators to manage their own lecture jobs
    - Add policies for educators to manage their own lecture artifacts
    
  2. RLS Policies
    - Educators can read jobs/artifacts for lectures they own
    - Educators can insert jobs/artifacts for lectures they own
    - Educators can update jobs/artifacts for lectures they own
    - Educators can delete jobs/artifacts for lectures they own
    - Service role (backend) bypasses RLS automatically
*/

-- Enable RLS on lecture_jobs
ALTER TABLE lecture_jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lecture_artifacts
ALTER TABLE lecture_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lecture_jobs

-- Educators can read their own lecture jobs
DROP POLICY IF EXISTS "Educators can read own lecture jobs" ON lecture_jobs;
CREATE POLICY "Educators can read own lecture jobs"
  ON lecture_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_jobs.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Educators can insert jobs for their own lectures
DROP POLICY IF EXISTS "Educators can insert own lecture jobs" ON lecture_jobs;
CREATE POLICY "Educators can insert own lecture jobs"
  ON lecture_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_jobs.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Educators can update their own lecture jobs
DROP POLICY IF EXISTS "Educators can update own lecture jobs" ON lecture_jobs;
CREATE POLICY "Educators can update own lecture jobs"
  ON lecture_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_jobs.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_jobs.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Educators can delete their own lecture jobs
DROP POLICY IF EXISTS "Educators can delete own lecture jobs" ON lecture_jobs;
CREATE POLICY "Educators can delete own lecture jobs"
  ON lecture_jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_jobs.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- RLS Policies for lecture_artifacts

-- Educators can read their own lecture artifacts
DROP POLICY IF EXISTS "Educators can read own lecture artifacts" ON lecture_artifacts;
CREATE POLICY "Educators can read own lecture artifacts"
  ON lecture_artifacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_artifacts.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Educators can insert artifacts for their own lectures
DROP POLICY IF EXISTS "Educators can insert own lecture artifacts" ON lecture_artifacts;
CREATE POLICY "Educators can insert own lecture artifacts"
  ON lecture_artifacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_artifacts.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Educators can update their own lecture artifacts
DROP POLICY IF EXISTS "Educators can update own lecture artifacts" ON lecture_artifacts;
CREATE POLICY "Educators can update own lecture artifacts"
  ON lecture_artifacts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_artifacts.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_artifacts.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Educators can delete their own lecture artifacts
DROP POLICY IF EXISTS "Educators can delete own lecture artifacts" ON lecture_artifacts;
CREATE POLICY "Educators can delete own lecture artifacts"
  ON lecture_artifacts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_artifacts.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );