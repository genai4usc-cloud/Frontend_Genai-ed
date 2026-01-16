/*
  # Recreate GenAI-ed Platform Schema with RLS and Seed Data

  1. Extensions
    - Enable pgcrypto for UUID generation

  2. Tables Created (if not exist)
    - profiles: User profiles with role management
    - courses: Course catalog managed by educators
    - course_students: Student enrollments in courses
    - course_teaching_assistants: TA assignments to courses
    - course_textbooks: Textbooks associated with courses
    - lectures: Lecture content with AI generation settings
    - lecture_materials: Files/resources uploaded for lectures
    - lecture_courses: Many-to-many relationship between lectures and courses
    - lecture_jobs: Background jobs for lecture generation
    - lecture_artifacts: Generated outputs (videos, scripts, etc.)
    - student_uploads: Student file uploads
    - student_lectures: Student-created lectures
    - student_lecture_views: Tracking lecture views by students

  3. Indexes
    - Foreign key indexes for performance

  4. Security (RLS)
    - Helper function: user_owns_lecture(lecture_id)
    - Policies for lectures: educators can manage their own
    - Policies for lecture_materials: educators can manage materials for their lectures
    - Student read access through course enrollment

  5. Seed Data
    - Test educator profile
    - Test course
    - Test lecture with AI generation settings
    - Test lecture material (PDF)
*/

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  role text DEFAULT 'educator',
  created_at timestamptz DEFAULT now()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL,
  title text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create course_students table
CREATE TABLE IF NOT EXISTS course_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, student_id)
);

-- Create course_teaching_assistants table
CREATE TABLE IF NOT EXISTS course_teaching_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  ta_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(course_id, ta_id)
);

-- Create course_textbooks table
CREATE TABLE IF NOT EXISTS course_textbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text,
  author text,
  created_at timestamptz DEFAULT now()
);

-- Create lectures table
CREATE TABLE IF NOT EXISTS lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NULL,
  educator_id uuid NOT NULL,
  title text,
  description text,
  video_url text NULL,
  duration int NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  content_style text[] DEFAULT '{}',
  script_prompt text NULL,
  generated_content jsonb DEFAULT '{}'::jsonb,
  library_personal boolean DEFAULT false,
  library_usc boolean DEFAULT false,
  status text DEFAULT 'draft',
  video_length int NULL,
  script_file_url text NULL,
  selected_course_ids uuid[] DEFAULT '{}'::uuid[],
  script_mode text DEFAULT 'ai',
  script_text text NULL,
  avatar_style text NULL,
  avatar_voice text NULL,
  avatar_character text NULL
);

-- Create lecture_materials table
CREATE TABLE IF NOT EXISTS lecture_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  material_url text NOT NULL,
  material_name text NOT NULL,
  material_type text NOT NULL,
  source_course_id uuid NULL,
  created_at timestamptz DEFAULT now(),
  source_type text NULL,
  file_mime text NULL,
  file_size_bytes bigint NULL,
  storage_path text NULL
);

-- Create lecture_courses table
CREATE TABLE IF NOT EXISTS lecture_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lecture_id, course_id)
);

-- Create lecture_jobs table
CREATE TABLE IF NOT EXISTS lecture_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  job_type text,
  status text DEFAULT 'queued',
  progress int DEFAULT 0,
  result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lecture_artifacts table
CREATE TABLE IF NOT EXISTS lecture_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  artifact_type text,
  artifact_url text,
  created_at timestamptz DEFAULT now()
);

-- Create student_uploads table
CREATE TABLE IF NOT EXISTS student_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  file_url text,
  file_name text,
  file_mime text,
  file_size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

-- Create student_lectures table
CREATE TABLE IF NOT EXISTS student_lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, lecture_id)
);

-- Create student_lecture_views table
CREATE TABLE IF NOT EXISTS student_lecture_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

