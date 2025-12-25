/*
  # Extend Lectures Schema

  1. Changes
    - Add fields to lectures table for content generation workflow
    - Create lecture_courses junction table (many-to-many)
    - Create lecture_materials table to track materials used
    - Add library fields to lectures table

  2. New Tables
    - `lecture_courses`
      - `id` (uuid, primary key)
      - `lecture_id` (uuid, references lectures)
      - `course_id` (uuid, references courses)
      - `created_at` (timestamptz)
    
    - `lecture_materials`
      - `id` (uuid, primary key)
      - `lecture_id` (uuid, references lectures)
      - `material_url` (text) - URL to the material file
      - `material_name` (text) - Name of the material
      - `material_type` (text) - 'main' or 'background'
      - `source_course_id` (uuid, nullable, references courses) - if from course materials
      - `created_at` (timestamptz)

  3. Lecture Table Extensions
    - Add content_style field (text array) - selected content formats
    - Add script_prompt field (text) - user's script or prompt
    - Add generated_content field (jsonb) - AI generated content
    - Add library_personal (boolean) - if added to personal library
    - Add library_usc (boolean) - if added to USC library
    - Add status field (text) - draft, generating, completed

  4. Security
    - Enable RLS on new tables
    - Add policies for educators to manage their lecture associations
*/

-- Add new fields to lectures table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'content_style'
  ) THEN
    ALTER TABLE lectures ADD COLUMN content_style text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'script_prompt'
  ) THEN
    ALTER TABLE lectures ADD COLUMN script_prompt text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'generated_content'
  ) THEN
    ALTER TABLE lectures ADD COLUMN generated_content jsonb DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'library_personal'
  ) THEN
    ALTER TABLE lectures ADD COLUMN library_personal boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'library_usc'
  ) THEN
    ALTER TABLE lectures ADD COLUMN library_usc boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lectures' AND column_name = 'status'
  ) THEN
    ALTER TABLE lectures ADD COLUMN status text DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed'));
  END IF;
END $$;

-- Create lecture_courses junction table
CREATE TABLE IF NOT EXISTS lecture_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lecture_id, course_id)
);

ALTER TABLE lecture_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view own lecture courses"
  ON lecture_courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_courses.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own lecture courses"
  ON lecture_courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_courses.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete own lecture courses"
  ON lecture_courses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_courses.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Create lecture_materials table
CREATE TABLE IF NOT EXISTS lecture_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  material_url text NOT NULL,
  material_name text NOT NULL,
  material_type text NOT NULL CHECK (material_type IN ('main', 'background')),
  source_course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lecture_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Educators can view own lecture materials"
  ON lecture_materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_materials.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can insert own lecture materials"
  ON lecture_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_materials.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can update own lecture materials"
  ON lecture_materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_materials.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_materials.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

CREATE POLICY "Educators can delete own lecture materials"
  ON lecture_materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lectures
      WHERE lectures.id = lecture_materials.lecture_id
      AND lectures.educator_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lecture_courses_lecture_id ON lecture_courses(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_courses_course_id ON lecture_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_lecture_materials_lecture_id ON lecture_materials(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_materials_type ON lecture_materials(material_type);
