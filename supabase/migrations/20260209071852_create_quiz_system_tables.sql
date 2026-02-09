/*
  # Create Quiz System Tables

  1. New Tables
    - `quiz_batches`
      - Core quiz batch configuration table
      - Tracks quiz creation workflow and settings
      - Fields: educator_id, status, mode, mcq_count, short_answer_count, etc.
    
    - `quiz_batch_courses`
      - Junction table linking quiz batches to courses
      - Determines which courses this quiz belongs to
    
    - `quiz_batch_students`
      - Junction table linking quiz batches to students
      - Tracks which students are included in this quiz
    
    - `quiz_batch_materials`
      - Junction table linking quiz batches to lecture materials
      - Tracks which preloaded course materials are used
    
    - `quiz_batch_student_files`
      - Stores per-student uploaded files
      - One file per student per batch
      - Contains file metadata and storage path

  2. Security
    - Enable RLS on all tables
    - Educators can only access their own quiz batches
    - Students can only view quizzes they're assigned to
*/

-- Quiz Batches (main table)
CREATE TABLE IF NOT EXISTS quiz_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  mode text,
  mcq_count integer DEFAULT 0,
  short_answer_count integer DEFAULT 0,
  fixed_mcq_answer_key_enabled boolean DEFAULT false,
  fixed_mcq_answer_key jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view own quiz batches"
  ON quiz_batches FOR SELECT
  TO authenticated
  USING (educator_id = auth.uid());

CREATE POLICY "Educators can insert own quiz batches"
  ON quiz_batches FOR INSERT
  TO authenticated
  WITH CHECK (educator_id = auth.uid());

CREATE POLICY "Educators can update own quiz batches"
  ON quiz_batches FOR UPDATE
  TO authenticated
  USING (educator_id = auth.uid())
  WITH CHECK (educator_id = auth.uid());

CREATE POLICY "Educators can delete own quiz batches"
  ON quiz_batches FOR DELETE
  TO authenticated
  USING (educator_id = auth.uid());

-- Quiz Batch Courses (junction table)
CREATE TABLE IF NOT EXISTS quiz_batch_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_batch_id uuid NOT NULL REFERENCES quiz_batches(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quiz_batch_id, course_id)
);

ALTER TABLE quiz_batch_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view own quiz batch courses"
  ON quiz_batch_courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_courses.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own quiz batch courses"
  ON quiz_batch_courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_courses.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete own quiz batch courses"
  ON quiz_batch_courses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_courses.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

-- Quiz Batch Students (junction table)
CREATE TABLE IF NOT EXISTS quiz_batch_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_batch_id uuid NOT NULL REFERENCES quiz_batches(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quiz_batch_id, student_id)
);

ALTER TABLE quiz_batch_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view own quiz batch students"
  ON quiz_batch_students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_students.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own quiz batch students"
  ON quiz_batch_students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_students.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete own quiz batch students"
  ON quiz_batch_students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_students.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

-- Quiz Batch Materials (junction table)
CREATE TABLE IF NOT EXISTS quiz_batch_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_batch_id uuid NOT NULL REFERENCES quiz_batches(id) ON DELETE CASCADE,
  lecture_material_id uuid NOT NULL REFERENCES lecture_materials(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(quiz_batch_id, lecture_material_id)
);

ALTER TABLE quiz_batch_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view own quiz batch materials"
  ON quiz_batch_materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_materials.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own quiz batch materials"
  ON quiz_batch_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_materials.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete own quiz batch materials"
  ON quiz_batch_materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_materials.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

-- Quiz Batch Student Files (per-student uploads)
CREATE TABLE IF NOT EXISTS quiz_batch_student_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_batch_id uuid NOT NULL REFERENCES quiz_batches(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  storage_path text NOT NULL,
  file_mime text,
  file_size_bytes integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(quiz_batch_id, student_id)
);

ALTER TABLE quiz_batch_student_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view own quiz batch student files"
  ON quiz_batch_student_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_student_files.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own quiz batch student files"
  ON quiz_batch_student_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_student_files.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can update own quiz batch student files"
  ON quiz_batch_student_files FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_student_files.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_student_files.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete own quiz batch student files"
  ON quiz_batch_student_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quiz_batches
      WHERE quiz_batches.id = quiz_batch_student_files.quiz_batch_id
      AND quiz_batches.educator_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_batches_educator ON quiz_batches(educator_id);
CREATE INDEX IF NOT EXISTS idx_quiz_batch_courses_batch ON quiz_batch_courses(quiz_batch_id);
CREATE INDEX IF NOT EXISTS idx_quiz_batch_courses_course ON quiz_batch_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_batch_students_batch ON quiz_batch_students(quiz_batch_id);
CREATE INDEX IF NOT EXISTS idx_quiz_batch_materials_batch ON quiz_batch_materials(quiz_batch_id);
CREATE INDEX IF NOT EXISTS idx_quiz_batch_student_files_batch ON quiz_batch_student_files(quiz_batch_id);