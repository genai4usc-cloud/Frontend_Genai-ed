/*
  # Add Quiz Generation and Save Features

  1. Updates to quiz_batches table
    - Add `additional_instructions` (text, nullable) - for Step 5 optional prompt
    - Add `quiz_name` (text, nullable) - for Step 7 quiz naming
    - Add `saved_at` (timestamp, nullable) - for Step 7 save tracking
    - Update status to support 'generated' and 'saved' in addition to 'draft'

  2. New Table: quiz_generated
    - Stores generated quiz content for each student
    - Includes quiz JSON, answers JSON, and PDF URLs
    - Links to quiz_batches and students
    - Tracks source file information and question counts

  3. Security
    - Enable RLS on quiz_generated table
    - Educators can only access their own generated quizzes
*/

-- Add new columns to quiz_batches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_batches' AND column_name = 'additional_instructions'
  ) THEN
    ALTER TABLE quiz_batches ADD COLUMN additional_instructions text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_batches' AND column_name = 'quiz_name'
  ) THEN
    ALTER TABLE quiz_batches ADD COLUMN quiz_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_batches' AND column_name = 'saved_at'
  ) THEN
    ALTER TABLE quiz_batches ADD COLUMN saved_at timestamptz;
  END IF;
END $$;

-- Create quiz_generated table
CREATE TABLE IF NOT EXISTS quiz_generated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_batch_id uuid NOT NULL REFERENCES quiz_batches(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  student_file_url text,
  student_file_name text,
  mcq_count integer DEFAULT 0,
  short_answer_count integer DEFAULT 0,
  quiz_content_json jsonb,
  answers_content_json jsonb,
  quiz_pdf_url text,
  answers_pdf_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_generated ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view own generated quizzes"
  ON quiz_generated FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_generated.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own generated quizzes"
  ON quiz_generated FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_generated.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can update own generated quizzes"
  ON quiz_generated FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_generated.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_generated.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete own generated quizzes"
  ON quiz_generated FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_generated.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_generated_batch ON quiz_generated(quiz_batch_id);
CREATE INDEX IF NOT EXISTS idx_quiz_generated_student ON quiz_generated(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_batches_status ON quiz_batches(status);
CREATE INDEX IF NOT EXISTS idx_quiz_batches_educator_status ON quiz_batches(educator_id, status);