/*
  # Extend Courses Schema

  1. Schema Changes
    - Extend `courses` table with:
      - `semester` (text) - e.g., 'Fall 2025'
      - `section` (text) - e.g., '001'
      - `instructor_name` (text)
      - `syllabus_url` (text, nullable) - URL to uploaded syllabus file
      - `course_materials_urls` (text array, default empty array) - URLs to course materials
      - `background_materials_urls` (text array, default empty array) - URLs to background materials

  2. New Tables
    - `course_teaching_assistants`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `email` (text)
      - `created_at` (timestamptz)

    - `course_students`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `email` (text)
      - `created_at` (timestamptz)

    - `course_textbooks`
      - `id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `title_isbn` (text) - Combined title and ISBN
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on all new tables
    - Add policies for educators to manage their course-related data
*/

-- Extend courses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'semester'
  ) THEN
    ALTER TABLE courses ADD COLUMN semester text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'section'
  ) THEN
    ALTER TABLE courses ADD COLUMN section text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'instructor_name'
  ) THEN
    ALTER TABLE courses ADD COLUMN instructor_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'syllabus_url'
  ) THEN
    ALTER TABLE courses ADD COLUMN syllabus_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'course_materials_urls'
  ) THEN
    ALTER TABLE courses ADD COLUMN course_materials_urls text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'background_materials_urls'
  ) THEN
    ALTER TABLE courses ADD COLUMN background_materials_urls text[] DEFAULT '{}';
  END IF;
END $$;

-- Create course_teaching_assistants table
CREATE TABLE IF NOT EXISTS course_teaching_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_teaching_assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view TAs for their courses"
  ON course_teaching_assistants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_teaching_assistants.course_id
      AND courses.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert TAs for their courses"
  ON course_teaching_assistants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_teaching_assistants.course_id
      AND courses.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete TAs from their courses"
  ON course_teaching_assistants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_teaching_assistants.course_id
      AND courses.educator_id = auth.uid()
    )
  );

-- Create course_students table
CREATE TABLE IF NOT EXISTS course_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view students in their courses"
  ON course_students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_students.course_id
      AND courses.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert students in their courses"
  ON course_students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_students.course_id
      AND courses.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete students from their courses"
  ON course_students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_students.course_id
      AND courses.educator_id = auth.uid()
    )
  );

-- Create course_textbooks table
CREATE TABLE IF NOT EXISTS course_textbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title_isbn text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE course_textbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view textbooks for their courses"
  ON course_textbooks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_textbooks.course_id
      AND courses.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert textbooks for their courses"
  ON course_textbooks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_textbooks.course_id
      AND courses.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete textbooks from their courses"
  ON course_textbooks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_textbooks.course_id
      AND courses.educator_id = auth.uid()
    )
  );