-- Add indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_courses_educator_id ON courses(educator_id);
CREATE INDEX IF NOT EXISTS idx_course_students_course_id ON course_students(course_id);
CREATE INDEX IF NOT EXISTS idx_course_students_student_id ON course_students(student_id);
CREATE INDEX IF NOT EXISTS idx_course_teaching_assistants_course_id ON course_teaching_assistants(course_id);
CREATE INDEX IF NOT EXISTS idx_course_textbooks_course_id ON course_textbooks(course_id);
CREATE INDEX IF NOT EXISTS idx_lectures_course_id ON lectures(course_id);
CREATE INDEX IF NOT EXISTS idx_lectures_educator_id ON lectures(educator_id);
CREATE INDEX IF NOT EXISTS idx_lecture_materials_lecture_id ON lecture_materials(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_courses_lecture_id ON lecture_courses(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_courses_course_id ON lecture_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_lecture_jobs_lecture_id ON lecture_jobs(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_artifacts_lecture_id ON lecture_artifacts(lecture_id);
CREATE INDEX IF NOT EXISTS idx_student_uploads_student_id ON student_uploads(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lectures_lecture_id ON student_lectures(lecture_id);
CREATE INDEX IF NOT EXISTS idx_student_lectures_student_id ON student_lectures(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lecture_views_lecture_id ON student_lecture_views(lecture_id);
CREATE INDEX IF NOT EXISTS idx_student_lecture_views_student_id ON student_lecture_views(student_id);

-- Create helper function for lecture ownership
CREATE OR REPLACE FUNCTION user_owns_lecture(lecture_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lectures
    WHERE id = lecture_id
    AND educator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on lectures
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;

-- Drop existing lecture policies if they exist
DROP POLICY IF EXISTS "Educators can view own lectures" ON lectures;
DROP POLICY IF EXISTS "Educators can insert own lectures" ON lectures;
DROP POLICY IF EXISTS "Educators can update own lectures" ON lectures;
DROP POLICY IF EXISTS "Educators can delete own lectures" ON lectures;
DROP POLICY IF EXISTS "Students can view lectures from enrolled courses" ON lectures;

-- Create lecture policies for educators
CREATE POLICY "Educators can view own lectures"
  ON lectures
  FOR SELECT
  TO authenticated
  USING (educator_id = auth.uid());

CREATE POLICY "Educators can insert own lectures"
  ON lectures
  FOR INSERT
  TO authenticated
  WITH CHECK (educator_id = auth.uid());

CREATE POLICY "Educators can update own lectures"
  ON lectures
  FOR UPDATE
  TO authenticated
  USING (educator_id = auth.uid())
  WITH CHECK (educator_id = auth.uid());

CREATE POLICY "Educators can delete own lectures"
  ON lectures
  FOR DELETE
  TO authenticated
  USING (educator_id = auth.uid());

-- Create lecture policy for students (read-only access to enrolled courses)
CREATE POLICY "Students can view lectures from enrolled courses"
  ON lectures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_students
      WHERE course_students.student_id = auth.uid()
      AND (
        course_students.course_id = lectures.course_id
        OR course_students.course_id = ANY(lectures.selected_course_ids)
      )
    )
  );

-- Enable RLS on lecture_materials
ALTER TABLE lecture_materials ENABLE ROW LEVEL SECURITY;

-- Drop existing lecture_materials policies if they exist
DROP POLICY IF EXISTS "Educators can view materials for their lectures" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can insert materials for their lectures" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can update materials for their lectures" ON lecture_materials;
DROP POLICY IF EXISTS "Educators can delete materials for their lectures" ON lecture_materials;
DROP POLICY IF EXISTS "Students can view materials from enrolled courses" ON lecture_materials;

-- Create lecture_materials policies for educators
CREATE POLICY "Educators can view materials for their lectures"
  ON lecture_materials
  FOR SELECT
  TO authenticated
  USING (user_owns_lecture(lecture_id));

CREATE POLICY "Educators can insert materials for their lectures"
  ON lecture_materials
  FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_lecture(lecture_id));

CREATE POLICY "Educators can update materials for their lectures"
  ON lecture_materials
  FOR UPDATE
  TO authenticated
  USING (user_owns_lecture(lecture_id))
  WITH CHECK (user_owns_lecture(lecture_id));

CREATE POLICY "Educators can delete materials for their lectures"
  ON lecture_materials
  FOR DELETE
  TO authenticated
  USING (user_owns_lecture(lecture_id));

-- Create lecture_materials policy for students (read-only)
CREATE POLICY "Students can view materials from enrolled courses"
  ON lecture_materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      JOIN course_students ON (
        course_students.course_id = lectures.course_id
        OR course_students.course_id = ANY(lectures.selected_course_ids)
      )
      WHERE lectures.id = lecture_materials.lecture_id
      AND course_students.student_id = auth.uid()
    )
  );

-- Insert seed data (using exact UUIDs provided)
-- 1) Insert educator profile
INSERT INTO profiles (id, email, full_name, role, created_at)
VALUES (
  '4e95be88-f24a-4081-a35a-9afa72b80652',
  'educator@test.com',
  'Test Educator',
  'educator',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 2) Insert test course
