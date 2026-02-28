/*
  # Add client-side generation tracking

  1. New Tables
    - `lecture_generation_client_runs`
      - `id` (uuid, primary key)
      - `lecture_id` (uuid, foreign key to lectures)
      - `created_at` (timestamptz)
      - `status` (text) - started/completed/blocked/error
      - `reason` (text, nullable) - why it was blocked or error message
      - `job_types` (text array, nullable) - which job types were requested

  2. Changes to `lectures` table
    - Add `last_generate_attempt_at` (timestamptz, nullable)
    - Add `last_generate_block_reason` (text, nullable)

  3. Security
    - Enable RLS on `lecture_generation_client_runs`
    - Add policies for authenticated users to manage their own runs

  4. Indexes
    - Index on lecture_id and created_at for efficient lookups
*/

-- Create client tracking table
CREATE TABLE IF NOT EXISTS lecture_generation_client_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'started',
  reason text,
  job_types text[]
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_lecture_generation_runs_lecture_id_created
  ON lecture_generation_client_runs(lecture_id, created_at DESC);

-- Enable RLS
ALTER TABLE lecture_generation_client_runs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own lecture generation runs
CREATE POLICY "Users can view own lecture generation runs"
  ON lecture_generation_client_runs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_generation_client_runs.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Policy: Users can insert runs for their own lectures
CREATE POLICY "Users can create runs for own lectures"
  ON lecture_generation_client_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_generation_client_runs.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Policy: Users can update their own runs
CREATE POLICY "Users can update own lecture generation runs"
  ON lecture_generation_client_runs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_generation_client_runs.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_generation_client_runs.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Add tracking columns to lectures table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'last_generate_attempt_at'
  ) THEN
    ALTER TABLE lectures ADD COLUMN last_generate_attempt_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'last_generate_block_reason'
  ) THEN
    ALTER TABLE lectures ADD COLUMN last_generate_block_reason text;
  END IF;
END $$;
