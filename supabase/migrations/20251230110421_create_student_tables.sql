/*
  # Create Student-Specific Tables

  1. New Tables
    - `student_lectures`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references profiles.id)
      - `course_id` (uuid, references courses.id)
      - `title` (text)
      - `description` (text)
      - `video_url` (text, nullable)
      - `status` (text: 'generating', 'completed', 'failed')
      - `prompt` (text)
      - `context_sources` (jsonb: selected context for generation)
      - `avatar` (text)
      - `video_length` (integer)
      - `transcript` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `student_uploads`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references profiles.id)
      - `course_id` (uuid, references courses.id)
      - `file_name` (text)
      - `file_url` (text)
      - `file_size` (bigint)
      - `created_at` (timestamptz)
    
    - `student_lecture_views`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references profiles.id)
      - `lecture_id` (uuid, references lectures.id)
      - `student_lecture_id` (uuid, references student_lectures.id, nullable)
      - `duration_watched` (integer, in seconds)
      - `completed` (boolean)
      - `last_viewed_at` (timestamptz)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for students to manage their own data
*/

-- Create student_lectures table
CREATE TABLE IF NOT EXISTS student_lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  video_url text,
  status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  prompt text NOT NULL,
  context_sources jsonb DEFAULT '[]'::jsonb,
  avatar text CHECK (avatar IN ('professional_male', 'professional_female', 'casual_male', 'casual_female')),
  video_length integer DEFAULT 5 CHECK (video_length IN (5, 10, 15, 20, 30, 45, 60)),
  transcript text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE student_lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own lectures"
  ON student_lectures FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create own lectures"
  ON student_lectures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own lectures"
  ON student_lectures FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete own lectures"
  ON student_lectures FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

-- Create student_uploads table
CREATE TABLE IF NOT EXISTS student_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own uploads"
  ON student_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create own uploads"
  ON student_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can delete own uploads"
  ON student_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = student_id);

-- Create student_lecture_views table
CREATE TABLE IF NOT EXISTS student_lecture_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lecture_id uuid REFERENCES lectures(id) ON DELETE CASCADE,
  student_lecture_id uuid REFERENCES student_lectures(id) ON DELETE CASCADE,
  duration_watched integer DEFAULT 0,
  completed boolean DEFAULT false,
  last_viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CHECK (
    (lecture_id IS NOT NULL AND student_lecture_id IS NULL) OR
    (lecture_id IS NULL AND student_lecture_id IS NOT NULL)
  )
);

ALTER TABLE student_lecture_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own lecture views"
  ON student_lecture_views FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create own lecture views"
  ON student_lecture_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own lecture views"
  ON student_lecture_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_lectures_student_id ON student_lectures(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lectures_course_id ON student_lectures(course_id);
CREATE INDEX IF NOT EXISTS idx_student_uploads_student_id ON student_uploads(student_id);
CREATE INDEX IF NOT EXISTS idx_student_uploads_course_id ON student_uploads(course_id);
CREATE INDEX IF NOT EXISTS idx_student_lecture_views_student_id ON student_lecture_views(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lecture_views_lecture_id ON student_lecture_views(lecture_id);
CREATE INDEX IF NOT EXISTS idx_student_lecture_views_student_lecture_id ON student_lecture_views(student_lecture_id);