INSERT INTO courses (id, educator_id, title, description, created_at)
VALUES (
  '1a88cd98-a7c5-4a9e-be93-225b84fb5c67',
  '4e95be88-f24a-4081-a35a-9afa72b80652',
  'Test Course',
  'A test course for development',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 3) Insert test lecture
INSERT INTO lectures (
  id,
  course_id,
  educator_id,
  title,
  description,
  content_style,
  script_prompt,
  generated_content,
  library_personal,
  library_usc,
  status,
  video_length,
  selected_course_ids,
  script_mode,
  script_text,
  avatar_style,
  avatar_character,
  created_at,
  updated_at
)
VALUES (
  'fab2523e-9b9c-47a8-b581-f7de4c232226',
  NULL,
  '4e95be88-f24a-4081-a35a-9afa72b80652',
  'Untitled Lecture',
  '',
  ARRAY['video', 'audio', 'powerpoint'],
  'sahaj',
  '{}'::jsonb,
  true,
  true,
  'draft',
  5,
  ARRAY['1a88cd98-a7c5-4a9e-be93-225b84fb5c67']::uuid[],
  'ai',
  E'VIDEO SCRIPT:\n\nSlide 1: Introduction to EE105 Homework 1\nHello everyone! Today we''re going to walk through EE105 Homework 1.\n\nSlide 2: Problem Overview\nThis homework focuses on fundamental circuit analysis techniques.\n\nSlide 3: Key Concepts\nWe''ll be applying Kirchhoff''s laws and basic circuit theorems.\n\nAUDIO SCRIPT:\n\nWelcome to this tutorial on EE105 Homework 1. In this session, we''ll break down the key problems and guide you through the solution process. Make sure you have your circuit analysis tools ready!\n\nPPT SCRIPT:\n\nSlide 1:\n- Title: EE105 Homework 1\n- Subtitle: Circuit Analysis Fundamentals\n\nSlide 2:\n- Problem Set Overview\n- Key Topics: KVL, KCL, Thevenin Equivalents\n\nSlide 3:\n- Solution Approach\n- Step-by-step methodology',
  'graceful-sitting',
  'lisa',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 4) Insert test lecture material
INSERT INTO lecture_materials (
  id,
  lecture_id,
  material_url,
  material_name,
  material_type,
  source_type,
  file_mime,
  file_size_bytes,
  storage_path,
  created_at
)
VALUES (
  'fd71c4c7-8ee0-4581-bc31-5bd5218bf189',
  'fab2523e-9b9c-47a8-b581-f7de4c232226',
  'https://yqdsctrexcysyzqoqvaj.supabase.co/storage/v1/object/public/lecture-assets/4e95be88-f24a-4081-a35a-9afa72b80652/fab2523e-9b9c-47a8-b581-f7de4c232226/materials/1767803521486-HW1.pdf',
  'HW1.pdf',
  'main',
  'uploaded',
  'application/pdf',
  630317,
  '4e95be88-f24a-4081-a35a-9afa72b80652/fab2523e-9b9c-47a8-b581-f7de4c232226/materials/1767803521486-HW1.pdf',
  now()
)
ON CONFLICT (id) DO NOTHING;
